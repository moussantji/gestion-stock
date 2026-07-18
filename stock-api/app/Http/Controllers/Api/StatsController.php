<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\Setting;
use App\Support\XlsxWriter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 📊 Statistiques des ventes (issues des reçus de vente de la boutique).
 * Réservé admin/manager — les montants sont sensibles.
 */
class StatsController extends Controller
{
    private const PERIODS = [
        '7d' => 7,
        '30d' => 30,
        '90d' => 90,
        'all' => null,
    ];

    private function periodFrom(Request $request): array
    {
        // 📅 v2.6 : période à dates libres ?from=AAAA-MM-JJ&to=AAAA-MM-JJ (prioritaire sur `period`).
        // Renvoie ['custom', $from, $to] — bornes inversées permutées, plage plafonnée à 370 j,
        // `to` absent → aujourd'hui, `from` absent → 30 j glissants avant `to`.
        // 3ᵉ élément toujours présent : les destructurations historiques à 2 éléments l'ignorent.
        if ($request->query('from') || $request->query('to')) {
            try {
                $to = $request->query('to')
                    ? Carbon::parse((string) $request->query('to'))->endOfDay()
                    : now()->endOfDay();
                $from = $request->query('from')
                    ? Carbon::parse((string) $request->query('from'))->startOfDay()
                    : $to->copy()->subDays(29)->startOfDay();
                if ($from->greaterThan($to)) {
                    [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
                }
                if ($from->diffInDays($to) > 370) {
                    $from = $to->copy()->subDays(370)->startOfDay();
                }

                return ['custom', $from, $to];
            } catch (\Throwable $e) {
                // dates illisibles → repli silencieux sur la période standard ci-dessous
            }
        }

        $period = $request->query('period', '30d');
        if (! array_key_exists($period, self::PERIODS)) {
            $period = '30d';
        }
        $days = self::PERIODS[$period];
        return [$period, $days ? now()->subDays($days - 1)->startOfDay() : null, null];
    }

    /**
     * GET /api/stats/product-movements?product_id=&period=
     * 🧾 Vue détaillée d'un produit sur la période : entrées / sorties / ventes
     * + les 50 derniers mouvements (les ventes y figurent déjà : motif « Vente »).
     */
    public function productMovements(Request $request)
    {
        [$period, $from, $to] = $this->periodFrom($request); // 📅 v2.6 : $to = borne haute dates libres

        // 🏬 Multi-boutiques (même périmètre que computeSales)
        $shopId = \App\Support\ShopScope::visibleShopId($request);
        $applyShop = fn ($q) => $shopId
            ? $q->where(fn ($w) => $w->where('receipts.shop_id', $shopId)->orWhereNull('receipts.shop_id'))
            : $q;

        $productId = $request->integer('product_id');
        abort_unless($productId > 0, 422, 'product_id manquant.');

        $product = Product::withTrashed()->findOrFail($productId);

        $inQty = (int) StockMovement::where('product_id', $productId)
            ->where('type', StockMovement::TYPE_IN)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->sum('quantity');

        $outQty = (int) StockMovement::where('product_id', $productId)
            ->where('type', StockMovement::TYPE_OUT)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->sum('quantity');

        // Ventes de la période via les reçus (qté + CA)
        $soldRow = $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id'))
            ->where('receipt_items.product_id', $productId)
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->selectRaw('COALESCE(SUM((receipt_items.quantity - receipt_items.refunded_qty)),0) as qty, COALESCE(SUM(((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price)),0) as revenue')
            ->first();

        $movements = \App\Support\ShopScope::apply(StockMovement::with('user:id,name'), $request) // 🏬
            ->where('product_id', $productId)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'period' => $period,
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'quantity' => $product->quantity,
                'alert_threshold' => $product->alert_threshold,
                'deleted' => (bool) $product->deleted_at,
            ],
            'totals' => [
                'in' => $inQty,
                'out' => $outQty,
                'sold_qty' => (int) $soldRow->qty,
                'sold_revenue' => (int) $soldRow->revenue,
            ],
            'movements' => $movements,
        ]);
    }

    /** GET /api/stats/sales?period=30d */
    public function sales(Request $request)
    {
        return response()->json($this->computeSales($request));
    }

    /** GET /api/stats/margins?period=30d — 💰 bénéfice = CA − (qté × prix d'achat) */
    public function margins(Request $request)
    {
        return response()->json($this->computeMargins($request));
    }

    /**
     * GET /api/stats/export.xlsx?period=30d — 📊 vrai classeur Excel :
     * 4 onglets (Résumé / Produits / Vendeurs / Catégories), généré sans dépendance.
     */
    public function exportSales(Request $request)
    {
        $data = $this->computeSales($request);
        $margins = $this->computeMargins($request); // 💰 onglet Marges
        $t = $data['totals'];
        $m = $margins['totals'];
        $periodLabels = [
            '7d' => '7 derniers jours',
            '30d' => '30 derniers jours',
            '90d' => '90 derniers jours',
            'all' => 'Depuis le début',
        ];

        $sheets = [
            [
                'name' => 'Résumé',
                'rows' => [
                    ['Statistiques des ventes — StockFlow'],
                    ['Période', $periodLabels[$data['period']] ?? $data['period']],
                    ['Généré le', now()->format('d/m/Y H:i')],
                    [],
                    ["Chiffre d'affaires (FCFA)", $t['revenue']],
                    ['Nombre de reçus', $t['receipts']],
                    ['Articles vendus', $t['items']],
                    ['Panier moyen (FCFA)', $t['avg_basket']],
                    [],
                    ["Coût d'achat des ventes (FCFA)", $m['cost']],
                    ['Marge brute (FCFA)', $m['margin']],
                    ['Taux de marge (%)', $m['rate']],
                ],
            ],
            [
                'name' => 'Marges',
                'rows' => array_merge(
                    [['Produit', 'Qté vendue', 'CA (FCFA)', "Coût (FCFA)", 'Marge (FCFA)', 'Taux (%)']],
                    array_map(
                        fn ($p) => [$p['name'], $p['qty'], $p['revenue'], $p['cost'], $p['margin'], $p['rate']],
                        $margins['products']
                    )
                ),
            ],
            [
                'name' => 'Produits',
                'rows' => array_merge(
                    [['Produit', 'Quantité vendue', 'CA (FCFA)', 'Nb reçus', 'Part (%)']],
                    array_map(
                        fn ($p) => [$p['name'], $p['qty'], $p['revenue'], $p['receipts_count'], $p['share']],
                        $data['products']
                    )
                ),
            ],
            [
                'name' => 'Vendeurs',
                'rows' => array_merge(
                    [['Vendeur', 'Nb reçus', 'Articles vendus', 'CA (FCFA)', 'Panier moyen (FCFA)', 'Part (%)']],
                    array_map(
                        fn ($s) => [$s['name'], $s['receipts_count'], $s['items'], $s['revenue'], $s['avg_basket'], $s['share']],
                        $data['sellers']
                    )
                ),
            ],
            [
                'name' => 'Catégories',
                'rows' => array_merge(
                    [['Catégorie', 'Quantité vendue', 'CA (FCFA)', 'Part (%)']],
                    array_map(
                        fn ($c) => [$c['name'] ?? 'Sans catégorie', $c['qty'], $c['revenue'], $c['share']],
                        $data['categories']
                    )
                ),
            ],
        ];

        $dir = storage_path('app/exports');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $path = $dir . '/stats-' . $data['period'] . '-' . now()->format('Ymd-His') . '.xlsx';

        XlsxWriter::write($path, $sheets);

        return response()->download($path, 'stats-ventes-' . $data['period'] . '.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * 💰 Calcul commun des marges (avoirs exclus).
     * Le coût utilise le prix d'achat ACTUEL du produit (documenté : pas de snapshot historique).
     */
    private function computeMargins(Request $request): array
    {
        [$period, $from, $to] = $this->periodFrom($request); // 📅 v2.6 : $to = borne haute dates libres

        // 🏬 Multi-boutiques (même périmètre que computeSales)
        $shopId = \App\Support\ShopScope::visibleShopId($request);
        $applyShop = fn ($q) => $shopId
            ? $q->where(fn ($w) => $w->where('receipts.shop_id', $shopId)->orWhereNull('receipts.shop_id'))
            : $q;

        $rows = $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->leftJoin('products', 'products.id', '=', 'receipt_items.product_id')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipt_items.product_id', 'receipt_items.product_name')
            ->selectRaw('receipt_items.product_id')
            ->selectRaw('receipt_items.product_name as name')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty)) as qty')
            ->selectRaw('SUM(((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price)) as revenue')
            ->selectRaw('ROUND(SUM((receipt_items.quantity - receipt_items.refunded_qty) * COALESCE(products.purchase_price, 0))) as cost')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get());

        $totals = ['revenue' => 0, 'cost' => 0, 'margin' => 0, 'rate' => 0.0];

        $products = $rows->map(function ($row) use (&$totals) {
            $revenue = (int) $row->revenue;
            $cost = (int) $row->cost;
            $margin = $revenue - $cost;

            $totals['revenue'] += $revenue;
            $totals['cost'] += $cost;
            $totals['margin'] += $margin;

            return [
                'product_id' => $row->product_id,
                'name' => $row->name,
                'qty' => (int) $row->qty,
                'revenue' => $revenue,
                'cost' => $cost,
                'margin' => $margin,
                'rate' => $revenue > 0 ? round(($margin / $revenue) * 100, 1) : 0.0,
            ];
        })->values()->all();

        // 📊 v2.10 : rentabilité mois par mois (12 derniers mois calendaires) — clé
        // additive « by_month » demandée explicitement (?by_month=1) → 0 requête sinon
        $byMonth = [];
        if ($request->boolean('by_month')) {
            $byMonth = $applyShop(DB::table('receipt_items')
                ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
                ->where('receipts.status', 'completed')
                ->leftJoin('products', 'products.id', '=', 'receipt_items.product_id')
                ->where('receipts.created_at', '>=', now()->subMonths(11)->startOfMonth())
                ->groupBy(DB::raw("DATE_FORMAT(receipts.created_at, '%Y-%m')"))
                ->selectRaw("DATE_FORMAT(receipts.created_at, '%Y-%m') as ym")
                ->selectRaw('SUM(((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price)) as revenue')
                ->selectRaw('ROUND(SUM((receipt_items.quantity - receipt_items.refunded_qty) * COALESCE(products.purchase_price, 0))) as cost')
                ->orderBy('ym')
                ->get())
                ->map(fn ($r) => [
                    'ym' => $r->ym,
                    'revenue' => (int) $r->revenue,
                    'cost' => (int) $r->cost,
                    'margin' => (int) $r->revenue - (int) $r->cost,
                    'rate' => (int) $r->revenue > 0 ? round((((int) $r->revenue - (int) $r->cost) / (int) $r->revenue) * 100, 1) : 0.0,
                ])->values()->all();
        }

        $totals['rate'] = $totals['revenue'] > 0
            ? round(($totals['margin'] / $totals['revenue']) * 100, 1)
            : 0.0;

        return [
            'period' => $period,
            'totals' => $totals,
            'products' => $products,
            'by_month' => $byMonth, // 📊 v2.10 — clé additive : [] sauf demande explicite (?by_month=1)
        ];
    }

    /** Calcul commun à sales() (JSON) et exportSales() (XLSX). */
    private function computeSales(Request $request): array
    {
        [$period, $from, $to] = $this->periodFrom($request); // ($from/$to = bornes v2.6 dates libres)

        // 🏬 Multi-boutiques : borne toutes les requêtes ci-dessous
        $shopId = \App\Support\ShopScope::visibleShopId($request);
        $applyShop = fn ($q) => $shopId
            ? $q->where(fn ($w) => $w->where('receipts.shop_id', $shopId)->orWhereNull('receipts.shop_id'))
            : $q;

        // ---------- Totaux globaux ----------
        $receiptsQuery = $applyShop(DB::table('receipts'))
            ->where('status', 'completed') // ↩️ avoirs exclus
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to));

        // CA NET des avoirs partiels (calculé depuis les lignes, pas receipts.total)
        $revenue = (int) ($applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price) as net')
            ->value('net') ?? 0));
        $receiptsCount = (int) (clone $receiptsQuery)->count();

        $itemsSold = (int) $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->sum('receipt_items.quantity'));

        // ---------- Classement par produit ----------
        $productRows = $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->leftJoin('products', 'products.id', '=', 'receipt_items.product_id')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipt_items.product_id', 'receipt_items.product_name', 'products.image_path')
            ->selectRaw('receipt_items.product_id')
            ->selectRaw('receipt_items.product_name as name')
            ->selectRaw('products.image_path as image_path')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty)) as qty')
            ->selectRaw('SUM(((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price)) as revenue')
            ->selectRaw('COUNT(DISTINCT receipt_items.receipt_id) as receipts_count')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get());

        $productsRevenue = max(1, (int) $productRows->sum('revenue')); // évite /0

        $products = $productRows->map(fn ($row) => [
            'product_id' => $row->product_id,
            'name' => $row->name, // snapshot (même si le produit a été renommé/supprimé)
            'image_url' => $row->image_path ? asset('storage/' . $row->image_path) : null,
            'qty' => (int) $row->qty,
            'revenue' => (int) $row->revenue,
            'receipts_count' => (int) $row->receipts_count,
            'share' => round(($row->revenue / $productsRevenue) * 100, 1), // % du CA
        ])->values()->all();

        // ---------- Classement par vendeur ----------
        $sellerRows = $applyShop(DB::table('receipts')
            ->join('users', 'users.id', '=', 'receipts.user_id')
            ->join('receipt_items', 'receipt_items.receipt_id', '=', 'receipts.id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipts.user_id', 'users.name')
            ->selectRaw('receipts.user_id')
            ->selectRaw('users.name')
            ->selectRaw('COUNT(DISTINCT receipts.id) as receipts_count')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price) as revenue')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get());

        // Articles vendus par vendeur (2ᵉ requête pour éviter le double-comptage de JOIN)
        $itemsBySeller = $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipts.user_id')
            ->selectRaw('receipts.user_id, SUM((receipt_items.quantity - receipt_items.refunded_qty)) as items')
            ->pluck('items', 'receipts.user_id'));

        $sellersRevenue = max(1, (int) $sellerRows->sum('revenue')); // évite /0

        $sellers = $sellerRows->map(fn ($row) => [
            'user_id' => $row->user_id,
            'name' => $row->name,
            'receipts_count' => (int) $row->receipts_count,
            'items' => (int) ($itemsBySeller[$row->user_id] ?? 0),
            'revenue' => (int) $row->revenue,
            'avg_basket' => $row->receipts_count > 0 ? (int) round($row->revenue / $row->receipts_count) : 0,
            'share' => round(($row->revenue / $sellersRevenue) * 100, 1),
        ])->values()->all();

        // ---------- Classement par catégorie (LEFT JOINs : produit supprimé possible) ----------
        $categoryRows = $applyShop(DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->leftJoin('products', 'products.id', '=', 'receipt_items.product_id')
            ->where('receipts.status', 'completed')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('categories.id', 'categories.name')
            ->selectRaw('categories.id as category_id, categories.name as name')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty)) as qty')
            ->selectRaw('SUM(((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price)) as revenue')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get());

        $categoriesRevenue = max(1, (int) $categoryRows->sum('revenue'));

        $categories = $categoryRows->map(fn ($row) => [
            'category_id' => $row->category_id, // null = produit sans catégorie
            'name' => $row->name,               // null → app affiche « Sans catégorie »
            'qty' => (int) $row->qty,
            'revenue' => (int) $row->revenue,
            'share' => round(($row->revenue / $categoriesRevenue) * 100, 1),
        ])->values()->all();

        // ---------- 🏬 v2.5 : comparatif par boutique ----------
        // ⚠️ VOLONTAIREMENT NON borné par $applyShop : le but est de comparer
        // TOUTES les boutiques entre elles (comme le bloc boutiques du pack jour v2.2).
        // Reçus sans boutique (shop_id NULL) regroupés sous « Siège ».
        $shopRows = DB::table('receipts')
            ->leftJoin('shops', 'shops.id', '=', 'receipts.shop_id')
            ->join('receipt_items', 'receipt_items.receipt_id', '=', 'receipts.id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipts.shop_id', 'shops.name')
            ->selectRaw('receipts.shop_id as shop_id')
            ->selectRaw('shops.name as name')
            ->selectRaw('COUNT(DISTINCT receipts.id) as receipts_count')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price) as revenue')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        // Articles vendus par boutique (2ᵉ requête, même raison que les vendeurs)
        $itemsByShop = DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipts.shop_id')
            ->selectRaw('receipts.shop_id as shop_id, SUM((receipt_items.quantity - receipt_items.refunded_qty)) as items')
            ->pluck('items', 'shop_id'); // clé « » (chaîne vide) pour les reçus sans boutique

        $shopsRevenue = max(1, (int) $shopRows->sum('revenue')); // évite /0

        $byShop = $shopRows->map(fn ($row) => [
            'shop_id' => $row->shop_id,             // null = Siège
            'name' => $row->name ?? 'Siège',
            'receipts_count' => (int) $row->receipts_count,
            'items' => (int) ($itemsByShop[$row->shop_id ?? ''] ?? 0), // PHP : clé null → ''
            'revenue' => (int) $row->revenue,
            'avg_basket' => $row->receipts_count > 0 ? (int) round($row->revenue / $row->receipts_count) : 0,
            'share' => round(($row->revenue / $shopsRevenue) * 100, 1),
        ])->values()->all();

        // ---------- 📊🏬 v2.7 : matrice croisée vendeurs × boutiques (heatmap) ----------
        // Même périmètre que by_shop : TOUTES les boutiques (comparaison), non bornée par $applyShop.
        // 1 requête groupée (user × shop) puis pivot en mémoire — lignes de la matrice.
        $crossRows = DB::table('receipts')
            ->join('users', 'users.id', '=', 'receipts.user_id')
            ->join('receipt_items', 'receipt_items.receipt_id', '=', 'receipts.id')
            ->where('receipts.status', 'completed')
            ->when($from, fn ($q) => $q->where('receipts.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('receipts.created_at', '<=', $to))
            ->groupBy('receipts.user_id', 'users.name', 'receipts.shop_id')
            ->selectRaw('receipts.user_id as user_id')
            ->selectRaw('users.name as name')
            ->selectRaw('receipts.shop_id as shop_id')
            ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price) as revenue')
            ->get();

        $cross = $crossRows->groupBy('user_id')->map(fn ($rows) => [
            'user_id' => (int) $rows->first()->user_id,
            'name' => $rows->first()->name,
            'total' => (int) $rows->sum('revenue'),
            'by_shop' => $rows->map(fn ($r) => [
                'shop_id' => $r->shop_id,   // null = Siège (le client affiche « Siège »)
                'revenue' => (int) $r->revenue,
            ])->sortByDesc('revenue')->values()->all(),
        ])->sortByDesc('total')->values()->all(); // vendeurs triés par CA croisé

        // ---------- 🏆 v2.8 : objectifs vendeurs du mois en cours (additive) ----------
        // Cible mensuelle unique (réglage seller_monthly_target, 🎯 Seuils) ; 0 = désactivé.
        // CA du MOIS CALENDAIRE courant (indépendant de la période demandée), même périmètre
        // boutique que le reste de l'écran ($applyShop) — chacun voit ce qu'il doit voir.
        $goalTarget = (int) Setting::get('seller_monthly_target', 0);
        $sellerGoals = ['target' => $goalTarget, 'sellers' => []];
        if ($goalTarget > 0) {
            $goalRows = $applyShop(DB::table('receipts')
                ->join('users', 'users.id', '=', 'receipts.user_id')
                ->join('receipt_items', 'receipt_items.receipt_id', '=', 'receipts.id')
                ->where('receipts.status', 'completed')
                ->where('receipts.created_at', '>=', now()->startOfMonth())
                ->groupBy('receipts.user_id', 'users.name')
                ->selectRaw('receipts.user_id')
                ->selectRaw('users.name')
                ->selectRaw('SUM((receipt_items.quantity - receipt_items.refunded_qty) * receipt_items.unit_price) as revenue')
                ->orderByDesc('revenue')
                ->limit(20)
                ->get());
            $sellerGoals['sellers'] = $goalRows->map(fn ($row) => [
                'user_id' => (int) $row->user_id,
                'name' => $row->name,
                'revenue' => (int) $row->revenue,
                'progress' => round(($row->revenue / $goalTarget) * 100, 1), // % — la barre client plafonne à 100
            ])->values()->all();
        }

        return [
            'period' => $period,
            'from' => $from?->toDateString(),
            'to' => $to?->toDateString(), // 📅 v2.6 — borne haute (clé additive, anciens clients : ignorée)
            'totals' => [
                'revenue' => $revenue,
                'receipts' => $receiptsCount,
                'items' => $itemsSold,
                'avg_basket' => $receiptsCount > 0 ? (int) round($revenue / $receiptsCount) : 0,
            ],
            'products' => $products,
            'sellers' => $sellers,
            'categories' => $categories,
            'by_shop' => $byShop, // 🏬 v2.5 — clé additive : les anciens clients l'ignorent
            'cross' => $cross,    // 📊 v2.7 — matrice vendeurs × boutiques (additive aussi)
            'seller_goals' => $sellerGoals, // 🏆 v2.8 — objectifs du mois (additive ; target 0 = désactivé)
        ];
    }
}
