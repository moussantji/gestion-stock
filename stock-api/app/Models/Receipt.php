<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Receipt extends Model
{
    use HasFactory;

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'number', 'client_uuid', 'user_id', 'customer_id', 'client_name', 'client_phone',
        'total', 'amount_paid', 'points_discount', 'points_redeemed',
        'status', 'refunded_at', 'refund_reason', 'refunded_by',
        'source', // 🔁 'recurring' = générée par un abonnement
        'shop_id', // 🏬 boutique de la vente (multi-boutiques)
    ];

    // 💳 Toujours exposés à l'app (badge « Payé / Crédit »)
    protected $appends = ['remaining', 'payment_status'];

    protected function casts(): array
    {
        return ['total' => 'integer', 'amount_paid' => 'integer', 'refunded_at' => 'datetime'];
    }

    public function items()
    {
        return $this->hasMany(ReceiptItem::class);
    }

    public function payments()
    {
        return $this->hasMany(ReceiptPayment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function refundedBy()
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }

    /** 🏬 Boutique de la vente (multi-boutiques) */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /** 🎁 Mouvements de points liés à cette vente */
    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }

    public function isRefunded(): bool
    {
        return $this->status === self::STATUS_REFUNDED;
    }

    /** 💳 Reste à payer (crédit client) — net de la remise fidélité */
    public function getRemainingAttribute(): int
    {
        return max(0, (int) $this->total - (int) $this->points_discount - (int) $this->amount_paid);
    }

    /** paid | partial | unpaid (au regard du total NET de remise) */
    public function getPaymentStatusAttribute(): string
    {
        $due = max(0, (int) $this->total - (int) $this->points_discount);
        if ($this->amount_paid >= $due && $due > 0) {
            return 'paid';
        }

        return $this->amount_paid > 0 ? 'partial' : 'unpaid';
    }

    /** Numéro unique type R-2026-A4F8K2 */
    public static function generateNumber(): string
    {
        do {
            $number = 'R-'.now()->format('Y').'-'.strtoupper(Str::random(6));
        } while (static::where('number', $number)->exists());

        return $number;
    }

    public function getFormattedTotalAttribute(): string
    {
        return number_format($this->total, 0, ',', ' ').' FCFA';
    }
}
