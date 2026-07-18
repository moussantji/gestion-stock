<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::withCount('products')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $suppliers]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $supplier = Supplier::create($data);

        return response()->json(['data' => $supplier], 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json(['data' => $supplier->loadCount('products')]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $supplier->update($data);

        return response()->json(['data' => $supplier]);
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->products()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des produits sont liés à ce fournisseur.',
            ], 422);
        }

        $supplier->delete();

        return response()->json(['message' => 'Fournisseur supprimé.']);
    }
}
