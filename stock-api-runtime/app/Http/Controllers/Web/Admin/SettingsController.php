<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Support\ShopInfo;
use Illuminate\Http\Request;

/**
 * 🏪 Paramètres de la boutique : logo (reçus PDF) + rappel
 * des informations configurées dans le .env (SHOP_*).
 */
class SettingsController extends Controller
{
    public function index()
    {
        return view('admin.settings.index', [
            'shop' => config('shop'),
            'logoUrl' => ShopInfo::logoUrl(),
        ]);
    }

    /** POST /admin/settings/logo — upload du logo (affiché sur les reçus PDF) */
    public function updateLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'], // 2 Mo
        ], [
            'logo.required' => 'Choisis une image.',
            'logo.image' => 'Le fichier doit être une image (PNG, JPG, WebP).',
            'logo.max' => 'Logo trop lourd (max 2 Mo).',
        ]);

        ShopInfo::storeLogo($request->file('logo'));

        return back()->with('success', 'Logo mis à jour — il apparaîtra sur les prochains reçus PDF.');
    }

    /** DELETE /admin/settings/logo — supprime le logo actuel */
    public function deleteLogo()
    {
        ShopInfo::deleteLogo();

        return back()->with('success', 'Logo supprimé.');
    }
}
