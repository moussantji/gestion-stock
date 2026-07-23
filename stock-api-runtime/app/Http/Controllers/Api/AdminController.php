<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Administration depuis l'app mobile (rôle admin uniquement).
 */
class AdminController extends Controller
{
    /** GET /api/admin/overview */
    public function overview()
    {
        return response()->json([
            'stats' => [
                'revenue_total' => (int) Order::where('status', Order::STATUS_PAID)->sum('amount'),
                'revenue_month' => (int) Order::where('status', Order::STATUS_PAID)
                    ->whereMonth('paid_at', now()->month)
                    ->whereYear('paid_at', now()->year)
                    ->sum('amount'),
                'orders_pending' => Order::where('status', Order::STATUS_PENDING)->count(),
                'orders_paid' => Order::where('status', Order::STATUS_PAID)->count(),
                'licenses_active' => License::valid()->count(),
                'licenses_total' => License::count(),
                'plans_count' => Plan::count(),
                'products_count' => Product::count(),
                'low_stock_count' => Product::lowStock()->count(),
                'users_count' => User::count(),
            ],
            'recent_orders' => Order::with('license:id,order_id,expires_at,status,plan_name')->latest()->limit(5)->get(),
            // Licences expirant dans les 7 prochains jours (rappels push mobile)
            'expiring_licenses' => License::valid()
                ->where('expires_at', '<=', now()->addDays(7))
                ->orderBy('expires_at')
                ->limit(10)
                ->get(),
        ]);
    }

    /** GET /api/admin/orders?status=&q= */
    public function orders(Request $request)
    {
        $orders = Order::with(['plan:id,name', 'license:id,order_id,expires_at,status,plan_name'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('q'), function ($q, $term) {
                $q->where(function ($qq) use ($term) {
                    $qq->where('reference', 'like', "%{$term}%")
                        ->orWhere('buyer_name', 'like', "%{$term}%")
                        ->orWhere('buyer_email', 'like', "%{$term}%");
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($orders);
    }

    /** POST /api/admin/orders/{order}/validate — 👤 valide le paiement : compte client créé / abonnement prolongé (v2.14) */
    public function validateOrder(Order $order)
    {
        if (! $order->isPending()) {
            return response()->json(['message' => "Cette commande n'est plus en attente."], 422);
        }

        $result = LicenseService::fulfillOrder($order);
        $license = $result['license'];

        return response()->json([
            'message' => $result['extended']
                ? "Paiement validé : abonnement prolongé jusqu'au " . $license->expires_at->format('d/m/Y') . '.'
                : "Paiement validé : abonnement actif jusqu'au " . $license->expires_at->format('d/m/Y') . '.',
            // 👤 Tout pour informer le client — le mot de passe en clair n'est transmis QU'ICI (création de compte)
            'subscription' => [
                'email' => $license->buyer_email,
                'buyer_name' => $license->buyer_name,
                'plan_name' => $license->plan_name,
                'expires_at' => $license->expires_at->toDateString(),
                'extended' => $result['extended'],
                'account_created' => $result['password'] !== null,
                'password_plain' => $result['password'],
                'note' => $result['note'],
            ],
            'license' => $license,
        ]);
    }

    /** POST /api/admin/orders/{order}/cancel */
    public function cancelOrder(Order $order)
    {
        DB::transaction(function () use ($order) {
            $order->license?->update(['status' => License::STATUS_REVOKED]);
            $order->update(['status' => Order::STATUS_CANCELLED]);
        });

        return response()->json(['message' => 'Commande annulée.']);
    }

    /** GET /api/admin/licenses?status=&q= */
    public function licenses(Request $request)
    {
        $licenses = License::with('order:id,reference')
            ->when($request->query('q'), function ($q, $term) {
                $q->where(function ($qq) use ($term) {
                    $qq->where('key', 'like', "%{$term}%")
                        ->orWhere('buyer_name', 'like', "%{$term}%")
                        ->orWhere('buyer_email', 'like', "%{$term}%");
                });
            })
            ->orderByDesc('expires_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($licenses);
    }

    /** POST /api/admin/licenses/{license}/toggle — active / révoque */
    public function toggleLicense(License $license)
    {
        $new = $license->status === License::STATUS_ACTIVE
            ? License::STATUS_REVOKED
            : License::STATUS_ACTIVE;

        $license->update(['status' => $new]);

        return response()->json([
            'message' => $new === License::STATUS_ACTIVE ? 'Abonnement réactivé.' : 'Abonnement révoqué.',
            'license' => $license->fresh(),
        ]);
    }

    /** POST /api/admin/licenses/{license}/password-reset — 🔑↻ régénère le mot de passe du compte client (v2.14) */
    public function resetLicensePassword(License $license)
    {
        $password = LicenseService::resetClientPassword($license);

        if (! $password) {
            return response()->json([
                'message' => 'Aucun compte client trouvé pour cet email (conflit avec un compte staff ?).',
            ], 422);
        }

        return response()->json([
            'message' => 'Nouveau mot de passe généré (envoyé aussi par email au client).',
            'email' => $license->buyer_email,
            'password_plain' => $password,
        ]);
    }
}
