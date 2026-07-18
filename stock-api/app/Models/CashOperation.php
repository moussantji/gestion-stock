<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 💵 Opération manuelle de caisse (entrée ou sortie). */
class CashOperation extends Model
{
    public const TYPE_IN = 'in';
    public const TYPE_OUT = 'out';

    // ⚠️ category + receipt_id : fillable obligatoire (sinon ignorés au create())
    protected $fillable = ['type', 'category', 'amount', 'reason', 'user_id', 'receipt_id', 'shop_id'];

    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** 🏬 Boutique de l'opération (null = siège) — utilisé par l'export comptable v1.6 */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /** ↩️ Reçu remboursé (si l'opération est un remboursement tracé) */
    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }

    public function scopeIn($query)
    {
        return $query->where('type', self::TYPE_IN);
    }

    public function scopeOut($query)
    {
        return $query->where('type', self::TYPE_OUT);
    }
}
