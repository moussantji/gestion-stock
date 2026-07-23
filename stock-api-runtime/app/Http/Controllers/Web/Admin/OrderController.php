<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Order;
use App\Services\LicenseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with(['plan', 'license'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('q'), function ($q, $term) {
                $q->where(function ($qq) use ($term) {
                    $qq->where('reference', 'like', "%{$term}%")
                        ->orWhere('buyer_name', 'like', "%{$term}%")
                        ->orWhere('buyer_email', 'like', "%{$term}%");
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return view('admin.orders.index', compact('orders'));
    }

    public function show(Order $order)
    {
        return view('admin.orders.show', ['order' => $order->load(['plan', 'license'])]);
    }

    /** Valide le paiement → 👤 compte client créé / abonnement prolongé (v2.14, plus de clé). */
    public function validateOrder(Order $order)
    {
        if (! $order->isPending()) {
            return back()->with('error', "Cette commande n'est plus en attente.");
        }

        $result = LicenseService::fulfillOrder($order);
        $license = $result['license'];

        $message = $result['extended']
            ? "Paiement validé ✅ Abonnement prolongé jusqu'au " . $license->expires_at->format('d/m/Y') . " (compte {$license->buyer_email})."
            : "Paiement validé ✅ Abonnement actif jusqu'au " . $license->expires_at->format('d/m/Y') . " — identifiants envoyés à {$license->buyer_email}.";

        if ($result['note'] === 'email_conflict') {
            $message .= ' ⚠️ Cet email appartient déjà à un compte staff : aucun compte client créé.';
        }

        $redirect = redirect()->route('admin.orders.show', $order)->with('success', $message);

        // 🔐 Mot de passe du NOUVEAU compte : affiché une seule fois pour partage WhatsApp
        if ($result['password']) {
            $redirect->with('subscription_password', $result['password']);
        }

        return $redirect;
    }

    /** Annule la commande (et révoque la licence s'il y en a une). */
    public function cancel(Order $order)
    {
        DB::transaction(function () use ($order) {
            $order->license?->update(['status' => License::STATUS_REVOKED]);
            $order->update(['status' => Order::STATUS_CANCELLED]);
        });

        return back()->with('success', 'Commande annulée.');
    }
}
