<?php

namespace App\Console\Commands;

use App\Mail\LicenseExpiring;
use App\Models\License;
use App\Services\PushService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Rappels d'expiration de licence envoyés aux clients à J-7, J-3 et J-1.
 * Planifié chaque jour à 09:00 (voir routes/console.php).
 */
class SendLicenseReminders extends Command
{
    protected $signature = 'licenses:remind';
    protected $description = 'Envoie les rappels d\'expiration de licence (J-7, J-3, J-1).';

    public function handle(): int
    {
        $sent = 0;
        $summary = []; // licences par horizon (pour le push admin)

        foreach ([7, 3, 1] as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            $licenses = License::valid()
                ->whereDate('expires_at', $targetDate)
                ->get();

            foreach ($licenses as $license) {
                try {
                    Mail::to($license->buyer_email)->send(new LicenseExpiring($license, $days));
                    $sent++;
                    $summary[$days][] = $license;
                    $this->info("📧 Rappel J-{$days} envoyé à {$license->buyer_email} ({$license->plan_name})");
                } catch (\Throwable $e) {
                    $this->error("Échec pour {$license->buyer_email} : {$e->getMessage()}");
                    report($e);
                }
            }
        }

        // 🔔 Push distante récapitulative vers les téléphones des admins (best-effort)
        if ($sent > 0) {
            $parts = [];
            foreach ($summary as $days => $licenses) {
                $parts[] = count($licenses) . ' à J-' . $days;
            }
            $pushed = PushService::sendToAdmins(
                '⌛ Licences bientôt expirées',
                $sent . ' client(s) à recontacter : ' . implode(' · ', $parts) . '. Pensez au renouvellement !',
                ['type' => 'licenses_reminder', 'sent' => $sent]
            );
            $this->info("🔔 Push envoyée à {$pushed} téléphone(s) admin.");
        }

        $this->info("✅ {$sent} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }
}
