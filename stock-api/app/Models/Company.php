<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

/**
 * 🏢 Locataire (entreprise abonnée). Frontière d'isolation des données.
 */
class Company extends Model
{
    protected $fillable = ['name', 'owner_email', 'phone', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    /**
     * 🔁 Exécute un traitement POUR CHAQUE entreprise active, dans son contexte
     * (admin connecté → global scope + auto-remplissage company_id actifs).
     * Utilisé par les commandes planifiées (qui, sinon, tournent globalement).
     *
     * @param  callable(self, User):void  $callback
     */
    public static function runForEach(callable $callback): void
    {
        static::where('is_active', true)->get()->each(function (self $company) use ($callback) {
            $admin = $company->users()->where('role', User::ROLE_ADMIN)->orderBy('id')->first();
            if (! $admin) {
                return; // entreprise sans admin → rien à faire
            }

            Auth::login($admin);
            try {
                $callback($company, $admin);
            } finally {
                Auth::logout();
            }
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class);
    }

    /** Abonnement actif le plus récent de l'entreprise. */
    public function activeLicense()
    {
        return $this->licenses()
            ->where('status', License::STATUS_ACTIVE)
            ->orderByDesc('expires_at')
            ->first();
    }
}
