<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** 🎁 Mouvement de points de fidélité (gain / utilisation). */
class LoyaltyTransaction extends Model
{
    use BelongsToCompany;

    public const TYPE_EARN = 'earn';

    public const TYPE_REDEEM = 'redeem';

    public const TYPE_ADJUST = 'adjust';

    protected $fillable = ['customer_id', 'receipt_id', 'user_id', 'points', 'type', 'note'];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
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
