<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashOperation;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StockMovement;
use App\Support\Promo;
use App\Support\Setting;
use App\Support\ShopScope;
use App\Support\ShopStock;
use App\Support\Tva;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reçus de vente : vente multi-produits avec décrément du stock + PDF.
 * 💳 Paiement partiel / crédit client : versements multiples suivis.
 */
class ReceiptController extends Controller
{
    /** GET /api/receipts */
    public function index(Request $request)
    {
        $query = Receipt::withCount('items')->with(['user:id,name', 'shop:id,name', 'customer:id,name'])->latest(); // 📤 v2.0 : customer eager-loadé (CSV du pack jour)

        ShopScope::apply($query, $request); // 🏬 multi-boutiques

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    /**
     * GET /api/receipts/credits — 💳 reçus non soldés (crédit client),
     * les plus anciens d'abord + encours total.
     * ⚠️ Déclarée AVANT /receipts/{receipt} dans routes/api.php.
     */
    public function credits(Request $request)
    {
        $credits = ShopScope::apply(
            Receipt::withCount('items')->with(['user:id,name', 'customer:id,name'])
                ->where('status', Receipt::STATUS_COMPLETED), // ↩️ avoirs exclus
            $request
        )
            ->whereColumn('amount_paid', '<', 'total')
            ->oldest()
            ->limit(100)
            ->get();

        $outstanding = (int) ShopScope::apply(
            Receipt::where('status', Receipt::STATUS_COMPLETED),
            $request
        )
            ->whereColumn('amount_paid', '<', 'total')
            ->selectRaw('COALESCE(SUM(total - points_discount - amount_paid), 0) as due') // 🎁 net de remise
            ->value('due');

        return response()->json([
            'data' => $credits,
            'outstanding_total' => $outstanding,
        ]);
    }

    /**
     * POST /api/receipts
     * { client_name?, client_phone?, client_uuid?, amount_paid?,
     *   items: [{product_id, quantity, unit_price?}] }
     * → crée les sorties de stock + le reçu (+ un versement initial) en une transaction.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:30'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'], // 👥 fiche CRM
            'client_uuid' => ['nullable', 'string', 'max:64'],
            'amount_paid' => ['nullable', 'integer', 'min:0', 'max:999999999'],
            'points_redeem' => ['nullable', 'integer', 'min:0', 'max:1000000'], // 🎁 points à convertir en remise
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
        ], [
            'items.required' => 'Le panier est vide.',
            'items.*.product_id.distinct' => 'Un même produit apparaît deux fois dans le panier.',
        ]);

        // Idempotence : double envoi → renvoie le reçu existant
        if (! empty($data['client_uuid'])) {
            $existing = Receipt::where('client_uuid', $data['client_uuid'])
                ->with(['items', 'user:id,name'])
                ->first();
            if ($existing) {
                return response()->json(['data' => $existing, 'duplicate' => true]);
            }
        }

        $receipt = DB::transaction(function () use ($data, $request) {
            // 👥 Fiche client liée → nom/téléphone snapshotés depuis la fiche si absents
            $customer = ! empty($data['customer_id'])
                ? Customer::whereKey($data['customer_id'])->lockForUpdate()->first()
                : null;

            $receipt = Receipt::create([
                'number' => Receipt::generateNumber(),
                'client_uuid' => $data['client_uuid'] ?? null,
                'user_id' => $request->user()->id,
                'customer_id' => $customer?->id,
                'client_name' => $data['client_name'] ?? $customer?->name,
                'client_phone' => $data['client_phone'] ?? $customer?->phone,
                'total' => 0,
                'amount_paid' => 0,
                'shop_id' => ShopScope::currentShopId($request), // 🏬 boutique de la vente
            ]);

            $total = 0;

            foreach ($data['items'] as $item) {
                $product = Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail();

                // 🏬📦 v13 : vérifie le stock DE L'EMPLACEMENT (boutique de la vente / siège)
                ShopStock::assertAvailable($product, $receipt->shop_id, $item['quantity']);

                // 👥 Prix de gros automatique pour les clients « gros »
                // 🏷️ v2.11 : sinon prix promo ACTIF (détail uniquement, jamais le gros) — '' config = prix normal
                $defaultPrice = $customer && $customer->price_tier === Customer::TIER_WHOLESALE
                    && $product->wholesale_price !== null
                    ? (int) $product->wholesale_price
                    : (int) (Promo::priceFor($product) ?? $product->sale_price);
                $unitPrice = isset($item['unit_price']) ? (int) $item['unit_price'] : $defaultPrice;
                $subtotal = $unitPrice * $item['quantity'];

                // Sortie de stock traçable
                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_OUT,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'reason' => 'Vente',
                    'reference' => $receipt->number,
                    'shop_id' => $receipt->shop_id, // 🏬
                ]);
                // 🏬📦 décrémente le bucket boutique (ou le siège) + le total global
                ShopStock::addDelta($product, $receipt->shop_id, -$item['quantity']);

                $receipt->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;
            }

            // 🎁 Fidélité : conversion de points en remise (plafonnée au total et au solde)
            $discount = 0;
            $redeemed = 0;
            if ($customer && ! empty($data['points_redeem'])) {
                $pointValue = max(1, (int) Setting::get('loyalty_point_value', 10));
                $redeemed = min((int) $customer->loyalty_points, (int) $data['points_redeem']);
                $redeemed = min($redeemed, intdiv($total, $pointValue)); // remise ≤ total
                $discount = $redeemed * $pointValue;
            }

            // 💳 Versement initial éventuel (plafonné au total NET de remise — jamais de trop-perçu)
            $due = max(0, $total - $discount);
            $paid = min($due, max(0, (int) ($data['amount_paid'] ?? $due)));

            $receipt->update([
                'total' => $total,
                'amount_paid' => $paid,
                'points_discount' => $discount,
                'points_redeemed' => $redeemed,
            ]);

            if ($redeemed > 0) {
                $customer->decrement('loyalty_points', $redeemed);
                $receipt->loyaltyTransactions()->create([
                    'customer_id' => $customer->id,
                    'user_id' => $request->user()->id,
                    'points' => -$redeemed,
                    'type' => LoyaltyTransaction::TYPE_REDEEM,
                    'note' => "Remise fidélité (−{$discount} FCFA)",
                ]);
            }

            if ($paid > 0) {
                $receipt->payments()->create([
                    'user_id' => $request->user()->id,
                    'amount' => $paid,
                    'note' => $paid >= $due ? 'Payé comptant' : 'Acompte à la vente',
                ]);
            }

            // 🎁 Points gagnés sur le montant réellement encaissé
            $earned = $this->earnPoints($receipt, $customer, $paid, $request->user()->id);

            return [$receipt->load(['items', 'user:id,name']), $earned];
        });

        Promo::flagReceiptItems($receipt); // 🏷️ v2.11 : mentions PROMO (additives)

        return response()->json(['data' => $receipt, 'points_earned' => $earned], 201);
    }

    /** 🎁 Crédite les points de fidélité sur le montant encaissé (1 pt / N FCFA — réglage boutique). */
    private function earnPoints(Receipt $receipt, ?Customer $customer, int $amount, int $userId): int
    {
        if (! $customer || $amount <= 0) {
            return 0;
        }

        $earnPer = (int) Setting::get('loyalty_earn_per', 1000);
        if ($earnPer <= 0) {
            return 0;
        }

        $points = intdiv($amount, $earnPer);
        if ($points <= 0) {
            return 0;
        }

        Customer::whereKey($customer->id)->increment('loyalty_points', $points);
        $receipt->loyaltyTransactions()->create([
            'customer_id' => $customer->id,
            'user_id' => $userId,
            'points' => $points,
            'type' => LoyaltyTransaction::TYPE_EARN,
            'note' => 'Gain — '.number_format($amount, 0, ',', ' ').' FCFA encaissés',
        ]);

        return $points;
    }

    /**
     * POST /api/receipts/{receipt}/payments — 💳 versement sur un crédit.
     * { amount, note? } → plafonné au reste à payer.
     */
    public function addPayment(Request $request, Receipt $receipt)
    {
        return $this->applyPayment($request, $receipt);
    }

    /**
     * 🔁 v2.1 — POST /api/receipts/by-uuid/{uuid}/payments
     * Versement pour la file hors ligne du PC : le reçu est retrouvé par son
     * client_uuid (vente créée hors ligne, synchronisée depuis un autre poste).
     */
    public function addPaymentByUuid(Request $request, string $uuid)
    {
        $receipt = ShopScope::apply(Receipt::where('client_uuid', $uuid), $request)->firstOrFail();

        return $this->applyPayment($request, $receipt);
    }

    /** Logique commune du versement (point d'entrée id + client_uuid). */
    private function applyPayment(Request $request, Receipt $receipt)
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:120'],
        ]);

        $remaining = $receipt->remaining;
        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Ce reçu est déjà soldé.'],
            ]);
        }

        $applied = min((int) $data['amount'], $remaining);

        // 🔁 v2.1 : anti-double envoi (file hors ligne at-least-once) — même
        // montant, même caissier, < 2 min → considéré comme doublon réseau.
        $dupe = $receipt->payments()
            ->where('user_id', $request->user()->id)
            ->where('amount', $applied)
            ->where('created_at', '>=', now()->subSeconds(120))
            ->exists();
        if ($dupe) {
            return response()->json([
                'data' => $receipt->fresh()->load(['items', 'user:id,name', 'payments.user:id,name']),
                'applied' => 0,
                'duplicate' => true,
            ]);
        }

        DB::transaction(function () use ($receipt, $data, $applied, $request) {
            $receipt->payments()->create([
                'user_id' => $request->user()->id,
                'amount' => $applied,
                'note' => $data['note'] ?? null,
            ]);
            $receipt->increment('amount_paid', $applied);

            // 🎁 Points gagnés aussi sur les versements d'un crédit
            $this->earnPoints($receipt, $receipt->customer, $applied, $request->user()->id);
        });

        return response()->json([
            'data' => $receipt->fresh()->load(['items', 'user:id,name', 'payments.user:id,name']),
            'applied' => $applied,
        ], 201);
    }

    /**
     * POST /api/receipts/{receipt}/refund — ↩️ avoir COMPLET ou PARTIEL par ligne.
     * Sans body `items` → toutes les lignes sont retournées (reste non encore retourné).
     * Avec `items: [{receipt_item_id, quantity}]` → avoir partiel, cumulable.
     * Restock automatique à chaque retour. Statut refunded quand TOUT est retourné.
     * Réservé admin/manager (route).
     */
    public function refund(Request $request, Receipt $receipt)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
            'refund_cash' => ['nullable', 'boolean'], // ↩️💵 sortie de caisse auto liée
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.receipt_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99999'],
        ]);

        if ($receipt->isRefunded()) {
            throw ValidationException::withMessages([
                'receipt' => ['Ce reçu est déjà totalement annulé.'],
            ]);
        }

        $partial = ! empty($data['items']);

        $result = DB::transaction(function () use ($receipt, $data, $partial, $request) {
            $receipt = Receipt::whereKey($receipt->id)->lockForUpdate()->firstOrFail();
            $items = $receipt->items()->get()->keyBy('id');

            // Lignes à retourner : partiel (validé) ou tout ce qui reste
            $targets = [];
            if ($partial) {
                foreach ($data['items'] as $line) {
                    $item = $items->get($line['receipt_item_id']);
                    if (! $item) {
                        throw ValidationException::withMessages([
                            'items' => ['Article introuvable sur ce reçu.'],
                        ]);
                    }
                    $refundable = $item->quantity - $item->refunded_qty;
                    if ($line['quantity'] > $refundable) {
                        throw ValidationException::withMessages([
                            'items' => ["Max {$refundable} retournable(s) pour « {$item->product_name} »."],
                        ]);
                    }
                    $targets[] = ['item' => $item, 'qty' => (int) $line['quantity']];
                }
            } else {
                foreach ($items as $item) {
                    $remaining = $item->quantity - $item->refunded_qty;
                    if ($item->product_id && $remaining > 0) {
                        $targets[] = ['item' => $item, 'qty' => $remaining];
                    }
                }
            }

            $restocked = 0;
            $refundAmount = 0; // 💵 montant retourné (pour remboursement espèces)
            foreach ($targets as $target) {
                $item = $target['item'];
                $qty = $target['qty'];

                if ($item->product_id) {
                    $product = Product::withTrashed()->whereKey($item->product_id)->lockForUpdate()->first();
                    if ($product) {
                        $product->movements()->create([
                            'user_id' => $request->user()->id,
                            'type' => StockMovement::TYPE_IN,
                            'quantity' => $qty,
                            'reason' => $partial ? 'Avoir partiel' : 'Avoir vente',
                            'reference' => $receipt->number,
                            'shop_id' => $receipt->shop_id, // 🏬
                        ]);
                        // 🏬📦 le retour rentre dans la boutique d'origine (ou le siège)
                        ShopStock::addDelta($product, $receipt->shop_id, $qty);
                    }
                }

                $item->increment('refunded_qty', $qty);
                $restocked += $qty;
                $refundAmount += $qty * (int) $item->unit_price;
            }

            // Statut : refunded seulement quand TOUTES les lignes sont totalement retournées
            $allRefunded = $receipt->items()->get()
                ->every(fn ($i) => $i->refunded_qty >= $i->quantity);

            $receipt->update([
                'status' => $allRefunded ? Receipt::STATUS_REFUNDED : Receipt::STATUS_COMPLETED,
                'refunded_at' => now(),
                'refund_reason' => $data['reason'] ?? $receipt->refund_reason,
                'refunded_by' => $request->user()->id,
            ]);

            // ↩️💵 Remboursement d'argent tracé : sortie de caisse liée à l'avoir
            $cashOut = false;
            if (! empty($data['refund_cash']) && $refundAmount > 0) {
                CashOperation::create([
                    'type' => CashOperation::TYPE_OUT,
                    'category' => 'refund',
                    'amount' => $refundAmount,
                    'reason' => 'Remboursement vente '.$receipt->number.($partial ? ' (partiel)' : ''),
                    'receipt_id' => $receipt->id,
                    'user_id' => $request->user()->id,
                ]);
                $cashOut = true;
            }

            return [
                'restocked' => $restocked,
                'fully_refunded' => $allRefunded,
                'refunded_amount' => $refundAmount,
                'cash_out' => $cashOut,
            ];
        });

        return response()->json([
            'data' => $receipt->fresh()->load(['items', 'user:id,name', 'refundedBy:id,name']),
            'summary' => $result,
        ]);
    }

    /** GET /api/receipts/{receipt} */
    public function show(Receipt $receipt)
    {
        $receipt->load(['items.product:id,category_id', 'user:id,name', 'payments.user:id,name', 'refundedBy:id,name']);
        Promo::flagReceiptItems($receipt); // 🏷️ v2.11 : drapeaux de présentation (additifs)

        return response()->json([
            'data' => $receipt,
            // 🧮 v2.9 : ventilation TVA de présentation (additive — absente/absente=false si désactivée)
            'tva' => Tva::breakdown($receipt->items),
        ]);
    }

    /** GET /api/receipts/{receipt}/pdf — reçu PDF de la vente (A5) */
    public function pdf(Receipt $receipt)
    {
        abort_unless(class_exists(Pdf::class), 503, 'Package barryvdh/laravel-dompdf manquant.');

        $receipt->load(['items.product:id,category_id', 'user:id,name']);
        Promo::flagReceiptItems($receipt); // 🏷️ v2.11 : badges PROMO du moment (additifs)

        $pdf = Pdf::loadView('pdf.sale-receipt', [
            'receipt' => $receipt,
            'shop' => config('shop'),
            'tva' => Tva::breakdown($receipt->items), // 🧮 v2.9 : lignes « dont TVA » (vide = désactivée)
        ])->setPaper('a5', 'portrait');

        return $pdf->stream("recu-{$receipt->number}.pdf");
    }

    /** GET /api/receipts/{receipt}/ticket — 🖨 version ticket 80mm (imprimante thermique) */
    public function ticket(Receipt $receipt)
    {
        abort_unless(class_exists(Pdf::class), 503, 'Package barryvdh/laravel-dompdf manquant.');

        // Papier personnalisé : 80 mm × 297 mm (226.77 × 841.89 pt) — découpe après impression
        $receipt->load(['items.product:id,category_id', 'user:id,name']);
        Promo::flagReceiptItems($receipt); // 🏷️ v2.11

        $pdf = Pdf::loadView('pdf.sale-ticket', [
            'receipt' => $receipt,
            'shop' => config('shop'),
            'tva' => Tva::breakdown($receipt->items), // 🧮 v2.9
        ])->setPaper([0, 0, 226.77, 841.89], 'portrait');

        return $pdf->stream("ticket-{$receipt->number}.pdf");
    }
}
