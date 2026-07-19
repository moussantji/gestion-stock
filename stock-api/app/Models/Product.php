<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'supplier_id',
        'name',
        'sku',
        'barcode',
        'image_path',
        'description',
        'purchase_price',
        'sale_price',
        'wholesale_price', // 👥 prix de gros (clients « gros »)
        'quantity',
        'alert_threshold',
    ];

    protected $hidden = ['image_path'];

    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'quantity' => 'integer',
            'alert_threshold' => 'integer',
        ];
    }

    protected $appends = ['is_low_stock', 'stock_value', 'image_url'];

    // ---------- Relations ----------

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class)->latest();
    }

    /** 🏬📦 Buckets de stock par boutique (v13) */
    public function shopStocks()
    {
        return $this->hasMany(ProductShopStock::class);
    }

    // ---------- Scopes ----------

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('sku', 'like', "%{$term}%")
                ->orWhere('barcode', 'like', "%{$term}%");
        });
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'alert_threshold');
    }

    // ---------- Attributs calculés ----------

    public function getIsLowStockAttribute(): bool
    {
        return $this->quantity <= $this->alert_threshold;
    }

    public function getStockValueAttribute(): float
    {
        return round($this->quantity * (float) $this->purchase_price, 2);
    }

    /**
     * URL publique de la photo (stockage Laravel `public` disk).
     * ⚠️ Nécessite : php artisan storage:link  +  APP_URL correct dans .env
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/'.$this->image_path) : null;
    }
}
