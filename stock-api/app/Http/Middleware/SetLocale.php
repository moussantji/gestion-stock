<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applique la langue choisie par le visiteur (session).
 * Langues supportées : fr (défaut), en.
 */
class SetLocale
{
    public const LOCALES = ['fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get('locale', config('app.locale', 'fr'));

        if (! in_array($locale, self::LOCALES, true)) {
            $locale = 'fr';
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
