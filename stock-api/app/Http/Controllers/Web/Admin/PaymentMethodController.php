<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Moyens de paiement : l'admin personnalise les instructions
 * affichées aux clients (site + emails).
 */
class PaymentMethodController extends Controller
{
    public function index()
    {
        return view('admin.payments.index', [
            'methods' => PaymentMethod::orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['key'] = $data['key'] ?: Str::slug($data['name'], '_');

        PaymentMethod::create($data);

        return back()->with('success', 'Moyen de paiement ajouté.');
    }

    public function edit(PaymentMethod $payment)
    {
        return view('admin.payments.edit', ['method' => $payment]);
    }

    public function update(Request $request, PaymentMethod $payment)
    {
        $payment->update($this->validated($request, $payment->id));

        return redirect()->route('admin.payments.index')->with('success', 'Moyen de paiement mis à jour.');
    }

    public function toggle(PaymentMethod $payment)
    {
        $payment->update(['is_active' => ! $payment->is_active]);

        return back()->with('success', $payment->is_active ? 'Moyen de paiement activé.' : 'Moyen de paiement masqué.');
    }

    public function destroy(PaymentMethod $payment)
    {
        $payment->delete();

        return back()->with('success', 'Moyen de paiement supprimé.');
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'key' => [
                'nullable', 'string', 'max:100', 'alpha_dash',
                Rule::unique('payment_methods', 'key')->ignore($ignoreId),
            ],
            'icon' => ['nullable', 'string', 'max:10'],
            'account' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:3000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]) + [
            'is_active' => $request->boolean('is_active'),
            'sort_order' => (int) $request->input('sort_order', 0),
        ];
    }
}
