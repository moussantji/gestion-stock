<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockMovementRequest;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementController extends Controller
{
    /**
     * GET /api/movements?type=in|out&product_id=&date_from=&date_to=&per_page=
     */
    public function index(Request $request)
    {
        $query = StockMovement::with([
            'product:id,name,sku,quantity,alert_threshold',
            'user:id,name',
        ])->latest();

        \App\Support\ShopScope::apply($query, $request); // 🏬 multi-boutiques

        if ($request->filled('type') && in_array($request->query('type'), ['in', 'out', 'transfer_in', 'transfer_out'], true)) {
            $query->where('type', $request->query('type')); // 🔁 v13 : types transfert filtrables
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    /**
     * POST /api/movements
     * - Enregistre une entrée/sortie et met à jour le stock en transaction.
     * - Idempotent grâce à `client_uuid` (mode hors ligne de l'app) :
     *   rejouer la même requête ne crée pas de doublon.
     */
    public function store(StoreStockMovementRequest $request)
    {
        $data = $request->validated();

        // Idempotence : mouvement déjà synchronisé ?
        if (! empty($data['client_uuid'])) {
            $existing = StockMovement::where('client_uuid', $data['client_uuid'])
                ->with(['product:id,name,sku,quantity', 'user:id,name'])
                ->first();

            if ($existing) {
                return response()->json(['data' => $existing, 'duplicate' => true]);
            }
        }

        $movement = DB::transaction(function () use ($data, $request) {
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            $shopId = \App\Support\ShopScope::currentShopId($request); // 🏬 emplacement du mouvement

            // 🏬📦 v13 : vérifie le stock DE L'EMPLACEMENT (boutique / siège)
            if ($data['type'] === StockMovement::TYPE_OUT) {
                \App\Support\ShopStock::assertAvailable($product, $shopId, $data['quantity']);
            }

            // Bucket boutique si rattaché à une boutique, sinon siège (= reste du global)
            if ($shopId !== null) {
                \App\Support\ShopStock::addDelta(
                    $product,
                    $shopId,
                    $data['type'] === StockMovement::TYPE_IN ? $data['quantity'] : -$data['quantity']
                );
            }

            $product->quantity += $data['type'] === StockMovement::TYPE_IN
                ? $data['quantity']
                : -$data['quantity'];
            $product->save();

            return $product->movements()->create([
                'user_id' => $request->user()->id,
                'type' => $data['type'],
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'] ?? null,
                'reason' => $data['reason'] ?? null,
                'reference' => $data['reference'] ?? null,
                'client_uuid' => $data['client_uuid'] ?? null,
                'shop_id' => $shopId, // 🏬
            ]);
        });

        return response()->json(
            ['data' => $movement->load(['product:id,name,sku,quantity', 'user:id,name'])],
            201
        );
    }

    public function show(StockMovement $movement)
    {
        return response()->json([
            'data' => $movement->load(['product:id,name,sku', 'user:id,name']),
        ]);
    }

    /**
     * DELETE /api/movements/{movement}  (admin/manager)
     * Supprime le mouvement ET inverse son effet sur le stock.
     */
    public function destroy(StockMovement $movement)
    {
        DB::transaction(function () use ($movement) {
            $product = Product::whereKey($movement->product_id)->lockForUpdate()->first();

            if ($product) {
                if ($movement->type === StockMovement::TYPE_IN) {
                    $product->quantity = max(0, $product->quantity - $movement->quantity);
                } else {
                    $product->quantity += $movement->quantity;
                }
                $product->save();
            }

            $movement->delete();
        });

        return response()->json(['message' => 'Mouvement annulé, stock réajusté.']);
    }
}
