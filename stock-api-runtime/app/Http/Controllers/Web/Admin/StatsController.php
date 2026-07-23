<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Models\ReceiptItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        $days = in_array($request->integer('days', 30), [7, 30, 90], true) ? $request->integer('days') : 30;
        $since = now()->subDays($days - 1)->startOfDay();
        $base = Receipt::where('status', Receipt::STATUS_COMPLETED)->where('created_at', '>=', $since);
        $totals = ['revenue' => $base->sum('total'), 'receipts' => $base->count(), 'paid' => $base->sum('amount_paid')];
        $daily = Receipt::where('status', Receipt::STATUS_COMPLETED)->where('created_at', '>=', $since)->selectRaw('DATE(created_at) day, SUM(total) revenue, COUNT(*) receipts')->groupBy('day')->get()->keyBy('day');
        $chart = [];
        for ($i = $days - 1; $i >= 0; $i--) { $day = now()->subDays($i); $row = $daily->get($day->toDateString()); $chart[] = ['label' => $day->format($days > 30 ? 'd/m' : 'd'), 'revenue' => (int) ($row->revenue ?? 0), 'receipts' => (int) ($row->receipts ?? 0)]; }
        $products = ReceiptItem::join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')->where('receipts.status', Receipt::STATUS_COMPLETED)->where('receipts.created_at', '>=', $since)->select('receipt_items.product_name')->selectRaw('SUM(receipt_items.quantity) qty, SUM(receipt_items.subtotal) revenue')->groupBy('receipt_items.product_name')->orderByDesc('revenue')->limit(10)->get();
        return view('admin.stats.index', compact('days', 'totals', 'chart', 'products'));
    }
}
