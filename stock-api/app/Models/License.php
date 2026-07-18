<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class License extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'key', 'order_id', 'buyer_name', 'buyer_email',
        'plan_name', 'price', 'starts_at', 'expires_at', 'status',
    ];

    // 👤 v2.14 : la clé reste en base (colonne NOT NULL + unique) mais ne sort JAMAIS en JSON.
    protected $hidden = ['key'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    protected $appends = ['effective_status'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /** active | expired | revoked (état réel calculé) */
    public function getEffectiveStatusAttribute(): string
    {
        if ($this->status === self::STATUS_REVOKED) {
            return 'revoked';
        }

        return $this->expires_at->isPast() ? 'expired' : 'active';
    }

    public function isValid(): bool
    {
        return $this->getEffectiveStatusAttribute() === 'active';
    }

    // ---------- 👤 v2.14 : état d'abonnement lisible (comptes clients) ----------

    /** Jours d'avertissement avant expiration (« expire bientôt ») et de grâce après. */
    public const EXPIRING_SOON_DAYS = 7;
    public const GRACE_DAYS = 3;

    /**
     * État d'abonnement calculé pour le portail client.
     * @return array{code:string, days_left:int|null, grace_left:int|null}
     *   code ∈ active | expiring (≤ 7 j) | grace (expiré ≤ 3 j) | expired | revoked
     */
    public function subscriptionState(): array
    {
        if ($this->status === self::STATUS_REVOKED) {
            return ['code' => 'revoked', 'days_left' => null, 'grace_left' => null];
        }

        $seconds = $this->expires_at->getTimestamp() - now()->getTimestamp();
        $daysLeft = (int) max(0, (int) floor($seconds / 86400)); // jours ENTIERS restants

        if ($seconds > 0) {
            return [
                'code' => $daysLeft <= self::EXPIRING_SOON_DAYS ? 'expiring' : 'active',
                'days_left' => $daysLeft,
                'grace_left' => null,
            ];
        }

        $graceLeft = self::GRACE_DAYS + (int) ceil($seconds / 86400); // seconds < 0 → décompte de grâce
        if ($graceLeft > 0) {
            return ['code' => 'grace', 'days_left' => 0, 'grace_left' => $graceLeft];
        }

        return ['code' => 'expired', 'days_left' => 0, 'grace_left' => 0];
    }

    public function scopeValid($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)->where('expires_at', '>', now());
    }

    /** Clé type SF-XXXX-XXXX-XXXX */
    public static function generateKey(): string
    {
        do {
            $key = 'SF-'
                . strtoupper(Str::random(4)) . '-'
                . strtoupper(Str::random(4)) . '-'
                . strtoupper(Str::random(4));
        } while (static::where('key', $key)->exists());

        return $key;
    }
}
