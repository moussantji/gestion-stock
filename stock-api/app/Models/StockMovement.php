<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use BelongsToCompany;
    use HasFactory;

    public const TYPE_IN = 'in';

    public const TYPE_OUT = 'out';

    public const TYPE_TRANSFER_OUT = 'transfer_out'; // 🔁 départ vers un autre emplacement

    public const TYPE_TRANSFER_IN = 'transfer_in';   // 🔁 arrivée depuis un autre emplacement

    protected $fillable = [
        'client_uuid',
        'product_id',
        'user_id',
        'type',
        'quantity',
        'unit_price',
        'reason',
        'reference',
        'shop_id', // 🏬 boutique concernée (multi-boutiques)
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
