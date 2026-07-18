<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'name', 'icon', 'account', 'instructions', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    /** Étapes d'instructions sous forme de tableau (une ligne = une étape). */
    public function steps(): array
    {
        return collect(preg_split('/\r?\n/', (string) $this->instructions))
            ->map(fn ($l) => trim($l))
            ->filter()
            ->values()
            ->all();
    }
}
