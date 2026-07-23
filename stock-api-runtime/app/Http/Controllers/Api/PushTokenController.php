<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;

/**
 * Enregistrement des tokens Expo Push des téléphones.
 * L'app appelle POST /push-tokens à chaque connexion (token parfois renouvelé)
 * et DELETE /push-tokens à la déconnexion.
 */
class PushTokenController extends Controller
{
    /** POST /api/push-tokens — enregistre (ou rattache) le token du téléphone */
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:120'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        if (! PushToken::looksValid($data['token'])) {
            return response()->json(['message' => 'Token push invalide.'], 422);
        }

        // Upsert : un même téléphone peut passer d'un compte à l'autre
        PushToken::updateOrCreate(
            ['token' => $data['token']],
            ['user_id' => $request->user()->id, 'device_name' => $data['device_name'] ?? null]
        );

        return response()->json(['message' => 'Token enregistré.'], 201);
    }

    /** DELETE /api/push-tokens — oublie ce téléphone (déconnexion) */
    public function destroy(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:120']]);

        PushToken::where('token', $data['token'])
            ->where('user_id', $request->user()->id) // on ne supprime que SES tokens
            ->delete();

        return response()->json(['message' => 'Token supprimé.']);
    }
}
