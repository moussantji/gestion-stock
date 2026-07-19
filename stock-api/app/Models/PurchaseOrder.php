<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    use BelongsToCompany;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENT = 'sent';

    public const STATUS_PARTIAL = 'partial'; // 🧾 réceptionnée en partie

    public const STATUS_RECEIVED = 'received';

    public const STATUS_CANCELLED = 'cancelled';

    /** Statuts « ouverts » : réception possible (dont partielle) */
    public const OPEN_STATUSES = [self::STATUS_DRAFT, self::STATUS_SENT, self::STATUS_PARTIAL];

    protected $fillable = [
        'number', 'supplier_id', 'user_id', 'shop_id', 'status',
        'total_estimated', 'notes', 'sent_at', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'total_estimated' => 'integer',
            'sent_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    protected $appends = ['items_count'];

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getItemsCountAttribute(): int
    {
        return $this->items_count ?? $this->items()->count();
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    /** Numéro unique type BC-2026-A4F8K2 */
    public static function generateNumber(): string
    {
        do {
            $number = 'BC-'.now()->format('Y').'-'.strtoupper(Str::random(6));
        } while (static::where('number', $number)->exists());

        return $number;
    }
}
