<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * 👤 v2.14 — Vérification d'un jeton d'identité Google (id_token GIS)
 * SANS librairie tierce : simple appel au endpoint public tokeninfo.
 * Zéro dépendance composer ajoutée.
 */
class GoogleTokenVerifier
{
    /**
     * @return array{email:string, name:string}|null null si jeton invalide,
     *                                               audience incorrecte ou Google non configuré.
     */
    public static function verify(string $idToken): ?array
    {
        $clientId = config('google.client_id');
        if (! $clientId) {
            return null; // Google non configuré sur ce serveur
        }

        try {
            $res = Http::timeout(6)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $idToken,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }

        if (! $res->ok()) {
            return null;
        }

        $payload = $res->json();

        // 🔐 Le jeton doit avoir été émis POUR notre app (audience) et l'email vérifié
        if (($payload['aud'] ?? null) !== $clientId) {
            return null;
        }
        if (! filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN) && ($payload['email_verified'] ?? null) !== 'true') {
            return null;
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        if ($email === '') {
            return null;
        }

        return [
            'email' => $email,
            'name' => (string) ($payload['name'] ?? $email),
        ];
    }
}
