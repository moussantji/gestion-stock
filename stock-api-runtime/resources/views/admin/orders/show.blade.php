@extends('layouts.admin')

@section('title', 'Commande ' . $order->reference . ' — StockFlow Admin')

@section('content')

<h1 class="page-title">🧾 {{ $order->reference }}</h1>
<p class="page-sub">
    <a href="{{ route('admin.orders.index') }}" style="color:var(--accent);">← Retour aux commandes</a>
    · <a href="{{ route('order.receipt', $order->reference) }}" target="_blank" style="color:var(--accent);">🧾 Télécharger le reçu PDF ↗</a>
</p>

<div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:22px;" class="dash-cols">

    <div class="card">
        <div class="card-title">Détails
            <span class="badge {{ $order->status }}">{{ ['pending' => '⏳ En attente', 'paid' => '✅ Payée', 'cancelled' => 'Annulée'][$order->status] }}</span>
        </div>
        <div class="detail-grid">
            <div><div class="label">Client</div><div class="value">{{ $order->buyer_name }}</div></div>
            <div><div class="label">Email</div><div class="value">{{ $order->buyer_email }}</div></div>
            <div><div class="label">Téléphone</div><div class="value">{{ $order->buyer_phone ?? '—' }}</div></div>
            <div><div class="label">Formule</div><div class="value">{{ $order->plan_name }}</div></div>
            <div><div class="label">Montant</div><div class="value" style="color:var(--accent);">{{ number_format($order->amount, 0, ',', ' ') }} FCFA</div></div>
            <div><div class="label">Paiement</div><div class="value">{{ $order->payment_method }}</div></div>
            <div><div class="label">Commandé le</div><div class="value">{{ $order->created_at->format('d/m/Y à H:i') }}</div></div>
            <div><div class="label">Payé le</div><div class="value">{{ $order->paid_at?->format('d/m/Y à H:i') ?? '—' }}</div></div>
        </div>
        @if($order->notes)
            <p class="muted" style="margin-top:16px; font-size:13.5px;">💬 « {{ $order->notes }} »</p>
        @endif
    </div>

    <div class="card">
        <div class="card-title">👤 Abonnement</div>

        @if($order->license)
            @php $ss = $order->license->subscriptionState(); @endphp
            {{-- 👤 v2.14 : plus de clé — le client se connecte à son compte (email + mot de passe) --}}
            <p style="text-align:center; margin:10px 0 16px;">
                <span style="display:inline-block; padding:8px 16px; border-radius:12px; background:var(--surface-2); font-size:14px; font-weight:700;">
                    {{ ['active' => '🟢 Actif', 'expiring' => '🟠 Expire bientôt', 'grace' => '🟠 Grâce ('.$ss['grace_left'].' j)', 'expired' => '🔴 Expiré — bloqué', 'revoked' => '🚫 Révoqué'][$ss['code']] }}
                </span>
            </p>
            <div class="detail-grid">
                <div><div class="label">Compte client</div><div class="value" style="font-size:13px;">{{ $order->license->buyer_email }}</div></div>
                <div><div class="label">Valide jusqu'au</div><div class="value">{{ $order->license->expires_at->format('d/m/Y') }}</div></div>
                <div><div class="label">Statut</div>
                    <div class="value">
                        <span class="badge {{ $order->license->effective_status }}">
                            {{ ['active' => '✅ Active', 'expired' => '⌛ Expirée', 'revoked' => '🚫 Révoquée'][$order->license->effective_status] }}
                        </span>
                    </div>
                </div>
            </div>
            <p class="muted" style="font-size:12.5px; margin-top:12px;">
                💡 Le client suit son abonnement sur <strong>{{ url('/compte') }}</strong>. Mot de passe perdu ? Régénérez-le depuis l'app mobile (onglet Admin → Abonnements).
            </p>
        @elseif($order->isPending())
            <p class="muted" style="font-size:13.5px; margin-bottom:16px;">À la validation : compte client créé (ou abonnement prolongé si même email) → identifiants envoyés par email.</p>
        @else
            <p class="muted" style="font-size:13.5px;">Aucun abonnement (commande annulée).</p>
        @endif

        @if($order->isPending())
            <form method="POST" action="{{ route('admin.orders.validate', $order) }}" style="margin-top:18px;">
                @csrf
                <button class="btn btn-success" style="width:100%; padding:12px;">✅ Valider le paiement → activer / prolonger le compte</button>
            </form>
        @endif

        @if($order->status !== 'cancelled')
            <form method="POST" action="{{ route('admin.orders.cancel', $order) }}" style="margin-top:10px;"
                  onsubmit="return confirm('Annuler cette commande ? L\'abonnement éventuel sera révoqué.')">
                @csrf
                <button class="btn btn-danger" style="width:100%;">✖ Annuler la commande</button>
            </form>
        @endif
    </div>
</div>

<style>@media (max-width: 1000px) { .dash-cols { grid-template-columns: 1fr !important; } }</style>

@endsection
