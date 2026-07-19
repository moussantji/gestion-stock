<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * Notifications push DISTANTES via l'API Expo Push.
 *
 * Aucun SDK nécessaire : simple POST HTTPS sur exp.host.
 * Best-effort : un échec réseau ne casse jamais le flux métier
 * (erreur logguée via report()).
 */
class PushService
{
    private const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * Envoie une notification à tous les utilisateurs ADMIN
     * ayant un téléphone enregistré.
     */
    public static function sendToAdmins(string $title, string $body, array $data = []): int
    {
        $tokens = PushToken::whereIn(
            'user_id',
            User::where('role', User::ROLE_ADMIN)->pluck('id')
        )->pluck('token')->all();

        return self::send($tokens, $title, $body, $data);
    }

    /**
     * Envoie une notification à une liste de tokens Expo.
     * L'API Expo accepte max ~100 messages par requête → chunks.
     *
     * @return int nombre de tokens ciblés
     */
    public static function send(array $tokens, string $title, string $body, array $data = []): int
    {
        $tokens = array_values(array_unique(array_filter($tokens, [PushToken::class, 'looksValid'])));
        if (empty($tokens)) {
            return 0;
        }

        try {
            foreach (array_chunk($tokens, 99) as $chunk) {
                $messages = array_map(fn (string $token) => [
                    'to' => $token,
                    'title' => $title,
                    'body' => $body,
                    'sound' => 'default',
                    'channelId' => 'default',
                    'data' => (object) $data,
                ], $chunk);

                Http::timeout(6)
                    ->acceptJson()
                    ->post(self::EXPO_ENDPOINT, $messages)
                    ->throw();
            }
        } catch (\Throwable $e) {
            // Push indisponible (réseau serveur, API Expo…) — non bloquant
            report($e);

            return 0;
        }

        return count($tokens);
    }

    /** Supprime les tokens invalides signalés par Expo (DeviceNotRegistered). */
    public static function forget(string $token): void
    {
        PushToken::where('token', $token)->delete();
    }
}
