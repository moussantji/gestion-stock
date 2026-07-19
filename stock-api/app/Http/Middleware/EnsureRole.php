<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 *  Usage dans les routes : ->middleware('role:admin') ou 'role:admin,manager'
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            // API / clients attendant du JSON → réponse JSON 403.
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Accès refusé : rôle insuffisant.',
                ], 403);
            }

            // Web : non connecté → page de connexion ; connecté mais rôle insuffisant → 403.
            if (! $user) {
                return redirect()->guest(route('login'));
            }

            abort(403, 'Accès refusé : rôle insuffisant.');
        }

        return $next($request);
    }
}
