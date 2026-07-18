<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\ShopStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * 🔄 Inventaires physiques :
 * démarrage (snapshot du stock) → comptage (scan / manuel) → validation
 * (les écarts deviennent des mouvements de stock motivés « Inventaire »).
 */
class InventoryController extends Controller
{
    /** GET /api/inventories — liste (le plus récent d'abord) + flag « un inventaire ouvert ? » */
    public function index()
    {
        $inventories = Inventory::with('user:id,name')
            ->withCount('items as lines_count')
            ->withCount(['items as counted_lines' => fn ($q) => $q->whereNotNull('counted_quantity')])
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $inventories,
            'has_open' => Inventory::where('status', Inventory::STATUS_IN_PROGRESS)->exists(),
        ]);
    }

    /**
     * POST /api/inventories — démarre un inventaire :
     * snapshot de TOUS les produits actifs (expected = stock actuel, counted = null).
     * Un seul inventaire « en cours » autorisé.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            // 📦 v2.11 : inventaire tournant — sous-ensemble explicite de produits.
            // Absent = TOUT le catalogue, exactement comme avant (zéro régression).
            'product_ids' => ['nullable', 'array', 'max:100'],
            'product_ids.*' => ['integer', 'distinct', 'exists:products,id'],
        ]);

        if (Inventory::where('status', Inventory::STATUS_IN_PROGRESS)->exists()) {
            throw ValidationException::withMessages([
                'inventory' => ["Un inventaire est déjà en cours — termine-le (ou supprime-le) d'abord."],
            ]);
        }

        $inventory = DB::transaction(function () use ($data, $request) {
            $inventory = Inventory::create([
                'reference' => Inventory::generateReference(),
                'name' => $data['name'] ?? null,
                'status' => Inventory::STATUS_IN_PROGRESS,
                'user_id' => $request->user()->id,
                'shop_id' => \App\Support\ShopScope::currentShopId($request), // 🏬
            ]);

            // Snapshot de tous les produits (chunk = catalogue volumineux OK)
            // 🏬📦 v13 : expected = stock DE L'EMPLACEMENT de l'inventaire (bucket boutique / siège)
            // 📦 v2.11 : sous-ensemble si product_ids fourni (inventaire tournant)
            $onlyIds = collect($data['product_ids'] ?? [])->map(fn ($i) => (int) $i)->filter()->unique()->values();
            Product::select('id', 'quantity')
                ->when($onlyIds->isNotEmpty(), fn ($q) => $q->whereIn('id', $onlyIds->all()))
                ->chunkById(200, function ($products) use ($inventory) {
                $rows = [];
                foreach ($products as $product) {
                    $rows[] = [
                        'inventory_id' => $inventory->id,
                        'product_id' => $product->id,
                        'expected_quantity' => ShopStock::level($product, $inventory->shop_id),
                        'counted_quantity' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                InventoryItem::insert($rows);
            });

            return $inventory;
        });

        return response()->json([
            'data' => $inventory->loadCount('items as lines_count'),
        ], 201);
    }

    /**
     * GET /api/inventories/{inventory} — détail :
     * lignes (écarts d'abord, puis comptées, puis en attente) + résumé.
     */
    public function show(Inventory $inventory)
    {
        $items = $inventory->items()
            ->with('product:id,name,sku,barcode,image_path')
            ->get()
            ->sort(function (InventoryItem $a, InventoryItem $b) {
                // 1) écarts d'abord (|diff| décroissant) 2) comptés 3) non comptés 4) ordre alpha
                $rank = fn (InventoryItem $i) => $i->counted_quantity === null
                    ? 2
                    : ($i->difference !== 0 ? 0 : 1);
                if ($rank($a) !== $rank($b)) {
                    return $rank($a) <=> $rank($b);
                }
                if ($rank($a) === 0 && abs($a->difference) !== abs($b->difference)) {
                    return abs($b->difference) <=> abs($a->difference);
                }

                return strcasecmp($a->product?->name ?? '', $b->product?->name ?? '');
            })
            ->values();

        return response()->json([
            'inventory' => $inventory->load('user:id,name'),
            'items' => $items,
            'summary' => $this->summary($inventory, $items),
        ]);
    }

    /**
     * POST /api/inventories/{inventory}/count — comptage d'un produit.
     * { barcode | product_id, quantity, mode: 'set' | 'increment' }
     * - set       : counted = quantity
     * - increment : counted = counted ± quantity (corrections au scan : +1 / -1)
     */
    public function count(Request $request, Inventory $inventory)
    {
        if (! $inventory->isOpen()) {
            throw ValidationException::withMessages([
                'inventory' => ['Cet inventaire est déjà validé.'],
            ]);
        }

        $data = $request->validate([
            'barcode' => ['nullable', 'string', 'max:64'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:-99999', 'max:999999'],
            'mode' => ['nullable', 'in:set,increment'],
        ]);

        $product = null;
        if (! empty($data['barcode'])) {
            $product = Product::where('barcode', $data['barcode'])->first();
        } elseif (! empty($data['product_id'])) {
            $product = Product::find($data['product_id']);
        }

        if (! $product) {
            throw ValidationException::withMessages([
                'barcode' => ['Produit introuvable pour ce code / identifiant.'],
            ]);
        }

        $mode = $data['mode'] ?? 'set';

        $item = DB::transaction(function () use ($inventory, $product, $data, $mode) {
            // findOrCreate : produit ajouté APRÈS le démarrage → expected = stock du moment
            $item = InventoryItem::firstOrCreate(
                ['inventory_id' => $inventory->id, 'product_id' => $product->id],
                ['expected_quantity' => ShopStock::level($product, $inventory->shop_id), 'counted_quantity' => null] // 🏬📦
            );

            $item->counted_quantity = $mode === 'increment'
                ? max(0, (int) $item->counted_quantity + (int) $data['quantity'])
                : max(0, (int) $data['quantity']);

            $item->save();

            return $item;
        });

        $item->load('product:id,name,sku,barcode');

        return response()->json(['data' => $item], 200);
    }

    /**
     * POST /api/inventories/{inventory}/finish — valide :
     * chaque ligne comptée avec écart devient un mouvement (motif « Inventaire »)
     * et le stock produit est aligné sur le comptage. Lignes non comptées : inchangées.
     */
    public function finish(Request $request, Inventory $inventory)
    {
        if (! $inventory->isOpen()) {
            throw ValidationException::withMessages([
                'inventory' => ['Cet inventaire est déjà validé.'],
            ]);
        }

        $result = DB::transaction(function () use ($inventory, $request) {
            $adjusted = 0;
            $delta = 0;

            $items = $inventory->items()->whereNotNull('counted_quantity')->get();

            foreach ($items as $item) {
                $diff = (int) $item->counted_quantity - (int) $item->expected_quantity;
                if ($diff === 0) {
                    continue;
                }

                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                if (! $product) {
                    continue; // produit disparu entre-temps
                }

                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => $diff > 0 ? StockMovement::TYPE_IN : StockMovement::TYPE_OUT,
                    'quantity' => abs($diff),
                    'reason' => 'Inventaire',
                    'reference' => $inventory->reference,
                    'shop_id' => $inventory->shop_id, // 🏬
                ]);
                // 🏬📦 v13 : fixe le niveau de L'EMPLACEMENT compté (bucket / siège) + global
                ShopStock::setLevel($product, $inventory->shop_id, (int) $item->counted_quantity);

                $adjusted++;
                $delta += $diff;
            }

            $inventory->update([
                'status' => Inventory::STATUS_VALIDATED,
                'validated_at' => now(),
            ]);

            return ['adjusted' => $adjusted, 'delta' => $delta];
        });

        return response()->json([
            'data' => $inventory->fresh()->load('user:id,name'),
            'summary' => $result,
        ]);
    }

    /** DELETE /api/inventories/{inventory} — uniquement tant qu'il est en cours. */
    public function destroy(Inventory $inventory)
    {
        if (! $inventory->isOpen()) {
            throw ValidationException::withMessages([
                'inventory' => ['Seul un inventaire en cours peut être supprimé.'],
            ]);
        }

        $inventory->delete();

        return response()->json(['deleted' => true]);
    }

    /** Résumé d'un inventaire (comptées / écarts / écart total). */
    private function summary(Inventory $inventory, $items): array
    {
        $counted = $items->whereNotNull('counted_quantity');
        $withDiff = $counted->filter(fn ($i) => $i->difference !== 0);

        return [
            'lines_count' => $items->count(),
            'counted_lines' => $counted->count(),
            'discrepancies' => $withDiff->count(),
            'total_delta' => (int) $counted->sum('difference'),
            'status' => $inventory->status,
        ];
    }
}
