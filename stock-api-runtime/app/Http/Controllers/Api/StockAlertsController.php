<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\ShopStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 📍 v14 — Alertes de stock PAR EMPLACEMENT (boutique ou siège).
 * Le seuil reste celui du produit (`alert_threshold`, global).
 *
 * Règles de résolution de l'emplacement :
 * - `?shop_id=` explicite : admin, ou manager rattaché à cette boutique
 * - sinon : la boutique de l'utilisateur, ou le siège s'il n'en a pas
 */
class StockAlertsController extends Controller
{
    /** GET /api/stock-alerts[?shop_id=] (staff) */
    public function index(Request $request)
    {
        $user = $request->user();
        $shopId = null;

        if ($request->filled('shop_id')) {
            $asked = $request->integer('shop_id');
            if ($user->role === 'admin' || ($user->role === 'manager' && $user->shop_id === $asked)) {
                $shopId = $asked;
            } else {
                return response()->json(['message' => 'Emplacement non autorisé.'], 403);
            }
        } else {
            $shopId = $user->shop_id; // null → siège
        }

        $products = Product::with('category:id,name')
            ->where('alert_threshold', '>', 0)
            ->get(['id', 'name', 'sku', 'category_id', 'quantity', 'alert_threshold']);

        // Buckets groupés en 1 requête (pas de N+1)
        $buckets = DB::table('product_shop_stocks')
            ->whereIn('product_id', $products->pluck('id'))
            ->get(['product_id', 'shop_id', 'quantity'])
            ->groupBy('product_id');

        $rows = [];
        foreach ($products as $p) {
            $mine = $buckets->get($p->id, collect());
            $level = $shopId === null
                ? (int) $p->quantity - (int) $mine->sum('quantity')      // siège = global − boutiques
                : (int) (optional($mine->firstWhere('shop_id', $shopId))->quantity ?? 0);

            if ($level < (int) $p->alert_threshold) {
                $rows[] = [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'category' => $p->category,
                    'quantity' => $level,                    // niveau À CET emplacement
                    'global_quantity' => (int) $p->quantity, // pour info
                    'alert_threshold' => (int) $p->alert_threshold,
                    'is_low_stock' => $level > 0,
                ];
            }
        }

        // Tri : ruptures d'abord, puis ratio niveau/seuil croissant
        usort($rows, function ($a, $b) {
            if (($a['quantity'] === 0) !== ($b['quantity'] === 0)) {
                return $a['quantity'] === 0 ? -1 : 1;
            }
            $ra = $a['quantity'] / max(1, $a['alert_threshold']);
            $rb = $b['quantity'] / max(1, $b['alert_threshold']);

            return $ra <=> $rb;
        });

        return response()->json([
            'location' => ['shop_id' => $shopId, 'name' => ShopStock::placeName($shopId)],
            'data' => $rows,
            'count' => count($rows),
        ]);
    }
}
