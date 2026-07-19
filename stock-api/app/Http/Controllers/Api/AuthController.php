<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Connexion mobile : renvoie un token Sanctum + l'utilisateur.
     * POST /api/login  { email, password }
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        // 🏢 v26 — l'abonnement de l'ENTREPRISE gate TOUT son personnel (admin + staff).
        $subscription = LicenseService::subscriptionForCompany($user->company);
        if ($subscription && $subscription['state']['code'] === 'expired') {
            return response()->json([
                'message' => 'Votre abonnement a expiré. Renouvelez sur votre espace : '.rtrim(config('app.url'), '/').'/compte',
                'code' => 'subscription_expired',
                'subscription' => $subscription,
            ], 403);
        }

        // Un seul token actif par appareil : on révoque les anciens.
        $user->tokens()->delete();

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'subscription' => $subscription, // null pour le super-admin plateforme
        ]);
    }

    /**
     * 👤 POST /api/auth/google/exchange — échange le code à usage unique (5 min)
     * obtenu après la connexion Google dans le navigateur contre une session app.
     * { code: "XXXX-XXXX" } → { token, user, subscription }
     */
    public function exchangeGoogleCode(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:20']]);

        $code = strtoupper(trim($data['code']));
        $payload = Cache::pull("gcode:{$code}"); // pull = get + delete → usage unique

        if (! $payload || empty($payload['token']) || empty($payload['email'])) {
            return response()->json([
                'message' => 'Code invalide ou expiré. Recommencez la connexion Google.',
            ], 404);
        }

        $user = User::where('email', $payload['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        // Re-vérification de l'abonnement de l'entreprise au moment de l'échange (sécurité)
        $subscription = LicenseService::subscriptionForCompany($user->company);
        if ($subscription && $subscription['state']['code'] === 'expired') {
            return response()->json([
                'message' => 'Votre abonnement a expiré. Renouvelez sur votre espace client : '.rtrim(config('app.url'), '/').'/compte',
                'code' => 'subscription_expired',
                'subscription' => $subscription,
            ], 403);
        }

        return response()->json([
            'token' => $payload['token'],
            'user' => $user,
            'subscription' => $subscription,
        ]);
    }

    /** GET /api/me */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            // 🏢 v26 : état d'abonnement temps réel de l'entreprise de l'utilisateur
            'subscription' => LicenseService::subscriptionForCompany($user->company),
        ]);
    }

    /** PUT /api/password */
    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($data['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $request->user()->update(['password' => $data['password']]);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    /** POST /api/logout */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
