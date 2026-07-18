<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleTokenVerifier;
use App\Services\LicenseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * 🇬 v2.14 — « Se connecter avec Google » depuis les APPS (mobile / PC).
 *
 * Flow sans aucune librairie tierce ni schéma d'app à configurer :
 *   1. l'app ouvre le navigateur système sur GET /auth/google/app (bouton GIS officiel) ;
 *   2. Google renvoie l'id_token (« credential ») en POST sur /auth/google/app/callback ;
 *   3. le serveur vérifie le jeton, contrôle le compte client + l'abonnement,
 *      crée le token Sanctum et affiche un CODE à usage unique (5 min, cache fichier) ;
 *   4. l'utilisateur colle ce code dans l'app → POST /api/auth/google/exchange → session.
 */
class GoogleAuthController extends Controller
{
    /** GET /auth/google/app — page avec le bouton Google officiel (GIS) */
    public function appPage()
    {
        return view('google.app', [
            'clientId' => config('google.client_id'),
            'callbackUrl' => route('google.app.callback'),
        ]);
    }

    /** POST /auth/google/app/callback — GIS poste le credential (id_token) */
    public function appCallback(Request $request)
    {
        $data = $request->validate(['credential' => ['required', 'string']]);

        $google = GoogleTokenVerifier::verify($data['credential']);
        if (! $google) {
            return view('google.code', [
                'code' => null,
                'error' => "Connexion Google impossible (jeton invalide ou GOOGLE_CLIENT_ID non configuré). Utilisez email + mot de passe dans l'app.",
            ]);
        }

        $user = User::where('email', $google['email'])->first();
        if (! $user || ! $user->isClient()) {
            return view('google.code', [
                'code' => null,
                'error' => "Aucun compte client StockFlow pour {$google['email']} — commandez d'abord une formule sur " . route('home') . '.',
            ]);
        }

        $subscription = LicenseService::clientSubscription($user->email);
        if ($subscription && $subscription['state']['code'] === 'expired') {
            return view('google.code', [
                'code' => null,
                'error' => "Votre abonnement a expiré 🔴 Renouvelez sur " . url('/compte') . " puis recommencez la connexion.",
            ]);
        }

        // 🔐 Code à usage unique, 5 minutes (cache fichier → 0 migration)
        $user->tokens()->delete();
        $token = $user->createToken('google-app')->plainTextToken;
        $code = self::makeCode();
        Cache::put("gcode:{$code}", ['token' => $token, 'email' => $user->email], now()->addMinutes(5));

        return view('google.code', [
            'code' => $code,
            'error' => null,
            'email' => $user->email,
        ]);
    }

    /** Code lisible format XXXX-XXXX (alphabet sans ambiguïté). */
    private static function makeCode(): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $one = fn (int $n) => collect(range(1, $n))->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode('');

        do {
            $code = $one(4) . '-' . $one(4);
        } while (Cache::has("gcode:{$code}"));

        return $code;
    }
}
