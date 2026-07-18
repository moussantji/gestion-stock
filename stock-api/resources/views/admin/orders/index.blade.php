@extends('layouts.admin')

@section('title', 'Commandes — StockFlow Admin')

@section('content')

<h1 class="page-title">🧾 Commandes</h1>
<p class="page-sub">Abonnements commandés sur le site.</p>

<form method="GET" class="filters">
    <input class="input" name="q" value="{{ request('q') }}" placeholder="🔍 Référence, client, email…">
    <select class="input" name="status">
        <option value="">Tous les statuts</option>
        <option value="pending" {{ request('status') === 'pending' ? 'selected' : '' }}>⏳ En attente</option>
        <option value="paid" {{ request('status') === 'paid' ? 'selected' : '' }}>✅ Payées</option>
        <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Annulées</option>
    </select>
    <button class="btn btn-ghost">Filtrer</button>
</form>

<div class="card">
    <div class="table-wrap">
        <table>
            <thead>
            <tr><th>Référence</th><th>Date</th><th>Client</th><th>Formule</th><th>Montant</th><th>Paiement</th><th>Statut</th><th>Abonnement</th><th></th></tr>
            </thead>
            <tbody>
            @forelse($orders as $order)
                <tr>
                    <td class="mono">{{ $order->reference }}</td>
                    <td class="muted">{{ $order->created_at->format('d/m/Y H:i') }}</td>
                    <td>
                        <strong>{{ $order->buyer_name }}</strong>
                        <div class="muted" style="font-size:12px;">{{ $order->buyer_email }}</div>
                    </td>
                    <td>{{ $order->plan_name }}</td>
                    <td><strong>{{ number_format($order->amount, 0, ',', ' ') }} F</strong></td>
                    <td class="muted">{{ $order->payment_method }}</td>
                    <td><span class="badge {{ $order->status }}">{{ ['pending' => '⏳ En attente', 'paid' => '✅ Payée', 'cancelled' => 'Annulée'][$order->status] }}</span></td>
                    {{-- 👤 v2.14 : état abonnement au lieu de la clé --}}
                    <td style="font-size:12px;">
                        @if($order->license)
                            {{ $order->license->expires_at->format('d/m/Y') }}
                            <span class="badge {{ $order->license->effective_status }}">{{ ['active' => '✅', 'expired' => '⌛', 'revoked' => '🚫'][$order->license->effective_status] }}</span>
                        @else
                            <span class="muted">—</span>
                        @endif
                    </td>
                    <td><a class="btn btn-ghost btn-xs" href="{{ route('admin.orders.show', $order) }}">Détail</a></td>
                </tr>
            @empty
                <tr><td colspan="9" class="muted" style="text-align:center; padding:30px;">Aucune commande trouvée.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    {{ $orders->links() }}
</div>

@endsection
