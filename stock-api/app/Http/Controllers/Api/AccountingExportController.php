<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\DailyPackMail;
use App\Mail\WeeklyRecapMail;
use App\Models\CashClosing;
use App\Models\CashOperation;
use App\Models\Receipt;
use App\Models\Shop;
use App\Support\Setting;
use App\Support\ShopScope;
use App\Support\Tva;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * 🧾 Exports comptables mensuels (admin/manager) — pour le comptable.
 * 3 CSV par mois, conventions identiques à ExportController :
 * séparateur ";" + BOM UTF-8 (ouverture directe correcte dans Excel fr).
 * Filtrés par ShopScope : un poste rattaché à une boutique n'exporte que sa boutique.
 * ⚠️ Aucune migration, aucune table : lecture seule des données existantes.
 */
class AccountingExportController extends Controller
{
    /** GET /api/accounting/export?type=receipts|cash|closings&month=YYYY-MM */
    public function export(Request $request)
    {
        $month = (string) $request->query('month', '');
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            return response()->json(['message' => 'Paramètre month attendu au format YYYY-MM (ex. 2026-07).'], 422);
        }
        [$from, $to] = ["{$month}-01 00:00:00", date('Y-m-t 23:59:59', strtotime("{$month}-01"))];
        $type = (string) $request->query('type', '');

