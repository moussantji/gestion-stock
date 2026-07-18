<?php

namespace App\Console\Commands;

use App\Models\PushToken;
use App\Models\RecurringSale;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Console\Command;

/**
 * 🔁 Génère les ventes des abonnements arrivés à échéance (cron 06:30).
 * Chaque vente passe à crédit du client ; un récap push part aux admins/managers.
 */
class ProcessRecurringSales extends Command
{
    protected $signature = 'stock:process-recurring-sales';

    protected $description = 'Génère les ventes des abonnements échus + push récap';

    public function handle(): int
    {
        $due = RecurringSale::with(['customer:id,name', 'items'])
            ->where('status', RecurringSale::STATUS_ACTIVE)
            ->where('next_run_at', '<=', now())
            ->orderBy('next_run_at')
            ->get();

        if ($due->isEmpty()) {
            $this->info('Aucun abonnement à exécuter.');
            return self::SUCCESS;
        }

        $ok = 0;
        $total = 0;
        $failed = [];

        foreach ($due as $sale) {
            try {
                $receipt = $sale->generate();
                $ok++;
                $total += (int) $receipt->total;
            } catch (\Throwable $e) {
                // Stock insuffisant ou autre → on signale sans bloquer les autres
                $failed[] = $sale->customer?->name ?? "#{$sale->id}";
                report($e);
                $this->warn("Échec abonnement #{$sale->id} : {$e->getMessage()}");
            }
        }

        if ($ok > 0 || $failed !== []) {
            $title = "🔁 Abonnements : {$ok} vente(s) générée(s)";
            $body = 'Total passé à crédit : ' . number_format($total, 0, ',', ' ') . ' FCFA';
            if ($failed !== []) {
                $body .= ' · ⚠️ Échecs (stock ?) : ' . implode(', ', array_slice($failed, 0, 3));
            }

            $tokens = PushToken::whereIn(
                'user_id',
                User::whereIn('role', ['admin', 'manager'])->pluck('id')
            )->pluck('token')->all();

            $sent = PushService::send($tokens, $title, $body, ['type' => 'recurring_sales']);
            $this->info("{$ok} vente(s) générée(s), " . count($failed) . " échec(s), push → {$sent} appareil(s).");
        }

        return self::SUCCESS;
    }
}
