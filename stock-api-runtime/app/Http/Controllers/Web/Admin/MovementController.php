<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockMovementRequest;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MovementController extends Controller
{
    public function index(Request $request)
    {
        $movements = StockMovement::with(['product:id,name,sku', 'user:id,name'])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->latest()->paginate(25)->withQueryString();

        return view('admin.movements.index', ['movements' => $movements, 'products' => Product::orderBy('name')->get(['id', 'name'])]);
    }

    public function create()
    {
        return view('admin.movements.form', ['products' => Product::where('quantity', '>', 0)->orWhere('quantity', 0)->orderBy('name')->get(['id', 'name', 'quantity'])]);
    }

    public function store(StoreStockMovementRequest $request)
    {
        $data = $request->validated();
        DB::transaction(function () use ($data, $request) {
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);
            $qty = (int) $data['quantity'];
            if ($data['type'] === StockMovement::TYPE_OUT && $product->quantity < $qty) {
                throw ValidationException::withMessages(['quantity' => "Stock insuffisant. Disponible : {$product->quantity}."]);
            }
            $delta = $data['type'] === StockMovement::TYPE_IN ? $qty : -$qty;
            $product->increment('quantity', $delta);
            StockMovement::create([...$data, 'user_id' => $request->user()->id, 'unit_price' => $data['unit_price'] ?? $product->purchase_price]);
        });
        return redirect()->route('admin.movements.index')->with('success', 'Mouvement enregistré et stock mis à jour.');
    }
}
