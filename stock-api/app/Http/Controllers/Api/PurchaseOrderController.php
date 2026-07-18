<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Services\PurchaseOrderService;
use App\Support\ShopScope;
use App\Support\ShopStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * 📦 Bons de commande fournisseurs (admin/manager).
 * Cycle de vie : draft → sent → received
 * La réception crée automatiquement les entrées de stock (transaction).
 */
class PurchaseOrderController extends Controller
{
    /** GET /api/purchase-orders?status= */
    public function index(Request $request)
    {
        $orders = PurchaseOrder::with(['supplier:id,name,phone', 'user:id,name'])
            ->withCount('items');
        ShopScope::apply($orders, $request); // 🏬 multi-boutiques
        $orders = $orders
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($orders);
    }

    /** POST /api/purchase-orders/generate — génère depuis le stock bas (anti-doublon) */
    public function generate(Request $request)
    {
        $created = PurchaseOrderService::generateFromLowStock($request->user());

        // 🏬 Bons générés → rattachés à la boutique de l'utilisateur (null = global)
        $shopId = \App\Support\ShopScope::currentShopId($request);
        if ($shopId && count($created)) {
            PurchaseOrder::whereIn('id', collect($created)->pluck('id'))->update(['shop_id' => $shopId]);
        }

        return response()->json([
            'message' => count($created)
                ? count($created) . ' bon(s) de commande créé(s) — vérifie et envoie-les au fournisseur.'
                : 'Aucun nouveau bon à générer (stock OK ou déjà couvert par un bon ouvert).',
            'created' => count($created),
            'data' => $created,
        ], count($created) ? 201 : 200);
    }

    /** GET /api/purchase-orders/{purchaseOrder} */
    public function show(PurchaseOrder $purchaseOrder)
    {
        return response()->json([
            'data' => $purchaseOrder->load(['items', 'supplier', 'user:id,name']),
        ]);
    }

