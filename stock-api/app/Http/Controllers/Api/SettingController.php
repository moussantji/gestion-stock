<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Setting;
use Illuminate\Http\Request;

/**
 * 🎯 Réglages boutique : seuils configurables (segments clients,
 * rappels crédit). Réservé admin/manager — lecture libre pour
 * l'app via GET /api/shop (thresholds).
 */
class SettingController extends Controller
{
    /** GET /api/settings — valeur actuelle + bornes de chaque seuil */
    public function index()
    {
        $data = [];

        foreach (Setting::DEFAULTS as $key => $default) {
            $data[$key] = [
                'value' => (int) Setting::get($key),
                'min' => Setting::LIMITS[$key]['min'],
                'max' => Setting::LIMITS[$key]['max'],
            ];
        }

        // 📧 v2.1 : réglages textuels (pas de bornes numériques)
        foreach (Setting::TEXTS as $key => $default) {
            $data[$key] = ['value' => Setting::getText($key), 'min' => null, 'max' => null];
        }

        return response()->json(['data' => $data]);
    }

    /** PUT /api/settings {segment_loyal_min?, segment_inactive_days?, credit_reminder_days?} */
    public function update(Request $request)
    {
        $rules = [];
        foreach (Setting::DEFAULTS as $key => $default) {
            $rules[$key] = [
                'nullable', 'integer',
                'min:'.Setting::LIMITS[$key]['min'],
                'max:'.Setting::LIMITS[$key]['max'],
            ];
        }

        // 📧 v2.1 : email du patron ('' accepté = effacer l'adresse)
        $rules['boss_email'] = ['nullable', 'email:rfc', 'max:190'];

        // 🧮 v2.9 : config multi-TVA en JSON ('' = effacer → TVA désactivée)
        $rules['tva_config'] = ['nullable', 'string', 'max:4000', function ($attribute, $value, $fail) {
            if (trim((string) $value) !== '' && json_decode((string) $value, true) === null && json_last_error() !== JSON_ERROR_NONE) {
                $fail('Le réglage TVA doit être un JSON valide.');
            }
        }];

        // 🏷️ v2.11 : config promos datées en JSON ('' = aucune promo)
        $rules['promo_config'] = ['nullable', 'string', 'max:4000', function ($attribute, $value, $fail) {
            if (trim((string) $value) !== '' && json_decode((string) $value, true) === null && json_last_error() !== JSON_ERROR_NONE) {
                $fail('Le réglage promo doit être un JSON valide.');
            }
        }];

        // 💳 v2.13 : échéancier crédit en JSON ('' = aucune date planifiée)
        $rules['credit_schedule'] = ['nullable', 'string', 'max:8000', function ($attribute, $value, $fail) {
            if (trim((string) $value) !== '' && json_decode((string) $value, true) === null && json_last_error() !== JSON_ERROR_NONE) {
                $fail('Le réglage échéancier doit être un JSON valide.');
            }
        }];

        $data = $request->validate($rules);

        foreach ($data as $key => $value) {
            if (array_key_exists($key, Setting::TEXTS)) {
                Setting::set($key, trim((string) ($value ?? '')));

                continue;
            }
            if ($value !== null) {
                Setting::set($key, (int) $value);
            }
        }

        return $this->index();
    }
}