        return match ($type) {
            'receipts' => $this->receipts($request, $month, $from, $to),
            'cash' => $this->cash($request, $month, $from, $to),
            'closings' => $this->closings($request, $month),
            default => response()->json(['message' => 'type attendu : receipts | cash | closings'], 422),
        };
    }

    /**
     * GET /api/accounting/summary?month=YYYY-MM
     * 📄 v1.7 : agrégats du mois pour le récap PDF comptable (généré côté PC).
     * Léger : 4 requêtes d'agrégats + la liste des Z (max 31 lignes).
     */
    public function summary(Request $request)
    {
        // 🧮 v2.1 : bilans personnalisés — from/to (YYYY-MM-DD) priment sur month
        $fromQ = (string) $request->query('from', '');
        $toQ = (string) $request->query('to', '');
        $rangeMode = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromQ) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toQ);
        $range = null;
        if ($rangeMode) {
            if ($toQ < $fromQ || (strtotime($toQ) - strtotime($fromQ)) > 367 * 86400) {
                return response()->json(['message' => 'Plage invalide (from ≤ to, 367 j maximum).'], 422);
            }
            $month = null;
            $range = [$fromQ, $toQ];
            [$from, $to] = ["{$fromQ} 00:00:00", "{$toQ} 23:59:59"];
        } else {
            $month = (string) $request->query('month', '');
            if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
                return response()->json(['message' => 'Paramètre month attendu (YYYY-MM) — ou from/to (YYYY-MM-DD).'], 422);
            }
            [$from, $to] = ["{$month}-01 00:00:00", date('Y-m-t 23:59:59', strtotime("{$month}-01"))];
        }

        return response()->json(['data' => array_merge(
            ['month' => $month, 'range' => $range], // 🧮 v2.1 : [from, to] en mode plage, null sinon
            $this->recapData($request, $from, $to, $range), // 📧 v2.3 : même calcul pour le bilan hebdo email
        )]);
    }

    /**
     * 🧮 Agrégats d'une plage [from, to] (réutilisés par summary ET le bilan hebdo email).
     *
     * @return array{receipts: array, cash: array, closings: array}
     */
    private function recapData(Request $request, string $from, string $to, ?array $range): array
    {
        $receiptsBase = ShopScope::apply(Receipt::whereBetween('created_at', [$from, $to]), $request);
        $agg = (clone $receiptsBase)->selectRaw(
            'COUNT(*) as c, COALESCE(SUM(total),0) as t, COALESCE(SUM(amount_paid),0) as p, COALESCE(SUM(points_discount),0) as d'
        )->first();
        $refunds = (clone $receiptsBase)->where('status', Receipt::STATUS_REFUNDED)
            ->selectRaw('COUNT(*) as c, COALESCE(SUM(total),0) as t')->first();

        $cashBase = ShopScope::apply(CashOperation::whereBetween('created_at', [$from, $to]), $request);
        $cashIn = (int) (clone $cashBase)->where('type', 'in')->sum('amount');
        $cashOut = (int) (clone $cashBase)->where('type', 'out')->sum('amount');
        $cashOps = (int) (clone $cashBase)->count();

        $closingsQ = CashClosing::with('user:id,name')->orderBy('closing_date');
        if ($range) {
            $closingsQ->whereBetween('closing_date', [$range[0], $range[1]]); // 🧮 v2.1
        } else {
            $closingsQ->where('closing_date', 'like', substr($from, 0, 7).'-%');
        }
        $days = ShopScope::apply($closingsQ, $request)->get()->map(fn ($z) => [
            'date' => is_string($z->closing_date) ? substr($z->closing_date, 0, 10) : $z->closing_date?->format('Y-m-d'),
            'sales_collected' => (int) $z->sales_collected,
            'total_in' => (int) $z->total_in,
            'total_out' => (int) $z->total_out,
            'balance' => (int) $z->balance,
            'cashier' => $z->user?->name ?? '',
        ])->values();

        // 🏬 v2.7 : détail par boutique (TOUTES boutiques — comparaison, même esprit que
        // la « ② bis » du pack jour v2.2 → section dédiée dans le PDF/email hebdo).
        // Reçus sans boutique (shop_id NULL) regroupés sous « Siège ».
        $shopRows = Receipt::query()
            ->leftJoin('shops', 'shops.id', '=', 'receipts.shop_id')
            ->whereBetween('receipts.created_at', [$from, $to])
            ->where('receipts.status', Receipt::STATUS_COMPLETED)
            ->groupBy('receipts.shop_id', 'shops.name')
            ->selectRaw('receipts.shop_id as shop_id')
            ->selectRaw('shops.name as name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(receipts.total),0) as total')
            ->orderByDesc('total')
            ->get();
        $shopsTotal = max(1, (int) $shopRows->sum('total')); // évite /0
        $byShop = $shopRows->map(fn ($r) => [
            'shop_id' => $r->shop_id,           // null = Siège
            'name' => $r->name ?? 'Siège',
            'count' => (int) $r->count,
            'total' => (int) $r->total,
            'share' => round(($r->total / $shopsTotal) * 100, 1),
        ])->values()->all();

        // 👥 v2.9 : commissions vendeurs de la période (clé additive ; taux 0 = bloc vide,
        // 0 requête supplémentaire quand la commission n'est pas configurée).
        $commissionPct = (int) Setting::get('commission_pct', 0);
        $commissions = ['pct' => $commissionPct, 'sellers' => [], 'total' => 0];
        if ($commissionPct > 0) {
            $comRows = ShopScope::apply(
                Receipt::query()
                    ->join('users', 'users.id', '=', 'receipts.user_id')
                    ->whereBetween('receipts.created_at', [$from, $to])
                    ->where('receipts.status', Receipt::STATUS_COMPLETED)
                    ->groupBy('receipts.user_id', 'users.name')
                    ->selectRaw('receipts.user_id as user_id')
                    ->selectRaw('users.name as name')
                    ->selectRaw('COALESCE(SUM(receipts.total),0) as revenue')
                    ->orderByDesc('revenue'),
                $request
            )->limit(50)->get();
            $commissions['sellers'] = $comRows->map(fn ($r) => [
                'user_id' => (int) $r->user_id,
                'name' => $r->name,
                'revenue' => (int) $r->revenue,
                'commission' => (int) round($r->revenue * $commissionPct / 100),
            ])->values()->all();
            $commissions['total'] = (int) collect($commissions['sellers'])->sum('commission');
        }

        return [
            'receipts' => [
                'count' => (int) $agg->c,
                'total' => (int) $agg->t,
                'paid' => (int) $agg->p,
                'points_discount' => (int) $agg->d,
                'refunds' => (int) $refunds->c,
                'refunds_total' => (int) $refunds->t,
            ],
            'cash' => ['in' => $cashIn, 'out' => $cashOut, 'ops' => $cashOps],
            'closings' => [
                'count' => $days->count(),
                'sales' => (int) $days->sum('sales_collected'),
                'end_balance' => (int) ($days->last()['balance'] ?? 0),
                'days' => $days,
            ],
            'by_shop' => $byShop, // 🏬 v2.7 — clé additive : vielles versions l'ignorent
            'commissions' => $commissions, // 👥 v2.9 — clé additive : idem (pct 0 = masquée)
        ];
    }

    /**
     * 📧 v2.1 — POST /api/accounting/email-pack
     * Envoie le pack du jour (PDF + CSV générés par le poste PC) au patron.
     * {date: YYYY-MM-DD, pdf: base64, csv?: texte, csv_name?: nom}
     * Mise en file si une queue est configurée, envoi immédiat sinon.
     */
    public function emailPack(Request $request)
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'pdf' => ['required', 'string', 'max:9000000'], // base64 (~6 Mo binaire max)
            'csv' => ['nullable', 'string', 'max:3000000'],
            'csv_name' => ['nullable', 'string', 'max:80'],
        ]);

        $to = Setting::getText('boss_email');
        if ($to === '') {
            throw ValidationException::withMessages([
                'boss_email' => ["Configure l'email du patron dans Réglages → Seuils & fidélité (champ boss_email)."],
            ]);
        }

        $pdfBin = base64_decode($data['pdf'], true);
        if ($pdfBin === false || strlen($pdfBin) < 100 || ! str_starts_with($pdfBin, '%PDF')) {
            throw ValidationException::withMessages(['pdf' => ['PDF invalide ou tronqué.']]);
        }

        $shopId = ShopScope::currentShopId($request);
        $shopName = ($shopId ? Shop::find($shopId)?->name : null)
            ?: $request->user()?->shop?->name
            ?: config('app.name', 'StockFlow');

        $mail = new DailyPackMail(
            $data['date'],
            (string) $shopName,
            $pdfBin,
            $data['csv'] ?? null,
            $data['csv_name'] ?? null,
        );

        try {
            Mail::to($to)->queue($mail); // file configurée (database, redis…) ou sync = immédiat
            $queued = true;
        } catch (\Throwable) {
            Mail::to($to)->send($mail); // repli : envoi synchrone immédiat
            $queued = false;
        }

        return response()->json(['data' => ['to' => $to, 'queued' => $queued]]);
    }

    /**
     * 📧🧮 v2.3 — POST /api/accounting/email-weekly
     * Envoie le bilan hebdo (lundi → dimanche) au patron : PDF généré par le
     * poste PC + chiffres clés calculés ici (mêmes agrégats que summary).
     * {from: YYYY-MM-DD, to: YYYY-MM-DD, pdf: base64}
     */
    public function emailWeekly(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'pdf' => ['required', 'string', 'max:9000000'], // base64 (~6 Mo binaire max)
        ]);
        if ((strtotime($data['to']) - strtotime($data['from'])) > 367 * 86400) {
            throw ValidationException::withMessages(['to' => ['Plage trop large (367 j maximum).']]);
        }

        $to = Setting::getText('boss_email');
        if ($to === '') {
            throw ValidationException::withMessages([
                'boss_email' => ["Configure l'email du patron dans Réglages → Seuils & fidélité (champ boss_email)."],
            ]);
        }

        $pdfBin = base64_decode($data['pdf'], true);
        if ($pdfBin === false || strlen($pdfBin) < 100 || ! str_starts_with($pdfBin, '%PDF')) {
            throw ValidationException::withMessages(['pdf' => ['PDF invalide ou tronqué.']]);
        }

        $shopId = ShopScope::currentShopId($request);
        $shopName = ($shopId ? Shop::find($shopId)?->name : null)
            ?: $request->user()?->shop?->name
            ?: config('app.name', 'StockFlow');

        $range = [$data['from'], $data['to']];
        $recap = $this->recapData($request, "{$range[0]} 00:00:00", "{$range[1]} 23:59:59", $range);
        $bestDay = collect($recap['closings']['days'])
            ->filter(fn ($d) => ($d['sales_collected'] ?? 0) > 0)
            ->sortByDesc('sales_collected')
            ->first();

        $mail = new WeeklyRecapMail($range[0], $range[1], (string) $shopName, $pdfBin, $recap, $bestDay);

        try {
            Mail::to($to)->queue($mail); // file configurée (database, redis…) ou sync = immédiat
            $queued = true;
        } catch (\Throwable) {
            Mail::to($to)->send($mail); // repli : envoi synchrone immédiat
            $queued = false;
        }

        return response()->json(['data' => ['to' => $to, 'queued' => $queued]]);
    }

    /** 📜 Ventes (reçus) du mois — 1 ligne par reçu */
    private function receipts(Request $request, string $month, string $from, string $to): mixed
    {
        $file = "ventes-{$month}.csv";
        $tvaOn = Tva::config()['enabled']; // 🧮 v2.9 : colonnes additives quand la TVA est configurée
        $callback = function () use ($request, $from, $to, $tvaOn) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM Excel fr
            fputcsv($out, array_merge([
                'Date', 'Numéro', 'Client', 'Vendeur', 'Boutique',
                'Nb articles', 'Total (F)', 'Remise points (F)', 'Payé (F)', 'Reste (F)', 'Statut',
            ], $tvaOn ? ['dont HT (F)', 'dont TVA (F)'] : []), ';');

            $statuses = [Receipt::STATUS_COMPLETED => 'Soldé/Validé', Receipt::STATUS_REFUNDED => 'Avoir'];
            ShopScope::apply(
                Receipt::with(['customer:id,name', 'user:id,name', 'shop:id,name'])
                    ->withCount('items')
                    ->when($tvaOn, fn ($q) => $q->with(['items.product:id,category_id'])) // 🧮 v2.9 (eager = pas de N+1)
                    ->whereBetween('created_at', [$from, $to])
                    ->orderBy('created_at'),
                $request
            )->chunk(200, function ($rows) use ($out, $statuses, $tvaOn) {
                foreach ($rows as $r) {
                    $line = [
                        $r->created_at?->format('Y-m-d H:i'),
                        $r->number,
                        $r->customer?->name ?? ($r->client_name ?? ''),
                        $r->user?->name ?? '',
                        $r->shop?->name ?? 'Siège',
                        $r->items_count ?? 0,
                        $r->total,
                        $r->points_discount ?? 0,
                        $r->amount_paid,
                        $r->remaining ?? 0,
                        $statuses[$r->status] ?? $r->status,
                    ];
                    if ($tvaOn) { // 🧮 v2.9 : ventilation du reçu (2 colonnes en fin de ligne)
                        $bk = Tva::breakdown($r->items);
                        $line[] = $bk['total_ht'];
                        $line[] = $bk['total_tva'];
                    }
                    fputcsv($out, $line, ';');
                }
            });
            fclose($out);
        };

        return response()->stream($callback, 200, $this->csvHeaders($file));
    }

    /** 💵 Opérations de caisse (hors ventes) du mois */
    private function cash(Request $request, string $month, string $from, string $to): mixed
    {
        $file = "caisse-{$month}.csv";
        $callback = function () use ($request, $from, $to) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Date', 'Type', 'Catégorie', 'Montant (F)', 'Motif', 'Utilisateur', 'Boutique'], ';');

            ShopScope::apply(
                CashOperation::with(['user:id,name', 'shop:id,name'])
                    ->whereBetween('created_at', [$from, $to])
                    ->orderBy('created_at'),
                $request
            )->chunk(300, function ($rows) use ($out) {
                foreach ($rows as $o) {
                    fputcsv($out, [
                        $o->created_at?->format('Y-m-d H:i'),
                        $o->type === 'in' ? 'Entrée' : 'Sortie',
                        $o->category ?? '',
                        $o->amount,
                        $o->reason ?? '',
                        $o->user?->name ?? '',
                        $o->shop?->name ?? 'Siège',
                    ], ';');
                }
            });
            fclose($out);
        };

        return response()->stream($callback, 200, $this->csvHeaders($file));
    }

    /** 🔒 Z de caisse (clôtures) du mois — sur closing_date */
    private function closings(Request $request, string $month): mixed
    {
        $file = "z-caisse-{$month}.csv";
        $callback = function () use ($request, $month) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Date clôture', 'Ventes encaissées (F)', 'Apports (F)', 'Dépenses (F)',
                'Solde cumulé (F)', 'Caissier', 'Boutique', 'Notes',
            ], ';');

            ShopScope::apply(
                CashClosing::with(['user:id,name', 'shop:id,name'])
                    ->where('closing_date', 'like', "{$month}-%")
                    ->orderBy('closing_date'),
                $request
            )->chunk(100, function ($rows) use ($out) {
                foreach ($rows as $z) {
                    fputcsv($out, [
                        is_string($z->closing_date) ? substr($z->closing_date, 0, 10) : $z->closing_date?->format('Y-m-d'),
                        $z->sales_collected,
                        $z->total_in,
                        $z->total_out,
                        $z->balance,
                        $z->user?->name ?? '',
                        $z->shop?->name ?? 'Siège',
                        $z->notes ?? '',
                    ], ';');
                }
            });
            fclose($out);
        };

        return response()->stream($callback, 200, $this->csvHeaders($file));
    }

    private function csvHeaders(string $filename): array
    {
        return [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];
    }
}
