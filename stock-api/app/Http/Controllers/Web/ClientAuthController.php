<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleTokenVerifier;
use App\Services\LicenseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * 👤 Connexion du portail client (session web, réservée au rôle client).
 * v2.14 : le compte client (email + mot de passe) remplace la clé de licence.
 */
class ClientAuthController extends Controller
{
    public function showLogin()
    {
        // Déjà connecté en tant qu'abonné → direct au tableau de bord
        if (Auth::check() && Auth::user()->company_id) {
            return redirect()->route('client.dashboard');
        }

        return view('client.login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Identifiants incorrects.'])->onlyInput('email');
        }

        // 🚫 Réservé aux abonnés (utilisateurs rattachés à une entreprise)
        if (! $request->user()->company_id) {
            Auth::logout();

            return back()->withErrors(['email' => 'Accès réservé aux abonnés StockFlow.'])->onlyInput('email');
        }

        $request->session()->regenerate();

        return redirect()->intended(route('client.dashboard'));
    }

    /**
     * 🇬 POST /compte/connexion/google — bouton GIS du portail (session web).
     * { credential: id_token Google }
     */
    public function loginGoogle(Request $request)
    {
        $data = $request->validate(['credential' => ['required', 'string']]);

        $google = GoogleTokenVerifier::verify($data['credential']);
        if (! $google) {
            return back()->withErrors(['email' => 'Connexion Google impossible (bouton non configuré ou jeton expiré).']);
        }

        $user = User::where('email', $google['email'])->first();
        if (! $user || ! $user->company_id) {
            return back()->withErrors(['email' => "Aucun abonnement StockFlow pour {$google['email']} — commandez d'abord une formule."]);
        }

        // 🔴 Abonnement expiré (après grâce) → on indique comment renouveler
        $subscription = LicenseService::clientSubscription($user->email);
        if ($subscription && $subscription['state']['code'] === 'expired') {
            return back()->withErrors(['email' => 'Votre abonnement a expiré. Renouvelez ci-dessous avec la même adresse email pour réactiver votre compte.']);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('client.dashboard'));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('client.login');
    }
}
