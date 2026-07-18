<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 💳 Un versement (partiel ou total) appliqué à un reçu de vente. */
class ReceiptPayment extends Model
{
    protected $fillable = ['receipt_id', 'user_id', 'amount', 'note'];

    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
