<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 🏢 Panneau PLATEFORME (/admin) : réservé au super-admin StockFlow, c.-à-d. un
 * admin SANS entreprise. Un admin d'entreprise (locataire) ne doit jamais voir
 * les abonnements / commandes de toutes les entreprises.
 */
class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== User::ROLE_ADMIN || $user->company_id) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Réservé à la plateforme StockFlow.'], 403);
            }

            abort(403, 'Réservé à la plateforme StockFlow.');
        }

        return $next($request);
    }
}
