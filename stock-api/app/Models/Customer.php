<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 👥 Fiche client de la boutique (CRM léger). */
class Customer extends Model
{
    protected $fillable = ['name', 'phone', 'email', 'address', 'notes', 'shop_id', 'price_tier', 'loyalty_points'];

    public const TIER_RETAIL = 'retail';      // 👥 client détail (prix normal)

    public const TIER_WHOLESALE = 'wholesale'; // 👥 client de gros (prix préférentiel)

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class)->latest();
    }

    public function receipts()
    {
        return $this->hasMany(Receipt::class);
    }

    /** Reçus encore actifs (hors avoirs) */
    public function activeReceipts()
    {
        return $this->hasMany(Receipt::class)->where('status', Receipt::STATUS_COMPLETED);
    }

    /** Reçus non soldés (crédit en cours) */
    public function credits()
    {
        return $this->activeReceipts()->whereColumn('amount_paid', '<', 'total')->oldest();
    }
}
