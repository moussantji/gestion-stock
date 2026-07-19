<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** 🔄 Une ligne d'inventaire : stock système (expected) vs comptage réel (counted). */
class InventoryItem extends Model
{
    use BelongsToCompany;

    protected $fillable = ['inventory_id', 'product_id', 'expected_quantity', 'counted_quantity'];

    protected $appends = ['difference'];

    protected function casts(): array
    {
        return [
            'expected_quantity' => 'integer',
            'counted_quantity' => 'integer',
        ];
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /** Écart (null tant que la ligne n'est pas comptée) */
    public function getDifferenceAttribute(): ?int
    {
        if ($this->counted_quantity === null) {
            return null;
        }

        return (int) $this->counted_quantity - (int) $this->expected_quantity;
    }
}
