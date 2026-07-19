<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Support\Setting;
use App\Support\ShopInfo;
use App\Support\Tva;
use Illuminate\Http\Request;

/**
 * 🏪 Identité de la boutique (nom, contacts, logo) —
 * affichée sur les reçus PDF et dans l'app.
 */
class ShopController extends Controller
{
    /** GET /api/shop — infos publiques de la boutique (pour l'app) */
    public function show(Request $request)
    {
        return response()->json([
            'shop' => config('shop') + [
                'logo_url' => ShopInfo::logoUrl(),
                // 🎯 Seuils configurables — lisibles par tout le staff (affichage app)
                'thresholds' => [
                    'segment_loyal_min' => (int) Setting::get('segment_loyal_min', 5),
                    'segment_inactive_days' => (int) Setting::get('segment_inactive_days', 60),
                    'credit_reminder_days' => (int) Setting::get('credit_reminder_days', 7),
                ],
                // 🎁 Paramètres fidélité (affichage Nouvelle vente / fiche client)
                'loyalty' => [
                    'earn_per' => (int) Setting::get('loyalty_earn_per', 1000),
                    'point_value' => (int) Setting::get('loyalty_point_value', 10),
                ],
                // 🧮 v2.9 : config multi-TVA complète (ventilation locale par les clients) — additive
                'tva' => Tva::payload(),
                // 👥 v2.9 : taux de commission vendeurs (0 = masqué) — additive
                'commission_pct' => (int) Setting::get('commission_pct', 0),
                // 📦 v2.11 : inventaire tournant, produits/jour (0 = carte masquée) — additive
                'cycle_count_daily' => (int) Setting::get('cycle_count_daily', 0),
                // 🏬 Ma boutique (utilisateur rattaché) — null = admin/global
                'my_shop' => $request->user()->shop_id
                    ? Shop::select('id', 'name')->find($request->user()->shop_id)
                    : null,
            ],
        ]);
    }

    /** POST /api/admin/shop-logo — upload du logo (admin, multipart champ `logo`) */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'], // 2 Mo
        ], [
            'logo.required' => 'Choisis une image.',
            'logo.image' => 'Le fichier doit être une image.',
            'logo.max' => 'Logo trop lourd (max 2 Mo).',
        ]);

        $url = ShopInfo::storeLogo($request->file('logo'));

        return response()->json([
            'message' => 'Logo mis à jour — il apparaîtra sur les prochains reçus PDF.',
            'logo_url' => $url,
        ]);
    }
}
