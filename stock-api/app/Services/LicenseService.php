<?php

namespace App\Services;

use App\Mail\ClientAccountDelivered;
use App\Mail\SubscriptionActive;
use App\Mail\SubscriptionExtended;
use App\Models\License;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * 👤 v2.14 — Abonnement = COMPTE CLIENT (plus de clé à copier-coller).
 *
 * fulfillOrder() est LA source de vérité, utilisée par le panneau admin web ET
 * l'admin mobile :
 *  • RENOUVELLEMENT (même email) → prolongation de l'abonnement existant
 *    (base = max(maintenant, fin actuelle), formule/prix mis à jour) ;
 *  • sinon → nouvel abonnement (formule, prix, dates — la licence garde une
 *    clé interne en base pour l'intégrité de la colonne, jamais affichée) ;
 *  • compte client (users.role = 'client', 0 migration) créé si absent —
 *    mot de passe généré, renvoyé EN CLAIR une seule fois (email + réponse
 *    admin pour le partage WhatsApp) ;
 *  • emails de notification best-effort (n'échouent jamais la validation).
 */
class LicenseService
{
    /**
     * @return array{license: License, account: User|null, password: string|null, extended: bool, note: string|null}
     */
    public static function fulfillOrder(Order $order): array
    {
        $result = DB::transaction(function () use ($order) {
            $order->update([
                'status' => Order::STATUS_PAID,
                'paid_at' => now(),
            ]);

            $days = $order->plan?->duration_days ?? 30;

            // 🔁 RENOUVELLEMENT : même email → prolongation de l'abonnement existant
            $existing = License::where('buyer_email', $order->buyer_email)
                ->where('status', License::STATUS_ACTIVE)
                ->orderByDesc('expires_at')
                ->first();

            $extended = false;
            if ($existing) {
                $base = $existing->expires_at->isPast() ? now() : $existing->expires_at; // expiré → repart d'aujourd'hui
                $existing->update([
                    'order_id' => $order->id,
                    'buyer_name' => $order->buyer_name,
                    'plan_name' => $order->plan_name,
                    'price' => $order->amount,
                    'expires_at' => $base->copy()->addDays($days),
                ]);
                $license = $existing;
                $extended = true;
            } else {
                $license = License::create([
                    'key' => License::generateKey(), // interne — jamais affichée (v2.14)
                    'order_id' => $order->id,
                    'buyer_name' => $order->buyer_name,
                    'buyer_email' => $order->buyer_email,
                    'plan_name' => $order->plan_name,
                    'price' => $order->amount,
                    'starts_at' => now(),
                    'expires_at' => now()->addDays($days),
                ]);
            }

            // 👤 COMPTE CLIENT (role 'client', hors rôles staff)
            $account = null;
            $password = null;
            $note = null;
            $existingUser = User::where('email', $order->buyer_email)->first();
            if ($existingUser && ! $existingUser->isClient()) {
                // Email déjà pris par un compte STAFF : on ne touche à rien (conflit signalé)
                $note = 'email_conflict';
            } elseif ($existingUser) {
                $account = $existingUser; // renouvellement : mot de passe inchangé
            } else {
                $password = self::generatePassword();
                $account = User::create([
                    'name' => $order->buyer_name,
                    'email' => $order->buyer_email,
                    'password' => $password, // cast 'hashed' du modèle
                    'role' => User::ROLE_CLIENT,
                ]);
            }

            return [
                'license' => $license,
                'account' => $account,
                'password' => $password,
                'extended' => $extended,
                'note' => $note,
            ];
        });

        // 📧 Emails — un échec d'envoi ne bloque jamais la validation
        try {
            $license = $result['license'];
            if ($result['password'] && $result['account']) {
                Mail::to($license->buyer_email)->send(new ClientAccountDelivered($license, $result['password']));
            } elseif ($result['extended']) {
                Mail::to($license->buyer_email)->send(new SubscriptionExtended($license));
            } elseif ($result['account']) {
                Mail::to($license->buyer_email)->send(new SubscriptionActive($license));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $result;
    }

    /** Compat : ancien point d'entrée (retourne simplement la licence). */
    public static function generateForOrder(Order $order): License
    {
        return self::fulfillOrder($order)['license'];
    }

    /**
     * 👤 v2.14 — Abonnement courant d'un email de compte client (pour login/me
     * des apps + callback Google). Révoqués ignorés. null = pas d'abonnement actif.
     *
     * @return array{plan_name:string, expires_at:string, state:array{code:string, days_left:int|null, grace_left:int|null}}|null
     */
    public static function clientSubscription(string $email): ?array
    {
        $license = License::where('buyer_email', $email)
            ->where('status', License::STATUS_ACTIVE)
            ->orderByDesc('expires_at')
            ->first();

        if (! $license) {
            return null;
        }

        return [
            'plan_name' => $license->plan_name,
            'expires_at' => $license->expires_at->toDateTimeString(),
            'state' => $license->subscriptionState(), // active | expiring | grace | expired
        ];
    }

    /** Mot de passe lisible (alphabet sans ambiguïté : pas de 0/O/1/l) — format xxxxx-xxxxx. */
    public static function generatePassword(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        $one = fn (int $n) => collect(range(1, $n))->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode('');

        return $one(5).'-'.$one(5);
    }

    /**
     * 🔑↻ Régénère le mot de passe d'un compte client (perdu, partagé trop tôt…).
     *
     * @return string|null le nouveau mot de passe en clair (1×) — null si pas de compte client
     */
    public static function resetClientPassword(License $license): ?string
    {
        $account = User::where('email', $license->buyer_email)->first();
        if (! $account || ! $account->isClient()) {
            return null;
        }

        $password = self::generatePassword();
        $account->update(['password' => $password]);

        try {
            Mail::to($license->buyer_email)->send(new ClientAccountDelivered($license, $password));
        } catch (\Throwable $e) {
            report($e);
        }

        return $password;
    }
}
