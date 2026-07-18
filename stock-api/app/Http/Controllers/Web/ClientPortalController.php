<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Order;
use App\Models\Plan;
use Illuminate\Http\Request;

/**
 * 👤 Portail client (v2.14) : suivi de l'abonnement, commandes et reçus.
 * Le lien compte ↔ abonnement se fait par l'email (licenses.buyer_email = users.email),
 * donc AUCUNE migration nécessaire.
 */
class ClientPortalController extends Controller
{
    /** GET /compte — Tableau de bord client */
    public function dashboard(Request $request)
    {
        $user = $request->user();

        // 🚪 Garde-fou : pas connecté ou pas un compte client → page de connexion
        if (! $user || ! $user->isClient()) {
            return redirect()->route('client.login');
        }

        $licenses = License::where('buyer_email', $user->email)
            ->orderByDesc('expires_at')
            ->get();

        // Abonnement courant = le plus récent non révoqué (trié par fin décroissante)
        $current = $licenses->first(fn (License $l) => $l->status !== License::STATUS_REVOKED);
        $state = $current?->subscriptionState();

        $orders = Order::where('buyer_email', $user->email)
            ->latest()
            ->limit(10)
            ->get();

        return view('client.dashboard', [
            'user' => $user,
            'current' => $current,
            'state' => $state,
            'orders' => $orders,
            'plans' => Plan::active()->get(),
        ]);
    }
}
