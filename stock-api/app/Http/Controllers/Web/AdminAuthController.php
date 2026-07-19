<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Connexion web du panneau admin (session, réservée au rôle admin).
 */
class AdminAuthController extends Controller
{
    public function showLogin()
    {
        return view('admin.login');
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

        // 🏢 Panneau PLATEFORME : réservé au super-admin StockFlow (sans entreprise).
        // Un admin d'ENTREPRISE gère son stock dans l'app, pas les abonnements de tous.
        if ($request->user()->role !== User::ROLE_ADMIN || $request->user()->company_id) {
            Auth::logout();

            return back()->withErrors(['email' => 'Accès réservé aux administrateurs de la plateforme.'])->onlyInput('email');
        }

        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
