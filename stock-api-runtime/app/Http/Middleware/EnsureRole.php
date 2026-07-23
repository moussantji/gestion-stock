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
            return response()->json([
                'message' => 'Accès refusé : rôle insuffisant.',
            ], 403);
        }

        return $next($request);
    }
}
