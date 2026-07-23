<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::withCount('products')->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%' . $request->string('q') . '%')->orWhere('phone', 'like', '%' . $request->string('q') . '%'))->orderBy('name')->paginate(25)->withQueryString();
        return view('admin.suppliers.index', compact('suppliers'));
    }
    public function create() { return view('admin.suppliers.form', ['supplier' => new Supplier()]); }
    public function store(Request $request) { $data = $request->validate(['name' => ['required','string','max:255'], 'phone' => ['nullable','string','max:30'], 'email' => ['nullable','email','max:255'], 'address' => ['nullable','string','max:255']]); Supplier::create($data); return redirect()->route('admin.suppliers.index')->with('success', 'Fournisseur créé.'); }
    public function edit(Supplier $supplier) { return view('admin.suppliers.form', compact('supplier')); }
    public function update(Request $request, Supplier $supplier) { $data = $request->validate(['name' => ['required','string','max:255'], 'phone' => ['nullable','string','max:30'], 'email' => ['nullable','email','max:255'], 'address' => ['nullable','string','max:255']]); $supplier->update($data); return redirect()->route('admin.suppliers.index')->with('success', 'Fournisseur modifié.'); }
}
