<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashClosing;
use App\Models\CashOperation;
use App\Models\Receipt;
use App\Models\Shop;
use App\Models\User;
use App\Support\ShopInfo;
use App\Support\ShopScope;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * 💵 Caisse : dépenses / sorties / apports manuels + solde.
 * Réservé admin/manager (montants sensibles).
 */
class CashOperationController extends Controller
{
    /** GET /api/cash-ops?days=30 — opérations récentes (max 100) */
    public function index(Request $request)
    {
        $days = min(365, max(1, $request->integer('days', 30)));

        $ops = ShopScope::apply(CashOperation::with('user:id,name'), $request) // 🏬
            ->where('created_at', '>=', now()->subDays($days)->startOfDay())
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->query('category')))
            ->latest()
            ->limit(100)
            ->get();

        return response()->json(['data' => $ops]);
    }

    /** GET /api/cash-ops/summary — solde global + chiffres du jour (périmètre boutique) */
    public function summary(Request $request)
    {
        $in = (int) ShopScope::apply(CashOperation::in(), $request)->sum('amount');
        $out = (int) ShopScope::apply(CashOperation::out(), $request)->sum('amount');

        $today = now()->startOfDay();
        $todayIn = (int) ShopScope::apply(CashOperation::in(), $request)->where('created_at', '>=', $today)->sum('amount');
        $todayOut = (int) ShopScope::apply(CashOperation::out(), $request)->where('created_at', '>=', $today)->sum('amount');

        // Encaissé aujourd'hui via les ventes (hors avoirs) — indicatif
        $salesBase = ShopScope::apply(
            Receipt::where('status', Receipt::STATUS_COMPLETED),
            $request
        )->where('created_at', '>=', $today);
        $salesToday = (int) (clone $salesBase)->sum('amount_paid');
        $salesCountToday = (int) (clone $salesBase)->count(); // 🧾 v1.8 : nb de reçus du jour

        // 📊 v2.0 : encaissé d'hier (même périmètre) → comparatif « vs hier » du badge live
        $yesterday = now()->subDay()->startOfDay();
        $salesYesterday = (int) ShopScope::apply(
            Receipt::where('status', Receipt::STATUS_COMPLETED),
            $request
        )->where('created_at', '>=', $yesterday)->where('created_at', '<', $today)->sum('amount_paid');

        // 👥 v1.9 : totaux du jour par vendeur (badge live du PC + pack jour, top 5)
        $byUser = (clone $salesBase)
            ->selectRaw('user_id, COUNT(*) as receipts_count, COALESCE(SUM(amount_paid), 0) as collected')
            ->groupBy('user_id')
            ->orderByDesc('collected')
            ->limit(5)
            ->get();
        $userNames = User::whereIn('id', $byUser->pluck('user_id')->filter()->all())->pluck('name', 'id');

        // 🏬📊 v2.2 : ventes du jour par boutique (comparatif multi-boutiques du pack jour)
        $byShop = (clone $salesBase)
            ->selectRaw('shop_id, COUNT(*) as receipts_count, COALESCE(SUM(amount_paid), 0) as collected')
            ->groupBy('shop_id')
            ->orderByDesc('collected')
            ->limit(10)
            ->get();
        $shopNames = Shop::whereIn('id', $byShop->pluck('shop_id')->filter()->all())->pluck('name', 'id');

        return response()->json([
            'balance' => $in - $out,
            'total_in' => $in,
            'total_out' => $out,
            'today_in' => $todayIn,
            'today_out' => $todayOut,
            'sales_collected_today' => $salesToday,
            'sales_count_today' => $salesCountToday,
            'sales_yesterday' => $salesYesterday,
            'sales_by_user_today' => $byUser->map(fn ($r) => [
                'name' => $userNames[$r->user_id] ?? '—',
                'count' => (int) $r->receipts_count,
                'total' => (int) $r->collected,
            ])->values(),
            'sales_by_shop_today' => $byShop->map(fn ($r) => [ // 🏬📊 v2.2
                'name' => $r->shop_id
                    ? ($shopNames[$r->shop_id] ?? '—')
                    : ($request->user()?->shop?->name ?? 'Siège'),
                'count' => (int) $r->receipts_count,
                'total' => (int) $r->collected,
            ])->values(),
        ]);
    }

    /** POST /api/cash-ops {type: in|out, amount, reason} */
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'in:in,out'],
            'category' => ['nullable', 'string', 'max:40'], // 💵 catégorie de dépense
            'amount' => ['required', 'integer', 'min:1', 'max:999999999'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $op = CashOperation::create([
            ...$data,
            'user_id' => $request->user()->id,
            'shop_id' => ShopScope::currentShopId($request), // 🏬
        ]);

        return response()->json(['data' => $op->load('user:id,name')], 201);
    }

    /**
     * POST /api/cash-ops/close — 🔒 Z de caisse du jour (ou d'une date passée).
     * Une seule clôture par date (422 sinon).
     */
    public function close(Request $request)
    {
        $data = $request->validate([
            'date' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $date = ($data['date'] ?? null) ? Carbon::parse($data['date'])->startOfDay() : now()->startOfDay();
        $shopId = ShopScope::currentShopId($request); // 🏬 un Z par boutique et par jour

        $duplicate = CashClosing::whereDate('closing_date', $date)
            ->when($shopId, fn ($q) => $q->where('shop_id', $shopId), fn ($q) => $q->whereNull('shop_id'))
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages([
                'date' => ['Cette journée est déjà clôturée.'],
            ]);
        }

        $dayStart = $date->copy();
        $dayEnd = $date->copy()->endOfDay();

        // Toutes les requêtes ci-dessous sont bornées à la boutique de l'utilisateur (null = sans boutique)
        $scope = fn ($q) => $q->where(fn ($w) => $w->where('shop_id', $shopId)->orWhereNull('shop_id'));

        $in = (int) $scope(CashOperation::in())->whereBetween('created_at', [$dayStart, $dayEnd])->sum('amount');
        $out = (int) $scope(CashOperation::out())->whereBetween('created_at', [$dayStart, $dayEnd])->sum('amount');
        $sales = (int) $scope(Receipt::where('status', Receipt::STATUS_COMPLETED))
            ->whereBetween('created_at', [$dayStart, $dayEnd])
            ->sum('amount_paid');

        // Solde cumulé de TOUTES les opérations jusqu'à la fin de cette journée
        $balance = (int) $scope(CashOperation::in())->where('created_at', '<=', $dayEnd)->sum('amount')
            - (int) $scope(CashOperation::out())->where('created_at', '<=', $dayEnd)->sum('amount');

        $closing = CashClosing::create([
            'closing_date' => $date->toDateString(),
            'total_in' => $in,
            'total_out' => $out,
            'sales_collected' => $sales,
            'balance' => $balance,
            'notes' => $data['notes'] ?? null,
            'user_id' => $request->user()->id,
            'shop_id' => $shopId,
        ]);

        return response()->json(['data' => $closing->load('user:id,name')], 201);
    }

    /** GET /api/cash-ops/closings — historique des Z (30 derniers, périmètre boutique) */
    public function closings(Request $request)
    {
        return response()->json([
            'data' => ShopScope::apply(CashClosing::with('user:id,name'), $request) // 🏬
                ->orderByDesc('closing_date')->limit(30)->get(),
        ]);
    }

    /**
     * GET /api/cash-ops/chart?days=30 — 📊 courbe de trésorerie :
     * solde de caisse en fin de journée pour chacun des N derniers jours.
     */
    public function chart(Request $request)
    {
        $days = min(90, max(7, $request->integer('days', 30)));
        $start = now()->subDays($days - 1)->startOfDay();

        // Solde cumulé AVANT la fenêtre (point de départ de la courbe)
        $balance = (int) ShopScope::apply(CashOperation::in(), $request)->where('created_at', '<', $start)->sum('amount')
            - (int) ShopScope::apply(CashOperation::out(), $request)->where('created_at', '<', $start)->sum('amount');

        // Mouvements groupés par jour dans la fenêtre
        $rows = ShopScope::apply(CashOperation::query(), $request)
            ->selectRaw('DATE(created_at) as day')
            ->selectRaw("SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as in_sum")
            ->selectRaw("SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as out_sum")
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $points = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $start->copy()->addDays($i);
            $row = $rows->get($day->toDateString());
            $in = (int) ($row->in_sum ?? 0);
            $out = (int) ($row->out_sum ?? 0);
            $balance += $in - $out;

            $points[] = [
                'date' => $day->toDateString(),
                'label' => $day->format('d/m'),
                'in' => $in,
                'out' => $out,
                'balance' => $balance, // solde en fin de journée
            ];
        }

        return response()->json(['data' => $points]);
    }

    /**
     * GET /api/cash-closings/{cashClosing}/pdf — 📄 reçu PDF du Z de caisse
     * (imprimable / archivable, format A5 comme les reçus de vente).
     */
    public function closingPdf(CashClosing $cashClosing)
    {
        abort_unless(
            class_exists(Pdf::class),
            503,
            'PDF indisponible : composer require barryvdh/laravel-dompdf'
        );

        $start = $cashClosing->closing_date->copy()->startOfDay();
        $end = $cashClosing->closing_date->copy()->endOfDay();

        // Opérations du jour + répartition des sorties par catégorie
        $ops = CashOperation::with('user:id,name')
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get();

        $outByCategory = $ops->where('type', CashOperation::TYPE_OUT)
            ->groupBy(fn ($op) => $op->category ?: 'other')
            ->map(fn ($group) => (int) $group->sum('amount'))
            ->sortDesc();

        $pdf = Pdf::loadView('pdf.cash-closing', [
            'closing' => $cashClosing->load('user:id,name'),
            'ops' => $ops,
            'outByCategory' => $outByCategory,
            'shop' => config('shop'),
            'logoUri' => ShopInfo::logoDataUri(),
        ])->setPaper('a5', 'portrait');

        return $pdf->download('Z-caisse-'.$start->format('Y-m-d').'.pdf');
    }

    /** DELETE /api/cash-ops/{cashOperation} — correction d'une erreur de saisie */
    public function destroy(CashOperation $cashOperation)
    {
        $cashOperation->delete();

        return response()->json(['deleted' => true]);
    }
}
