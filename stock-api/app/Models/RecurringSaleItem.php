<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 🔁 Ligne d'un abonnement (produit + quantité à chaque échéance). */
class RecurringSaleItem extends Model
{
    protected $fillable = ['recurring_sale_id', 'product_id', 'quantity', 'unit_price'];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'unit_price' => 'integer'];
    }

    public function recurringSale()
    {
        return $this->belongsTo(RecurringSale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
