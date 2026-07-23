<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\RecurringSale;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * 🔁 Ventes récurrentes / abonnements clients.
 * La vente générée à chaque échéance passe À CRÉDIT du client
 * (relancée automatiquement par les rappels de crédits). Admin/manager.
 */
class RecurringSaleController extends Controller
{
    /** GET /api/recurring-sales — abonnements (100 derniers) */
    public function index()
    {
        $sales = RecurringSale::with([
            'customer:id,name,phone',
            'user:id,name',
            'items.product:id,name,sale_price',
        ])->latest()->limit(100)->get();

        return response()->json(['data' => $sales]);
    }

    /** POST /api/recurring-sales — créer un abonnement */
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'label' => ['nullable', 'string', 'max:120'],
            'frequency' => ['required', Rule::in([RecurringSale::FREQ_WEEKLY, RecurringSale::FREQ_MONTHLY])],
            'next_run_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99999'],
            'items.*.unit_price' => ['nullable', 'integer', 'min:0', 'max:999999999'],
        ], [
            'items.required' => 'Ajoute au moins un produit.',
            'items.*.product_id.distinct' => 'Un même produit apparaît deux fois.',
        ]);

        $products = Product::whereIn('id', collect($data['items'])->pluck('product_id'))
            ->get()->keyBy('id');

        $sale = RecurringSale::create([
            'customer_id' => $data['customer_id'],
            'user_id' => $request->user()->id,
            'shop_id' => \App\Support\ShopScope::currentShopId($request), // 🏬
            'label' => $data['label'] ?? null,
            'frequency' => $data['frequency'],
            'next_run_at' => ! empty($data['next_run_at'])
                ? \Carbon\Carbon::parse($data['next_run_at'])->startOfDay()
                : now(),
            'status' => RecurringSale::STATUS_ACTIVE,
            'notes' => $data['notes'] ?? null,
        ]);

        foreach ($data['items'] as $line) {
            $sale->items()->create([
                'product_id' => $line['product_id'],
                'quantity' => $line['quantity'],
                // Prix figé au moment de la création (défaut : prix de vente actuel)
                'unit_price' => isset($line['unit_price'])
                    ? (int) $line['unit_price']
                    : (int) ($products[$line['product_id']]->sale_price ?? 0),
            ]);
        }

        return response()->json([
            'data' => $sale->load(['customer:id,name,phone', 'items.product:id,name,sale_price']),
        ], 201);
    }

    /** PUT /api/recurring-sales/{recurringSale} — fréquence, échéance, pause/reprise */
    public function update(Request $request, RecurringSale $recurringSale)
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:120'],
            'frequency' => ['nullable', Rule::in([RecurringSale::FREQ_WEEKLY, RecurringSale::FREQ_MONTHLY])],
            'next_run_at' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in([RecurringSale::STATUS_ACTIVE, RecurringSale::STATUS_PAUSED])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($data['next_run_at'])) {
            $data['next_run_at'] = \Carbon\Carbon::parse($data['next_run_at'])->startOfDay();
        }

        $recurringSale->update(collect($data)->filter(fn ($v) => ! is_null($v))->all());

        return response()->json([
            'data' => $recurringSale->fresh()->load(['customer:id,name,phone', 'items.product:id,name,sale_price']),
        ]);
    }

    /** POST /api/recurring-sales/{recurringSale}/run — ⚡ générer la vente tout de suite */
    public function runNow(Request $request, RecurringSale $recurringSale)
    {
        $receipt = $recurringSale->generate($request->user()->id);

        return response()->json([
            'data' => $receipt->load('items'),
            'sale' => $recurringSale->fresh()->load(['customer:id,name,phone', 'items.product:id,name,sale_price']),
        ], 201);
    }

    /** DELETE /api/recurring-sales/{recurringSale} — stoppe définitivement l'abonnement */
    public function destroy(RecurringSale $recurringSale)
    {
        $recurringSale->delete(); // les ventes déjà générées restent intactes

        return response()->json(['deleted' => true]);
    }
}
