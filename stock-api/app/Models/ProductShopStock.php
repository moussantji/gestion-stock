<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** 🏬📦 Niveau de stock d'un produit dans une boutique (bucket). */
class ProductShopStock extends Model
{
    use BelongsToCompany;

    protected $fillable = ['product_id', 'shop_id', 'quantity'];

    protected function casts(): array
    {
        return ['quantity' => 'integer'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }
}
