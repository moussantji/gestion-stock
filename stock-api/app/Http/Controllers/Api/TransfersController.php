<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Support\ShopStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * 🔁🚚 v14 — Transferts de stock avec statut « en transit » + réception à valider.
 *
 * Cycle :
 *  1. POST /transfers            → statut in_transit ; stock RETIRÉ de la source (bucket −, global −)
 *  2. POST /transfers/{id}/receive (destination) → statut received ; stock AJOUTÉ à la destination
 *  3. POST /transfers/{id}/cancel  (source)        → statut cancelled ; stock RENDU à la source
 *
 * Pendant le transit, le stock n'existe à aucun emplacement : il ne peut
 * être vendu ni au siège ni en boutique.
 */
class TransfersController extends Controller
{
    /** GET /api/transfers — paginé (admin/manager), plus récents d'abord */
    public function index()
    {
        $transfers = StockTransfer::with(['user:id,name', 'receiver:id,name'])
            ->withCount('items')
            ->latest()
            ->paginate(50);

        return response()->json($transfers);
    }

    /**
     * POST /api/transfers (admin/manager)
     * { from_shop_id: int|null, to_shop_id: int|null, note?,
     *   items: [{product_id, quantity}] }
     * null = siège. Crée un transfert EN TRANSIT (réception à valider ensuite).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'from_shop_id' => ['nullable', 'integer', 'exists:shops,id'],
            'to_shop_id' => ['nullable', 'integer', 'exists:shops,id'],
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999999'],
        ], [
            'items.required' => 'Ajoute au moins un produit au transfert.',
        ]);

        $from = $data['from_shop_id'] ?? null;
        $to = $data['to_shop_id'] ?? null;

        if ($from === $to) {
            throw ValidationException::withMessages([
                'to_shop_id' => ['La source et la destination doivent être différentes.'],
            ]);
        }

        // Regroupe les doublons produit (une seule ligne par produit)
        $lines = [];
        foreach ($data['items'] as $item) {
            $pid = (int) $item['product_id'];
            $lines[$pid] = ($lines[$pid] ?? 0) + (int) $item['quantity'];
        }

        $fromName = ShopStock::placeName($from);
        $toName = ShopStock::placeName($to);

        $transfer = DB::transaction(function () use ($data, $from, $to, $lines, $toName, $request) {
            $transfer = StockTransfer::create([
                'reference' => StockTransfer::generateReference(),
                'from_shop_id' => $from,
                'to_shop_id' => $to,
                'user_id' => $request->user()->id,
                'note' => $data['note'] ?? null,
                'status' => StockTransfer::STATUS_IN_TRANSIT,
                'sent_at' => now(),
            ]);

            foreach ($lines as $productId => $qty) {
                $product = Product::whereKey($productId)->lockForUpdate()->firstOrFail();

                // Départ : le stock QUITTE la source (et le global — il est sur la route)
                ShopStock::addDelta($product, $from, -$qty);

                $transfer->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $qty,
                ]);

                // Mouvement de départ (l'arrivée sera tracée à la réception)
                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_TRANSFER_OUT,
                    'quantity' => $qty,
                    'reason' => "Transfert vers {$toName}",
                    'reference' => $transfer->reference,
                    'shop_id' => $from,
                ]);
            }

            return $transfer;
        });

        return response()->json([
            'data' => $transfer->load(['items.product:id,name,sku', 'user:id,name']),
            'message' => "🚚 Transfert {$transfer->reference} envoyé : {$fromName} → {$toName}. Réception à valider à l'arrivée.",
        ], 201);
    }

    /**
     * POST /api/transfers/{stockTransfer}/receive — valide la réception (v14).
     * Autorisé : admin, ou manager rattaché à l'EMPLACEMENT DE DESTINATION
     * (manager siège ⇔ destination siège).
     */
    public function receive(Request $request, StockTransfer $stockTransfer)
    {
        if (! $this->canReceive($request->user(), $stockTransfer)) {
            return response()->json([
                'message' => 'Seul·e un·e admin/manager de la destination peut valider la réception.',
            ], 403);
        }
        if (! $stockTransfer->isPending()) {
            return response()->json(['message' => 'Ce transfert a déjà été traité.'], 422);
        }

        $fromName = $stockTransfer->from_name;
        $toName = $stockTransfer->to_name;

        DB::transaction(function () use ($stockTransfer, $request, $fromName) {
            $stockTransfer = StockTransfer::whereKey($stockTransfer->id)->lockForUpdate()->firstOrFail();
            if (! $stockTransfer->isPending()) {
                throw ValidationException::withMessages(['transfer' => ['Déjà traité.']]);
            }

            foreach ($stockTransfer->items()->get() as $line) {
                $product = Product::whereKey($line->product_id)->lockForUpdate()->first();
                if (! $product) {
                    continue; // produit supprimé pendant le transit
                }

                // Arrivée : le stock RENTRE à destination (bucket + et global +)
                ShopStock::addDelta($product, $stockTransfer->to_shop_id, $line->quantity);

                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_TRANSFER_IN,
                    'quantity' => $line->quantity,
                    'reason' => "Transfert depuis {$fromName}",
                    'reference' => $stockTransfer->reference,
                    'shop_id' => $stockTransfer->to_shop_id,
                ]);
            }

            $stockTransfer->update([
                'status' => StockTransfer::STATUS_RECEIVED,
                'received_at' => now(),
                'received_by' => $request->user()->id,
            ]);
        });

        return response()->json([
            'data' => $stockTransfer->fresh(['items.product:id,name,sku', 'user:id,name', 'receiver:id,name']),
            'message' => "✓ Réception {$stockTransfer->reference} validée — {$fromName} → {$toName} : le stock est en rayon.",
        ]);
    }

    /**
     * POST /api/transfers/{stockTransfer}/cancel — annule un transfert EN TRANSIT
     * (stock rendu à la source). Autorisé : admin, ou manager de LA SOURCE.
     */
    public function cancel(Request $request, StockTransfer $stockTransfer)
    {
        if (! $this->canCancel($request->user(), $stockTransfer)) {
            return response()->json([
                'message' => 'Seul·e un·e admin/manager de la source peut annuler ce transfert.',
            ], 403);
        }
        if (! $stockTransfer->isPending()) {
            return response()->json(['message' => 'Seul un transfert en transit peut être annulé.'], 422);
        }

        $fromName = $stockTransfer->from_name;

        DB::transaction(function () use ($stockTransfer, $request, $fromName) {
            $stockTransfer = StockTransfer::whereKey($stockTransfer->id)->lockForUpdate()->firstOrFail();
            if (! $stockTransfer->isPending()) {
                throw ValidationException::withMessages(['transfer' => ['Déjà traité.']]);
            }

            foreach ($stockTransfer->items()->get() as $line) {
                $product = Product::whereKey($line->product_id)->lockForUpdate()->first();
                if (! $product) {
                    continue;
                }

                // Le stock retourne à la source
                ShopStock::addDelta($product, $stockTransfer->from_shop_id, $line->quantity);

                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_TRANSFER_IN,
                    'quantity' => $line->quantity,
                    'reason' => "Annulation du transfert (retour à {$fromName})",
                    'reference' => $stockTransfer->reference,
                    'shop_id' => $stockTransfer->from_shop_id,
                ]);
            }

            $stockTransfer->update(['status' => StockTransfer::STATUS_CANCELLED]);
        });

        return response()->json([
            'data' => $stockTransfer->fresh(['items.product:id,name,sku', 'user:id,name']),
            'message' => "↩️ Transfert {$stockTransfer->reference} annulé — le stock est retourné à {$fromName}.",
        ]);
    }

    /** GET /api/transfers/{stockTransfer} — détail avec lignes */
    public function show(StockTransfer $stockTransfer)
    {
        return response()->json([
            'data' => $stockTransfer->load(['items.product:id,name,sku', 'user:id,name', 'receiver:id,name']),
        ]);
    }

    /** Réception : admin, ou manager dont la boutique EST la destination */
    private function canReceive($user, StockTransfer $transfer): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $user->role === 'manager'
            && $user->shop_id === $transfer->to_shop_id; // null ⇔ siège inclus
    }

    /** Annulation : admin, ou manager dont la boutique EST la source */
    private function canCancel($user, StockTransfer $transfer): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $user->role === 'manager'
            && $user->shop_id === $transfer->from_shop_id;
    }
}
