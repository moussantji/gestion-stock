<?php

namespace App\Services;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * 📦 Génération des bons de commande fournisseurs depuis le stock bas.
 *
 * - Un produit est concerné si quantity <= alert_threshold ET a un fournisseur
 * - Regroupement : UN bon PAR FOURNISSEUR
 * - Anti-doublon : un produit déjà couvert par un bon OUVERT (draft/sent)
 *   n'est pas re-proposé → la génération est rejouable sans risque
 * - Qté suggérée : vise le double du seuil d'alerte
 */
class PurchaseOrderService
{
    /**
     * Génère les bons de commande pour le stock bas.
     *
     * @return Collection|PurchaseOrder[]
     */
    public static function generateFromLowStock(?User $creator = null): array
    {
        $lowProducts = Product::lowStock()
            ->whereNotNull('supplier_id')
            ->get();

        if ($lowProducts->isEmpty()) {
            return [];
        }

        // Produits déjà dans un bon ouvert → ignorés
        $coveredIds = PurchaseOrderItem::query()
            ->whereIn('product_id', $lowProducts->pluck('id'))
            ->whereHas('purchaseOrder', fn ($q) => $q->whereIn('status', PurchaseOrder::OPEN_STATUSES))
            ->pluck('product_id')
            ->all();

        $toOrder = $lowProducts
            ->reject(fn ($p) => in_array($p->id, $coveredIds, true))
            ->groupBy('supplier_id');

        $created = [];

        DB::transaction(function () use ($toOrder, $creator, &$created) {
            foreach ($toOrder as $supplierId => $products) {
                $po = PurchaseOrder::create([
                    'number' => PurchaseOrder::generateNumber(),
                    'supplier_id' => $supplierId,
                    'user_id' => $creator?->id,
                    'status' => PurchaseOrder::STATUS_DRAFT,
                    'notes' => $creator ? null : 'Généré automatiquement (stock bas).',
                ]);

                $total = 0;
                foreach ($products as $product) {
                    $qty = self::suggestedQuantity($product);
                    $unitPrice = (int) round((float) $product->purchase_price);
                    $subtotal = $qty * $unitPrice;
                    $total += $subtotal;

                    $po->items()->create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);
                }

                $po->update(['total_estimated' => $total]);
                $created[] = $po->load('supplier:id,name', 'items');
            }
        });

        return $created;
    }

    /** Quantité suggérée : ramène le stock à ~2× le seuil d'alerte. */
    public static function suggestedQuantity(Product $product): int
    {
        $target = max($product->alert_threshold * 2, $product->alert_threshold + 1);

        return max($target - $product->quantity, 1);
    }
}
