<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * 🏢 Locataire (entreprise abonnée). Frontière d'isolation des données.
 */
class Company extends Model
{
    protected $fillable = ['name', 'owner_email', 'phone', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

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