    /**
     * PUT /api/purchase-orders/{purchaseOrder}/items/{item}
     * ✏️ Modifie la quantité d'une ligne TANT QUE le bon est brouillon.
     * Sous-total + total estimé recalculés côté serveur (source de vérité).
     */
    public function updateItem(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderItem $item)
    {
        if ($purchaseOrder->status !== PurchaseOrder::STATUS_DRAFT) {
            return response()->json(['message' => 'Seul un brouillon peut être modifié.'], 422);
        }
        abort_unless($item->purchase_order_id === $purchaseOrder->id, 404);

        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99999'],
        ]);

        DB::transaction(function () use ($purchaseOrder, $item, $data) {
            $item->update([
                'quantity' => (int) $data['quantity'],
                'subtotal' => (int) $data['quantity'] * $item->unit_price,
            ]);
            $purchaseOrder->update([
                'total_estimated' => $purchaseOrder->items()->sum('subtotal'),
            ]);
        });

        return response()->json([
            'message' => 'Quantité mise à jour.',
            'data' => $purchaseOrder->fresh(['items', 'supplier', 'user:id,name']),
        ]);
    }

    /** POST /api/purchase-orders/{purchaseOrder}/send — marque « envoyé au fournisseur » */
    public function send(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== PurchaseOrder::STATUS_DRAFT) {
            return response()->json(['message' => 'Seul un brouillon peut être marqué envoyé.'], 422);
        }

        $purchaseOrder->update([
            'status' => PurchaseOrder::STATUS_SENT,
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => "Bon {$purchaseOrder->number} marqué comme envoyé.",
            'data' => $purchaseOrder->fresh(['items', 'supplier']),
        ]);
    }

    /**
     * POST /api/purchase-orders/{purchaseOrder}/receive
     * ✅ Réception marchandise : crée une entrée de stock par article
     * (même logique transactionnelle que StockMovementController).
     */
    /**
     * POST /api/purchase-orders/{po}/receive — 🧾 réception (totale ou PARTIELLE).
     * Corps optionnel : items: [{item_id, received_qty}] — sans corps = tout le restant
     * (rétro-compatible avec l'app v11). Réceptionnable en plusieurs fois tant que le bon
     * est ouvert (draft | sent | partial).
     */
    public function receive(PurchaseOrder $purchaseOrder, Request $request)
    {
        if (! $purchaseOrder->isOpen()) {
            return response()->json(['message' => 'Ce bon ne peut plus être réceptionné.'], 422);
        }

        $data = $request->validate([
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.received_qty' => ['required', 'integer', 'min:1', 'max:999999'],
        ]);

        $summary = DB::transaction(function () use ($purchaseOrder, $data, $request) {
            $purchaseOrder = PurchaseOrder::whereKey($purchaseOrder->id)->lockForUpdate()->firstOrFail();
            $items = $purchaseOrder->items()->get()->keyBy('id');

            // Lignes ciblées : partiel (validé) ou tout le restant
            $targets = [];
            if (! empty($data['items'])) {
                foreach ($data['items'] as $line) {
                    $item = $items->get($line['item_id']);
                    if (! $item) {
                        throw ValidationException::withMessages([
                            'items' => ['Ligne introuvable sur ce bon.'],
                        ]);
                    }
                    $remaining = $item->quantity - $item->received_qty;
                    if ($line['received_qty'] > $remaining) {
                        throw ValidationException::withMessages([
                            'items' => ["Max {$remaining} réceptionnable(s) pour « {$item->product_name} »."],
                        ]);
                    }
                    if ($item->product_id && $remaining > 0) {
                        $targets[] = ['item' => $item, 'qty' => (int) $line['received_qty']];
                    }
                }
            } else {
                foreach ($items as $item) {
                    $remaining = $item->quantity - $item->received_qty;
                    if ($item->product_id && $remaining > 0) {
                        $targets[] = ['item' => $item, 'qty' => $remaining];
                    }
                }
            }

            if (empty($targets)) {
                throw ValidationException::withMessages([
                    'items' => ['Rien à réceptionner (tout est déjà rentré).'],
                ]);
            }

            $receivedUnits = 0;
            foreach ($targets as $target) {
                $item = $target['item'];
                $qty = $target['qty'];

                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                if (! $product) {
                    continue; // produit supprimé entre-temps
                }

                // 🏬📦 v13 : la marchandise rentre dans la boutique du bon (ou le siège)
                ShopStock::addDelta($product, $purchaseOrder->shop_id, $qty);

                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_IN,
                    'quantity' => $qty,
                    'unit_price' => $item->unit_price,
                    'reason' => 'Achat fournisseur',
                    'reference' => $purchaseOrder->number,
                    'shop_id' => $purchaseOrder->shop_id, // 🏬
                ]);

                $item->increment('received_qty', $qty);
                $receivedUnits += $qty;
            }

            // Statut : received seulement quand TOUTES les lignes sont rentrées
            $allReceived = $purchaseOrder->items()->get()
                ->every(fn ($i) => $i->received_qty >= $i->quantity);

            $purchaseOrder->update([
                'status' => $allReceived ? PurchaseOrder::STATUS_RECEIVED : PurchaseOrder::STATUS_PARTIAL,
                'received_at' => $allReceived ? now() : $purchaseOrder->received_at,
            ]);

            return ['received' => $receivedUnits, 'fully_received' => $allReceived];
        });

        return response()->json([
            'message' => "✅ {$summary['received']} unité(s) réceptionnée(s) depuis {$purchaseOrder->number}.",
            'data' => $purchaseOrder->fresh(['items', 'supplier']),
            'summary' => $summary,
        ]);
    }

    /** DELETE /api/purchase-orders/{purchaseOrder} — annule un bon ouvert */
    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if (! $purchaseOrder->isOpen()) {
            return response()->json(['message' => 'Un bon réceptionné ne peut pas être annulé.'], 422);
        }

        $purchaseOrder->update(['status' => PurchaseOrder::STATUS_CANCELLED]);

        return response()->json(['message' => "Bon {$purchaseOrder->number} annulé."]);
    }

    /** GET /api/purchase-orders/{purchaseOrder}/pdf — PDF du bon de commande */
    public function pdf(PurchaseOrder $purchaseOrder)
    {
        abort_unless(class_exists(\Barryvdh\DomPDF\Facade\Pdf::class), 503, 'Package barryvdh/laravel-dompdf manquant.');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.purchase-order', [
            'order' => $purchaseOrder->load(['items', 'supplier', 'user:id,name']),
            'shop' => config('shop'),
        ])->setPaper('a4');

        return $pdf->stream("bon-{$purchaseOrder->number}.pdf");
    }
}
