<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_EMPLOYEE = 'employee';

    public const ROLE_CLIENT = 'client'; // 👤 v2.14 : compte client du portail (créé/mis à jour par LicenseService — JAMAIS dans les écrans staff)

    public const ROLES = [self::ROLE_ADMIN, self::ROLE_MANAGER, self::ROLE_EMPLOYEE];

    /** Rôles assignables manuellement depuis l'admin web (client = accès au portail /compte) */
    public const ASSIGNABLE_ROLES = [self::ROLE_ADMIN, self::ROLE_MANAGER, self::ROLE_EMPLOYEE, self::ROLE_CLIENT];

    /** Libellés lisibles des rôles */
    public const ROLE_LABELS = [
        self::ROLE_ADMIN => 'Administrateur',
        self::ROLE_MANAGER => 'Gestionnaire',
        self::ROLE_EMPLOYEE => 'Employé',
        self::ROLE_CLIENT => 'Client',
    ];

    protected $fillable = ['name', 'email', 'password', 'role', 'shop_id', 'company_id'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function pushTokens()
    {
        return $this->hasMany(PushToken::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isManagerOrAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_MANAGER], true);
    }

    /** 👤 v2.14 : compte client du portail (pas un compte staff) */
    public function isClient(): bool
    {
        return $this->role === self::ROLE_CLIENT;
    }

    /** 👤 v2.14 : abonnements du compte client (lien par buyer_email — 0 clé étrangère, 0 migration) */
    public function clientLicenses()
    {
        return $this->hasMany(License::class, 'buyer_email', 'email');
    }

    /** 🏬 Boutique de rattachement (multi-boutiques) */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /** 🏢 Entreprise (locataire) de rattachement. null = super-admin plateforme. */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
