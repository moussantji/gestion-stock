<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * 🎯 Réglages boutique persistants (table `settings`, clé/valeur).
 *
 * Valeurs par défaut si jamais enregistrées — et repli sécurisé
 * si la table n'existe pas encore (avant `php artisan migrate`).
 */
class Setting
{
    /** Clés reconnues + défauts. */
    public const DEFAULTS = [
        'segment_loyal_min' => 5,     // 🏆 ventes min pour le segment « fidèle »
        'segment_inactive_days' => 60, // 💤 jours sans achat → segment « inactif »
        'credit_reminder_days' => 7,   // 📅 ancienneté des crédits rappelés (push 10h)
        'loyalty_earn_per' => 1000,     // 🎁 FCFA encaissés pour gagner 1 point
        'loyalty_point_value' => 10,    // 🎁 valeur d'1 point en remise (FCFA)
        'seller_monthly_target' => 0,   // 🏆 v2.8 : CA mensuel cible par vendeur (0 = désactivé)
        'commission_pct' => 0,          // 👥 v2.9 : commission sur le CA des vendeurs (0 = masqué)
        'cycle_count_daily' => 0,       // 📦 v2.11 : produits/jour en inventaire tournant (0 = désactivé)
    ];

    /** 📧 v2.1 : réglages TEXTUELS (hors bornes numériques) — clé → défaut. */
    public const TEXTS = [
        'boss_email' => '', // email du patron (envoi auto du pack du jour à la clôture)
        'tva_config' => '', // 🧮 v2.9 : JSON multi-TVA (enabled/default_rate/categories/products) — '' = désactivée
        'promo_config' => '', // 🏷️ v2.11 : JSON promos datées {id:{price,from,to}} — '' = aucune promo
        'credit_schedule' => '', // 💳 v2.13 : JSON échéancier {customer_id:['AAAA-MM-JJ',…]} — '' = aucune date planifiée
    ];

    /** Bornes de validation exposées aussi à l'app. */
    public const LIMITS = [
        'segment_loyal_min' => ['min' => 1, 'max' => 100],
        'segment_inactive_days' => ['min' => 7, 'max' => 365],
        'credit_reminder_days' => ['min' => 1, 'max' => 90],
        'loyalty_earn_per' => ['min' => 100, 'max' => 100000],
        'loyalty_point_value' => ['min' => 1, 'max' => 1000],
        'seller_monthly_target' => ['min' => 0, 'max' => 100000000], // 🏆 0 = objectifs masqués
        'commission_pct' => ['min' => 0, 'max' => 50], // 👥 % raisonnable (0 = masqué)
        'cycle_count_daily' => ['min' => 0, 'max' => 50], // 📦 v2.11 : 0 = comptage tournant masqué
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $default ??= self::DEFAULTS[$key] ?? null;

        try {
            $value = Cache::rememberForever(
                "setting:{$key}",
                fn () => DB::table('settings')->where('key', $key)->value('value')
            );
        } catch (\Throwable) {
            return $default; // table absente (avant migration) → défaut
        }

        if ($value === null) {
            return $default;
        }

        return is_numeric($value) ? (int) $value : $value;
    }

    public static function set(string $key, mixed $value): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => $key],
            ['value' => (string) $value, 'updated_at' => now()]
        );
        Cache::forget("setting:{$key}");
    }

    /** 📧 v2.1 : réglage textuel (boss_email…) — chaîne nettoyée, jamais castée en int. */
    public static function getText(string $key): string
    {
        $value = self::get($key, self::TEXTS[$key] ?? '');

        return is_string($value) ? trim($value) : (string) $value;
    }
}
