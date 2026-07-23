<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** 🔄 Session d'inventaire physique (statut in_progress | validated). */
class Inventory extends Model
{
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_VALIDATED = 'validated';

    protected $fillable = ['reference', 'name', 'status', 'user_id', 'validated_at', 'shop_id'];

    protected function casts(): array
    {
        return ['validated_at' => 'datetime'];
    }

    public function items()
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /** Référence unique type INV-2026-XXXXXX */
    public static function generateReference(): string
    {
        do {
            $reference = 'INV-' . now()->format('Y') . '-' . strtoupper(Str::random(6));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }
}
