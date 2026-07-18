<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'subtotal',
        'received_qty', // 🧾 déjà réceptionné (réception partielle)
    ];

    protected $appends = ['remaining_qty'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
            'received_qty' => 'integer',
        ];
    }

    /** 🧾 Reste à réceptionner sur cette ligne */
    public function getRemainingQtyAttribute(): int
    {
        return max(0, (int) $this->quantity - (int) $this->received_qty);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
