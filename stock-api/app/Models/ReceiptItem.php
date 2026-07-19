<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReceiptItem extends Model
{
    use BelongsToCompany;
    use HasFactory;

    protected $fillable = [
        'receipt_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'subtotal',
    ];

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
