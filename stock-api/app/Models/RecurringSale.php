<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use App\Support\ShopStock;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * 🔁 Vente récurrente / abonnement client.
 * À chaque échéance : génère automatiquement une vente À CRÉDIT
 * (reçu completed + source 'recurring', amount_paid = 0).
 */
class RecurringSale extends Model
{
    use BelongsToCompany;

    public const FREQ_WEEKLY = 'weekly';

    public const FREQ_MONTHLY = 'monthly';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAUSED = 'paused';

    protected $fillable = [
        'customer_id', 'user_id', 'shop_id', 'label', 'frequency',
        'next_run_at', 'last_run_at', 'status', 'notes',
    ];

    protected $appends = ['total'];

    protected function casts(): array
    {
        return [
            'next_run_at' => 'datetime',
            'last_run_at' => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(RecurringSaleItem::class);
    }

    /** Total d'une exécution (somme des lignes). */
    public function getTotalAttribute(): int
    {
        return (int) $this->items->sum(fn (RecurringSaleItem $i) => $i->quantity * $i->unit_price);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** Avance l'échéance d'une période (rattrape les retards éventuels). */
    public function advance(): void
    {
        $next = ($this->next_run_at ?? now())->copy();

        do {
            $next = $this->frequency === self::FREQ_MONTHLY
                ? $next->copy()->addMonth()
                : $next->copy()->addWeek();
        } while ($next->lte(now()));

        $this->update(['next_run_at' => $next]);
    }

    /**
     * ⚡ Génère la vente de l'échéance courante puis avance.
     * - idempotent via `client_uuid` (rec-{id}-{date})
     * - à crédit : le client paiera via les versements habituels
     * - lève ValidationException si le stock est insuffisant
     */
    public function generate(?int $userId = null): Receipt
    {
        $uuid = 'rec-'.$this->id.'-'.($this->next_run_at ?? now())->format('Ymd');

        $existing = Receipt::where('client_uuid', $uuid)->first();
        if ($existing) {
            $this->advance();

            return $existing; // déjà générée pour cette échéance
        }

        return DB::transaction(function () use ($userId, $uuid) {
            $userId ??= $this->user_id;
            $customer = $this->customer;

            $receipt = Receipt::create([
                'number' => Receipt::generateNumber(),
                'client_uuid' => $uuid,
                'user_id' => $userId,
                'customer_id' => $customer->id,
                'client_name' => $customer->name,
                'client_phone' => $customer->phone,
                'total' => 0,
                'amount_paid' => 0, // 💳 vente à crédit — rappelée par credits:remind
                'source' => 'recurring',
                'shop_id' => $this->shop_id, // 🏬 vente rattachée à la boutique de l'abonnement
            ]);

            $total = 0;

            foreach ($this->items()->with('product')->get() as $line) {
                $product = Product::whereKey($line->product_id)->lockForUpdate()->firstOrFail();

                // 🏬📦 v13 : vérifie le stock DE L'EMPLACEMENT de l'abonnement
                try {
                    ShopStock::assertAvailable($product, $this->shop_id, $line->quantity);
                } catch (ValidationException $e) {
                    throw ValidationException::withMessages([
                        'items' => ["Stock insuffisant pour « {$product->name} » — abonnement #{$this->id}."],
                    ]);
                }

                $unitPrice = (int) $line->unit_price;
                $subtotal = $unitPrice * $line->quantity;

                $product->movements()->create([
                    'user_id' => $userId,
                    'type' => StockMovement::TYPE_OUT,
                    'quantity' => $line->quantity,
                    'unit_price' => $unitPrice,
                    'reason' => 'Abonnement',
                    'reference' => $receipt->number,
                    'shop_id' => $this->shop_id, // 🏬 (tagué aussi en v13)
                ]);
                ShopStock::addDelta($product, $this->shop_id, -$line->quantity);

                $receipt->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $line->quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;
            }

            $receipt->update(['total' => $total]);

            $this->update(['last_run_at' => now()]);
            $this->advance();

            return $receipt;
        });
    }
}
