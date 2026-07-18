<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;

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
        ];

        $recentOrders = Order::with(['plan', 'license'])->latest()->limit(8)->get();
        $expiringSoon = License::valid()
            ->where('expires_at', '<', now()->addDays(7))
            ->orderBy('expires_at')
            ->limit(5)
            ->get();

        return view('admin.dashboard', compact('stats', 'recentOrders', 'expiringSoon'));
    }
}
