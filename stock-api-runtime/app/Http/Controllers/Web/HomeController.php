<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Mail\OrderReceived;
use App\Models\License;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Services\PushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Site public : landing, achat de licence, vérification de licence.
 */
class HomeController extends Controller
{
    /** GET / — Accueil de gestion : connexion admin ou redirection dashboard. */
    public function home()
    {
        if (Auth::check() && in_array(Auth::user()->role, [\App\Models\User::ROLE_ADMIN, \App\Models\User::ROLE_MANAGER, \App\Models\User::ROLE_EMPLOYEE], true)) {
            return redirect()->route('admin.dashboard');
        }

        return view('admin.login', [
            'companyName' => config('shop.name', config('app.name', 'StockFlow')),
            'companyLogo' => \App\Support\ShopInfo::logoUrl(),
        ]);
    }

    /** GET /acheter/{plan:slug} — Formulaire de commande */
    public function checkout(Request $request, Plan $plan)
    {
        abort_unless($plan->is_active, 404);

        return view('site.checkout', [
            'plan' => $plan,
            'paymentMethods' => PaymentMethod::active()->get(),
            // 👤 v2.14 : pré-remplissage depuis le portail client (renouvellement en 1 clic)
            'prefillName' => (string) $request->query('name', ''),
            'prefillEmail' => (string) $request->query('email', ''),
        ]);
    }

    /** POST /acheter/{plan:slug} — Crée la commande + email de confirmation */
    public function purchase(Request $request, Plan $plan)
    {
        abort_unless($plan->is_active, 404);

        $data = $request->validate([
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_email' => ['required', 'email', 'max:255'],
            'buyer_phone' => ['nullable', 'string', 'max:30'],
            'payment_method' => [
                'required',
                Rule::exists('payment_methods', 'name')->where('is_active', true),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'buyer_name.required' => 'Ton nom est obligatoire.',
            'buyer_email.required' => 'Ton email est obligatoire.',
            'payment_method.required' => 'Choisis un moyen de paiement.',
            'payment_method.exists' => 'Moyen de paiement invalide.',
        ]);

        $order = Order::create([
            ...$data,
            'reference' => Order::generateReference(),
            'plan_id' => $plan->id,
            'plan_name' => $plan->name,
            'amount' => $plan->price,
            'status' => Order::STATUS_PENDING,
        ]);

        // Email de confirmation avec les instructions de paiement (best-effort)
        try {
            Mail::to($order->buyer_email)->send(new OrderReceived($order));
        } catch (\Throwable $e) {
            report($e);
        }

        // 🔔 Push distante vers les admins : nouvelle commande à traiter (best-effort)
        try {
            PushService::sendToAdmins(
                '🛒 Nouvelle commande',
                "{$order->reference} · {$order->buyer_name} · " . number_format($order->amount, 0, ',', ' ') . ' FCFA — à valider',
                ['type' => 'new_order', 'order_id' => $order->id, 'reference' => $order->reference]
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->route('order.confirmation', $order->reference);
    }

    /** GET /commande/{reference} — Confirmation + instructions de paiement */
    public function confirmation(Order $order)
    {
        $method = PaymentMethod::where('name', $order->payment_method)
            ->where('is_active', true)
            ->first();

        return view('site.confirmation', [
            'order' => $order->load('plan'),
            'method' => $method,
        ]);
    }

    /** GET /verifier-licence — 👤 v2.14 : fini les clés, tout passe par le compte client */
    public function checkForm()
    {
        return redirect()->route('client.login');
    }

    /** POST /verifier-licence — idem (ancien formulaire de vérification de clé) */
    public function checkLicense(Request $request)
    {
        return redirect()->route('client.login');
    }
}
