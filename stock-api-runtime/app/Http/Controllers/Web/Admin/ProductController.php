<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::with(['category:id,name', 'supplier:id,name'])
            ->search($request->string('q')->toString())
            ->when($request->filled('stock'), function ($query) use ($request) {
                if ($request->string('stock')->value() === 'low') $query->lowStock();
                if ($request->string('stock')->value() === 'out') $query->where('quantity', 0);
            })
            ->orderBy('name')->paginate(20)->withQueryString();

        return view('admin.products.index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create()
    {
        return view('admin.products.form', [
            'product' => new Product(),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Product $product)
    {
        $product->load(['category:id,name', 'supplier:id,name']);
        $movements = $product->movements()->with('user:id,name')->paginate(15)->withQueryString();
        return view('admin.products.show', compact('product', 'movements'));
    }

    public function edit(Product $product)
    {
        return view('admin.products.form', [
            'product' => $product,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();
        unset($data['image']);
        if ($request->hasFile('image')) {
            if ($product->image_path) Storage::disk('public')->delete($product->image_path);
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }
        $product->update($data);
        return redirect()->route('admin.products.index')->with('success', 'Produit modifié. La quantité évolue uniquement via les mouvements.');
    }

    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();
        $quantity = (int) $data['quantity'];
        unset($data['quantity'], $data['image']);

        DB::transaction(function () use ($request, &$data, $quantity) {
            if ($request->hasFile('image')) {
                $data['image_path'] = $request->file('image')->store('products', 'public');
            }
            $product = Product::create([...$data, 'quantity' => $quantity]);
            if ($quantity > 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_IN,
                    'quantity' => $quantity,
                    'unit_price' => $product->purchase_price,
                    'reason' => 'Stock initial',
                ]);
            }
        });

        return redirect()->route('admin.products.index')->with('success', 'Produit créé et stock initial enregistré.');
    }
}
