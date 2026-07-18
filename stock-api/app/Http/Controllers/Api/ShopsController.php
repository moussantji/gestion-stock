<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use Illuminate\Http\Request;

/**
 * 🏬 Boutiques (multi-boutiques v12).
 * Lecture : tout le staff (pickers). Écriture : admin uniquement.
 * ⚠️ Le stock reste global en v12 — boutique = rattachement des ventes,
 * clients, caisse, mouvements et équipe. Stock par boutique + transferts = v13.
 */
class ShopsController extends Controller
{
    /** GET /api/shops — boutiques actives en priorité (pour les sélecteurs) */
    public function index()
    {
        $shops = Shop::withCount('users')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $shops]);
    }

    /** POST /api/shops (admin) */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $shop = Shop::create($data + ['is_active' => true]);

        return response()->json(['data' => $shop->loadCount('users')], 201);
    }

    /** PUT /api/shops/{shop} (admin) */
    public function update(Request $request, Shop $shop)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $shop->update($data);

        return response()->json(['data' => $shop->fresh()->loadCount('users')]);
    }

    /** DELETE /api/shops/{shop} (admin) — les lignes rattachées repassent à null */
    public function destroy(Shop $shop)
    {
        $shop->delete(); // shop_id → null partout (nullOnDelete)

        return response()->json(['deleted' => true]);
    }
}
