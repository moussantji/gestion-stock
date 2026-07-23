<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 💵 Clôture journalière de caisse (Z). */
class CashClosing extends Model
{
    protected $fillable = [
        'closing_date', 'total_in', 'total_out', 'sales_collected', 'balance', 'notes', 'user_id',
        'shop_id', // 🏬 Z propre à une boutique (multi-boutiques)
    ];

    protected function casts(): array
    {
        return [
            'closing_date' => 'date',
            'total_in' => 'integer',
            'total_out' => 'integer',
            'sales_collected' => 'integer',
            'balance' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** 🏬 Boutique du Z (null = siège) — utilisé par l'export comptable v1.6 */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }
}
