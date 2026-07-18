<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Support\ShopScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** GET /api/dashboard */
    public function __invoke(Request $request)
    {
        // --- Statistiques globales ---
        $stats = [
            'products' => Product::count(),
            'categories' => Category::count(),
            'suppliers' => Supplier::count(),
            'stock_value' => (float) Product::sum(DB::raw('quantity * purchase_price')),
            'low_stock' => Product::lowStock()->count(),
            'out_of_stock' => Product::where('quantity', 0)->count(),
            'movements_today' => ShopScope::apply(StockMovement::whereDate('created_at', today()), $request)->count(), // 🏬
        ];

        // --- Mouvements des 7 derniers jours (graphique) ---
        $raw = ShopScope::apply(StockMovement::query(), $request)
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as day, type, SUM(quantity) as total')
            ->groupBy('day', 'type')
            ->get();

        $labels = [];
        $in = [];
        $out = [];

        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $key = $day->toDateString();
            $labels[] = $day->format('d/m');
            $in[] = (int) ($raw->where('day', $key)->where('type', 'in')->first()?->total ?? 0);
            $out[] = (int) ($raw->where('day', $key)->where('type', 'out')->first()?->total ?? 0);
        }

        // --- Alertes & activité ---
        $lowStockProducts = Product::lowStock()
            ->with('category:id,name')
            ->orderBy('quantity')
            ->limit(5)
            ->get();

        $recentMovements = StockMovement::with(['product:id,name,sku', 'user:id,name'])
            ->latest()
            ->limit(5)
            ->get();

        $topProducts = ShopScope::apply(StockMovement::query(), $request) // 🏬
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('product_id, SUM(quantity) as total_moved')
            ->groupBy('product_id')
            ->orderByDesc('total_moved')
            ->limit(5)
            ->with('product:id,name,sku')
            ->get()
            ->filter(fn ($m) => $m->product !== null)
            ->values();

        return response()->json([
            'stats' => $stats,
            'chart' => ['labels' => $labels, 'in' => $in, 'out' => $out],
            'low_stock_products' => $lowStockProducts,
            'recent_movements' => $recentMovements,
            'top_products' => $topProducts,
        ]);
    }
}
