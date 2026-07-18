<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index()
    {
        return view('admin.plans.index', [
            'plans' => Plan::withCount('orders')->orderBy('sort_order')->orderBy('price')->get(),
        ]);
    }

    public function create()
    {
        return view('admin.plans.form', ['plan' => null]);
    }

    public function store(Request $request)
    {
        Plan::create($this->validated($request));

        return redirect()->route('admin.plans.index')->with('success', 'Formule créée.');
    }

    public function edit(Plan $plan)
    {
        return view('admin.plans.form', compact('plan'));
    }

    public function update(Request $request, Plan $plan)
    {
        $plan->update($this->validated($request, $plan->id));

        return redirect()->route('admin.plans.index')->with('success', 'Formule mise à jour.');
    }

    public function destroy(Plan $plan)
    {
        if ($plan->orders()->exists()) {
            return back()->with('error', 'Impossible : des commandes sont liées à cette formule. Désactive-la plutôt.');
        }

        $plan->delete();

        return back()->with('success', 'Formule supprimée.');
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'nullable', 'string', 'max:100', 'alpha_dash',
                Rule::unique('plans', 'slug')->ignore($ignoreId),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'max_users' => ['required', 'integer', 'min:1'],
            'max_products' => ['required', 'integer', 'min:1'],
            'features' => ['nullable', 'string', 'max:2000'], // une ligne = un avantage
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);
        $data['is_active'] = $request->boolean('is_active');
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['features'] = collect(preg_split('/\r?\n/', $data['features'] ?? ''))
            ->map(fn ($f) => trim($f))
            ->filter()
            ->values()
            ->all();

        return $data;
    }
}
