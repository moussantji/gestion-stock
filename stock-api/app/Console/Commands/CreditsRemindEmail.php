<?php

namespace App\Console\Commands;

use App\Mail\CreditReminderMail;
use App\Models\Customer;
use App\Models\Receipt;
use App\Support\Setting;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * 📧 v2.2 — Digest EMAIL des crédits anciens → adresse du patron (boss_email).
 * Complète le push `credits:remind` (10:00) : la version détaillée part à 10:05.
 * Silencieux si l'adresse est vide ou s'il n'y a rien d'ancien — planifiable
 * tous les jours sans bruit.
 */
class CreditsRemindEmail extends Command
{
    protected $signature = 'credits:remind-email';

    protected $description = 'Email patron : crédits anciens non soldés (seuil boutique)';

    public function handle(): int
    {
        $to = Setting::getText('boss_email');
        if ($to === '') {
            $this->info('boss_email vide — rappel email ignoré (rien à faire).');

            return self::SUCCESS;
        }

        // 🎯 Même seuil que le push : réglage boutique credit_reminder_days (défaut 7)
        $days = (int) Setting::get('credit_reminder_days', 7);
        $limit = now()->subDays($days);

        $oldCredits = Receipt::with(['customer:id,name', 'shop:id,name'])
            ->where('status', Receipt::STATUS_COMPLETED) // ↩️ avoirs exclus
            ->whereColumn('amount_paid', '<', 'total')
            ->where('created_at', '<=', $limit)
            ->oldest() // les plus urgents d'abord
            ->get();

        // 💳📅 v2.13 : rappels PLANIFIÉS — échéance demain (J−1) ou déjà dépassée, solde > 0
        $planned = $this->plannedRows();

        if ($oldCredits->isEmpty() && $planned === []) {
            $this->info('Aucun crédit ancien ni échéance planifiée — pas d’email.');

            return self::SUCCESS;
        }

        $due = (int) $oldCredits->sum(fn (Receipt $r) => (int) $r->remaining);
        $count = $oldCredits->count();

        $rows = $oldCredits->take(15)->map(fn (Receipt $r) => [
            'customer' => $r->customer?->name ?? $r->client_name ?? '—',
            'number' => $r->number,
            'date' => $r->created_at?->format('d/m/Y'),
            'age' => (int) ($r->created_at ? $r->created_at->diffInDays(now()) : 0),
            'remaining' => (int) $r->remaining,
            'shop' => $r->shop?->name,
        ])->values()->all();

        $mail = new CreditReminderMail($days, $count, $due, $rows, (string) config('app.name', 'StockFlow'), $planned);

        try {
            Mail::to($to)->queue($mail); // file configurée, ou sync = immédiat
            $mode = 'file';
        } catch (\Throwable) {
            Mail::to($to)->send($mail); // repli synchrone
            $mode = 'direct';
        }

        $this->info("Digest crédits → {$to} : {$due} FCFA sur {$count} crédit(s) (+{$days} j)"
            .(count($planned) ? ' + '.count($planned).' rappel(s) planifié(s)' : '')
            ." [{$mode}].");

        return self::SUCCESS;
    }

    /**
     * 💳📅 v2.13 — Clients avec une échéance planifiée demain (J−1) ou dépassée, solde > 0.
     * Source : réglage JSON `credit_schedule` {customer_id: ['AAAA-MM-JJ', …]} (0 migration).
     * Retour : lignes pour l'email (retards d'abord, puis J−1) — 15 max.
     */
    private function plannedRows(): array
    {
        $raw = Setting::getText('credit_schedule');
        $schedule = $raw !== '' ? json_decode($raw, true) : [];
        if (! is_array($schedule) || $schedule === []) {
            return [];
        }

        $today = now()->startOfDay();
        $tomorrow = now()->addDay()->toDateString();

        // Prochaine échéance par client planifié : la 1ʳᵉ date ≥ demain (= rappel J−1),
        // sinon la dernière date passée (= retard), sinon rien (échéance ≥ J+2 : pas de rappel)
        $watch = []; // customer_id => ['date' => …, 'late_days' => n]
        foreach ($schedule as $customerId => $dates) {
            $dates = array_values(array_filter(array_map(
                fn ($d) => trim((string) $d),
                is_array($dates) ? $dates : []
            ), fn ($d) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) === 1));
            sort($dates);
            if ($dates === []) {
                continue;
            }
            $past = array_values(array_filter($dates, fn ($d) => $d < now()->toDateString()));
            if (in_array($tomorrow, $dates, true)) {
                $watch[(int) $customerId] = ['date' => $tomorrow, 'late_days' => 0]; // 📅 J−1 : c'est demain
            } elseif ($past !== []) {
                $last = $past[count($past) - 1];
                $watch[(int) $customerId] = [
                    'date' => $last,
                    'late_days' => (int) round(($today->getTimestamp() - Carbon::parse($last)->startOfDay()->getTimestamp()) / 86400),
                ];
            }
        }
        if ($watch === []) {
            return [];
        }

        // Soldes encore dus (UNE requête groupée) — on ne rappelle que qui doit encore
        $dueByCustomer = Receipt::selectRaw('customer_id, SUM(total - amount_paid) as due')
            ->whereIn('customer_id', array_keys($watch))
            ->where('status', Receipt::STATUS_COMPLETED)
            ->whereColumn('amount_paid', '<', 'total')
            ->groupBy('customer_id')
            ->pluck('due', 'customer_id');

        $names = Customer::whereIn('id', array_keys($watch))->pluck('name', 'id');

        $rows = [];
        foreach ($watch as $customerId => $w) {
            $due = (int) ($dueByCustomer[$customerId] ?? 0);
            if ($due <= 0) {
                continue; // ✅ soldé entre-temps : pas de rappel
            }
            $rows[] = [
                'customer' => (string) ($names[$customerId] ?? "Client #{$customerId}"),
                'date' => Carbon::parse($w['date'])->format('d/m/Y'),
                'late_days' => $w['late_days'],
                'due' => $due,
            ];
        }

        // Retards d'abord (du plus ancien), puis rappels J−1
        usort($rows, fn ($a, $b) => [$b['late_days'], $b['due']] <=> [$a['late_days'], $a['due']]);

        return array_slice($rows, 0, 15);
    }
}
