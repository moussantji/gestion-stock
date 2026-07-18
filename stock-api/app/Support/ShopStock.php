<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Shop;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * 🏬📦 v13 — Stock par boutique (buckets) au-dessus du total global.
 *
 * Règles d'or :
 * - `products.quantity` = TOTAL GLOBAL (siège + toutes les boutiques).
 * - Une ligne `product_shop_stocks` = bucket d'une boutique.
 * - Siège (shop_id = null) = products.quantity − SUM(buckets).
 * - Aucun bucket pour un produit ⇒ siège = tout le stock ⇒ comportement v12.
 *
 * ⚠️ `addDelta()/assertAvailable()` supposent que le produit est déjà
 * verrouillé par l'appelant (`Product::...->lockForUpdate()`), DANS une
 * transaction — comme tous les sites de mutation existants le font déjà.
 */
class ShopStock
{
    /**
     * Stock disponible à un emplacement (null = siège).
     */
    public static function level(Product|int $product, ?int $shopId): int
    {
        $p = $product instanceof Product ? $product : Product::findOrFail($product);

        if ($shopId !== null) {
            return (int) (DB::table('product_shop_stocks')
                ->where('product_id', $p->id)
                ->where('shop_id', $shopId)
                ->value('quantity') ?? 0);
        }

        return self::hqLevel($p);
    }

    /** Stock « siège » = global − somme des buckets boutique */
    public static function hqLevel(Product $product): int
    {
        $inShops = (int) DB::table('product_shop_stocks')
            ->where('product_id', $product->id)
            ->sum('quantity');

        return (int) $product->quantity - $inShops;
    }

    /** true si le produit a au moins un bucket boutique (mode multi-stock actif) */
    public static function hasBuckets(Product|int $product): bool
    {
        $id = $product instanceof Product ? $product->id : $product;

        return DB::table('product_shop_stocks')->where('product_id', $id)->exists();
    }

    /**
     * Libellé lisible d'un emplacement (null → « Siège »).
     */
    public static function placeName(?int $shopId): string
    {
        if ($shopId === null) {
            return 'Siège';
        }

        return Shop::whereKey($shopId)->value('name') ?? "Boutique #{$shopId}";
    }

    /**
     * Lève une 422 si le niveau dispo à l'emplacement < $qty.
     * Le message distingue boutique / siège pour guider vers un transfert.
     */
    public static function assertAvailable(Product $product, ?int $shopId, int $qty, string $context = ''): void
    {
        $level = self::level($product, $shopId);

        if ($level < $qty) {
            $suffix = $shopId !== null
                ? ' dans cette boutique — pensez à un transfert'
                : (self::hasBuckets($product) ? ' au siège (le reste est en boutique)' : '');

            throw ValidationException::withMessages([
                'items' => [trim("Stock insuffisant pour « {$product->name} » ({$level} dispo{$suffix}). {$context}")],
            ]);
        }
    }

    /**
     * Applique un delta à l'emplacement ET au total global.
     * $delta < 0 ⇒ vérifie qu'on ne passe pas en négatif à cet emplacement.
     */
    public static function addDelta(Product $product, ?int $shopId, int $delta): void
    {
        if ($delta === 0) {
            return;
        }

        if ($delta < 0) {
            self::assertAvailable($product, $shopId, -$delta);
        }

        // Total global (coiffe tous les emplacements)
        $product->quantity = (int) $product->quantity + $delta;
        $product->save();

        if ($shopId === null) {
            return; // siège : pas de ligne bucket, c'est le reste
        }

        // Bucket boutique : upsert verrouillé
        $row = DB::table('product_shop_stocks')
            ->where('product_id', $product->id)
            ->where('shop_id', $shopId)
            ->lockForUpdate()
            ->first();

        if ($row) {
            $newQty = (int) $row->quantity + $delta;
            DB::table('product_shop_stocks')->where('id', $row->id)
                ->update(['quantity' => $newQty, 'updated_at' => now()]);
        } else {
            DB::table('product_shop_stocks')->insert([
                'product_id' => $product->id,
                'shop_id' => $shopId,
                'quantity' => $delta,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Fixe le niveau d'un emplacement à une valeur absolue (inventaire).
     * Retourne le delta appliqué.
     */
    public static function setLevel(Product $product, ?int $shopId, int $absolute): int
    {
        $level = self::level($product, $shopId);
        $delta = max(0, $absolute) - $level;
        self::addDelta($product, $shopId, $delta);

        return $delta;
    }

    /**
     * Détail du stock par emplacement pour l'API produit :
     * [ {shop_id, name, quantity}, … ] + ligne siège si des buckets existent.
     */
    public static function breakdown(Product $product): array
    {
        if (! self::hasBuckets($product)) {
            return []; // mono-stock : rien d'utile à afficher
        }

        $rows = [[
            'shop_id' => null,
            'name' => 'Siège',
            'quantity' => self::hqLevel($product),
        ]];

        $buckets = DB::table('product_shop_stocks as pss')
            ->join('shops', 'shops.id', '=', 'pss.shop_id')
            ->where('pss.product_id', $product->id)
            ->orderBy('shops.name')
            ->get(['pss.shop_id', 'shops.name', 'pss.quantity']);

        foreach ($buckets as $b) {
            $rows[] = [
                'shop_id' => (int) $b->shop_id,
                'name' => $b->name,
                'quantity' => (int) $b->quantity,
            ];
        }

        return $rows;
    }
}
