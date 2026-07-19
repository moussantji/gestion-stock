<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * 🔁🚚 Transfert de stock entre deux emplacements (siège <=> boutique).
 *
 * v14 : cycle **en transit → réception validée** :
 * - À l'envoi : stock retiré de la SOURCE (bucket − et global −) → statut `in_transit`.
 * - À la réception (validation) : stock ajouté à la DESTINATION → statut `received`.
 * - Annulation possible tant que `in_transit` → stock retourné à la source.
 * Pendant le transit le stock n'est vendable nulle part.
 */
class StockTransfer extends Model
{
    use BelongsToCompany;

    public const STATUS_IN_TRANSIT = 'in_transit';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'reference', 'from_shop_id', 'to_shop_id', 'user_id', 'note',
        'status', 'sent_at', 'received_at', 'received_by',
    ];

    protected function casts(): array
    {
        return [
            'from_shop_id' => 'integer',
            'to_shop_id' => 'integer',
            'sent_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function items()
    {
        return $this->hasMany(StockTransferItem::class);
    }

    public function fromShop()
    {
        return $this->belongsTo(Shop::class, 'from_shop_id');
    }

    public function toShop()
    {
        return $this->belongsTo(Shop::class, 'to_shop_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /** @var array Champs calculés exposés en JSON */
    protected $appends = ['from_name', 'to_name', 'items_count'];

    public function getFromNameAttribute(): string
    {
        return $this->fromShop->name ?? 'Siège';
    }

    public function getToNameAttribute(): string
    {
        return $this->toShop->name ?? 'Siège';
    }

    public function getItemsCountAttribute(): int
    {
        return (int) ($this->attributes['items_count'] ?? $this->items()->count());
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_IN_TRANSIT;
    }

    /** Référence TR-2026-XXXXXX (même pattern aléatoire que Receipt::generateNumber) */
    public static function generateReference(): string
    {
        do {
            $reference = 'TR-'.now()->format('Y').'-'.strtoupper(Str::random(6));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }
}
