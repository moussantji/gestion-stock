<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'reference', 'plan_id', 'plan_name', 'amount',
        'buyer_name', 'buyer_email', 'buyer_phone',
        'payment_method', 'status', 'notes', 'paid_at',
    ];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime'];
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function license()
    {
        return $this->hasOne(License::class);
    }

    /** Référence unique type CMD-2026-A4F8K2 */
    public static function generateReference(): string
    {
        do {
            $ref = 'CMD-' . now()->format('Y') . '-' . strtoupper(Str::random(6));
        } while (static::where('reference', $ref)->exists());

        return $ref;
    }

    public function getFormattedAmountAttribute(): string
    {
        return number_format($this->amount, 0, ',', ' ') . ' FCFA';
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
