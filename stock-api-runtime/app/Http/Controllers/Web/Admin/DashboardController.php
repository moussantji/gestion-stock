<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Customer;
use App\Models\License;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** GET /admin — Vue d'ensemble */
    public function index()
    {
        $stats = [
            'revenue_total' => Order::where('status', Order::STATUS_PAID)->sum('amount'),
            'revenue_month' => Order::where('status', Order::STATUS_PAID)
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount'),
            'orders_pending' => Order::where('status', Order::STATUS_PENDING)->count(),
            'orders_paid' => Order::where('status', Order::STATUS_PAID)->count(),
            'licenses_active' => License::valid()->count(),
            'licenses_total' => License::count(),
            'plans_count' => Plan::count(),
            'products_count' => Product::count(),
            'low_stock_count' => Product::lowStock()->count(),
            'users_count' => User::count(),
            // 📦 Gestion réelle de l'entreprise
            'stock_value' => Product::sum(DB::raw('quantity * purchase_price')),
            'sales_today' => Receipt::where('status', Receipt::STATUS_COMPLETED)->whereDate('created_at', today())->sum('total'),
            'sales_month' => Receipt::where('status', Receipt::STATUS_COMPLETED)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('total'),
            'receipts_count' => Receipt::where('status', Receipt::STATUS_COMPLETED)->count(),
            'movements_today' => StockMovement::whereDate('created_at', today())->count(),
            'categories_count' => Category::count(),
            'suppliers_count' => Supplier::count(),
            'customers_count' => Customer::count(),
            'out_of_stock_count' => Product::where('quantity', 0)->count(),
        ];

        $recentOrders = Order::with(['plan', 'license'])->latest()->limit(8)->get();
        $recentReceipts = Receipt::with(['user:id,name', 'customer:id,name'])
            ->where('status', Receipt::STATUS_COMPLETED)
            ->latest()->limit(8)->get();
        $lowStockProducts = Product::lowStock()->orderBy('quantity')->limit(8)->get();

        $salesChart = Receipt::where('status', Receipt::STATUS_COMPLETED)
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as day, SUM(total) as revenue, COUNT(*) as receipts')
            ->groupBy('day')->get()->keyBy('day');
        $chart = ['labels' => [], 'revenue' => [], 'receipts' => []];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $row = $salesChart->get($day->toDateString());
            $chart['labels'][] = $day->format('d/m');
            $chart['revenue'][] = (int) ($row->revenue ?? 0);
            $chart['receipts'][] = (int) ($row->receipts ?? 0);
        }

        $expiringSoon = License::valid()->where('expires_at', '<', now()->addDays(7))->orderBy('expires_at')->limit(5)->get();

        return view('admin.dashboard', compact('stats', 'recentOrders', 'recentReceipts', 'lowStockProducts', 'chart', 'expiringSoon'));
    }
}
