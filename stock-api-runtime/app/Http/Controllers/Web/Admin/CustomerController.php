<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function create() { return view('admin.customers.form', ['customer' => new Customer()]); }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'phone' => ['nullable', 'string', 'max:30'], 'email' => ['nullable', 'email', 'max:255'], 'address' => ['nullable', 'string', 'max:255'], 'price_tier' => ['required', 'in:retail,wholesale'], 'notes' => ['nullable', 'string', 'max:1000']]);
        Customer::create($data);
        return redirect()->route('admin.customers.index')->with('success', 'Client créé.');
    }

    public function edit(Customer $customer) { return view('admin.customers.form', compact('customer')); }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'phone' => ['nullable', 'string', 'max:30'], 'email' => ['nullable', 'email', 'max:255'], 'address' => ['nullable', 'string', 'max:255'], 'price_tier' => ['required', 'in:retail,wholesale'], 'notes' => ['nullable', 'string', 'max:1000']]);
        $customer->update($data);
        return redirect()->route('admin.customers.show', $customer)->with('success', 'Client modifié.');
    }

    public function index(Request $request)
    {
        $customers = Customer::withCount('activeReceipts')
            ->withSum('activeReceipts', 'total')
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->string('q')->toString();
                $q->where(fn ($x) => $x->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
            })->orderBy('name')->paginate(25)->withQueryString();
        return view('admin.customers.index', compact('customers'));
    }

    public function show(Customer $customer)
    {
        $customer->load(['activeReceipts' => fn ($q) => $q->latest()->limit(20)]);
        return view('admin.customers.show', compact('customer'));
    }
}
