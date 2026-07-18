<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * 🏬 Périmètre boutique (multi-boutiques v12).
 *
 * Règle de visibilité :
 * - un utilisateur rattaché à une boutique voit SES lignes + les lignes
 *   legacy sans boutique (null) — la migration de données reste douce ;
 * - l'admin (sans boutique) voit tout, et peut filtrer via ?shop_id= ;
 * - 🖥 v1.3 : un admin/manager sur un POSTE PC rattaché à une boutique
 *   (header X-Shop-Id) est traité comme s'il était rattaché à celle-ci.
 */
class ShopScope
{
    /** Filtre un query builder Eloquent selon la boutique de l'utilisateur. */
    public static function apply($query, Request $request)
    {
        $shopId = self::visibleShopId($request);

        if (! $shopId) {
            return $query; // admin sans filtre → tout voir
        }

        return $query->where(
            fn ($w) => $w->where('shop_id', $shopId)->orWhereNull('shop_id')
        );
    }

    /** Boutique à appliquer : celle de l'utilisateur, sinon poste PC (X-Shop-Id) ou filtre admin ?shop_id=. */
    public static function visibleShopId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->shop_id) {
            return (int) $user->shop_id;
        }

        if (in_array($user->role, ['admin', 'manager'], true)) {
            // 🖥 v1.3 : poste de caisse PC rattaché à une boutique (header X-Shop-Id)
            if ($request->header('X-Shop-Id') !== null && $request->header('X-Shop-Id') !== '') {
                return max(0, (int) $request->header('X-Shop-Id')) ?: null;
            }

            if ($user->role === 'admin' && $request->filled('shop_id')) {
                return (int) $request->query('shop_id');
            }
        }

        return null;
    }

    /** Boutique de création : celle de l'utilisateur, sinon le poste PC choisi (X-Shop-Id). */
    public static function currentShopId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->shop_id) {
            return (int) $user->shop_id;
        }

        // 🖥 v1.3 : admin/manager derrière un poste PC rattaché à une boutique
        if (in_array($user->role, ['admin', 'manager'], true)
            && (int) $request->header('X-Shop-Id') > 0) {
            return (int) $request->header('X-Shop-Id');
        }

        return null;
    }
}
