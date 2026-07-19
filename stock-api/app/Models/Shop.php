<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/** 🏬 Boutique physique (multi-boutiques v12 — stock global partagé). */
class Shop extends Model
{
    use BelongsToCompany;

    protected $fillable = ['name', 'phone', 'address', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    /** 🏬📦 Niveaux de stock présents dans cette boutique (v13) */
    public function stocks()
    {
        return $this->hasMany(ProductShopStock::class);
    }

    public function receipts()
    {
        return $this->hasMany(Receipt::class);
    }
}
