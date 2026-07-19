<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\PushToken;
use App\Models\Receipt;
use App\Models\User;
use App\Services\PushService;
use App\Support\Setting;
use Illuminate\Console\Command;

/** 📅 Rappel push : crédits clients non soldés depuis plus de N jours (par entreprise). */
class SendCreditReminders extends Command
{
    protected $signature = 'credits:remind {--days= : Ancienneté minimale du crédit en jours (défaut : réglage boutique)}';

    protected $description = 'Push admins + managers : crédits anciens non soldés';

    public function handle(): int
    {
        $optDays = $this->option('days');

        Company::runForEach(function (Company $company) use ($optDays) {
            // 🎯 Seuil : option CLI prioritaire, sinon réglage de CETTE entreprise (défaut 7)
            $days = (int) ($optDays ?: Setting::get('credit_reminder_days', 7));
            $limit = now()->subDays($days);

            $oldCredits = Receipt::with(['customer:id,name'])
                ->where('status', Receipt::STATUS_COMPLETED)
                ->whereColumn('amount_paid', '<', 'total')
                ->where('created_at', '<=', $limit)
                ->oldest()
                ->get();

            if ($oldCredits->isEmpty()) {
                return;
            }

            $due = (int) $oldCredits->sum(fn (Receipt $r) => $r->remaining);
            $count = $oldCredits->count();
            $names = $oldCredits->take(3)
                ->map(fn (Receipt $r) => $r->customer?->name ?? $r->client_name ?? $r->number)
                ->implode(', ');

            $title = "💳 {$count} crédit(s) de +{$days} jours";
            $body = 'Encours ancien : '.number_format($due, 0, ',', ' ')." FCFA — à relancer : {$names}"
                .($count > 3 ? '…' : '');

            $tokens = PushToken::whereIn(
                'user_id',
                User::where('company_id', $company->id)->whereIn('role', ['admin', 'manager'])->pluck('id')
            )->pluck('token')->all();

            $sent = PushService::send($tokens, $title, $body, ['type' => 'credit_reminder']);

            $this->info("[{$company->name}] rappel crédit → {$sent} appareil(s), {$count} crédit(s) anciens.");
        });

        return self::SUCCESS;
    }
}
