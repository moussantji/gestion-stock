@extends('layouts.admin')

@section('title', 'Tableau de bord — StockFlow Admin')

@section('content')

<h1 class="page-title">Tableau de bord</h1>
<p class="page-sub">Vue d'ensemble de l'activité — {{ now()->isoFormat('D MMMM YYYY') }}</p>

{{-- ============ STATS VENTES ============ --}}
<div class="stats-grid">
    <div class="stat-card violet">
        <div class="icon">💰</div>
        <div class="value">{{ number_format($stats['revenue_total'], 0, ',', ' ') }} F</div>
        <div class="label">Revenu total</div>
    </div>
    <div class="stat-card cyan">
        <div class="icon">📈</div>
        <div class="value">{{ number_format($stats['revenue_month'], 0, ',', ' ') }} F</div>
        <div class="label">Revenu ce mois</div>
    </div>
    <div class="stat-card amber">
        <div class="icon">🧾</div>
        <div class="value">{{ $stats['orders_pending'] }}</div>
        <div class="label">Commandes en attente</div>
    </div>
    <div class="stat-card">
        <div class="icon">🔑</div>
        <div class="value">{{ $stats['licenses_active'] }}<span class="muted" style="font-size:14px;"> / {{ $stats['licenses_total'] }}</span></div>
        <div class="label">Abonnements actifs</div>
    </div>
</div>

{{-- ============ STATS STOCK ============ --}}
<div class="stats-grid">
    <div class="stat-card">
        <div class="icon">💎</div>
        <div class="value">{{ $stats['plans_count'] }}</div>
        <div class="label">Formules en vente</div>
    </div>
    <div class="stat-card">
        <div class="icon">📦</div>
        <div class="value">{{ $stats['products_count'] }}</div>
        <div class="label">Produits en stock</div>
    </div>
    <div class="stat-card amber">
        <div class="icon">⚠️</div>
        <div class="value">{{ $stats['low_stock_count'] }}</div>
        <div class="label">Alertes stock bas</div>
    </div>
    <div class="stat-card">
        <div class="icon">👥</div>
        <div class="value">{{ $stats['users_count'] }}</div>
        <div class="label">Utilisateurs de l'app</div>
    </div>
</div>

<div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:22px;" class="dash-cols">

    {{-- ============ COMMANDES RÉCENTES ============ --}}
    <div class="card">
        <div class="card-title">Dernières commandes <a href="{{ route('admin.orders.index') }}">Tout voir →</a></div>
        <div class="table-wrap">
            <table>
                <thead>
                <tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th><th></th></tr>
                </thead>
                <tbody>
                @forelse($recentOrders as $order)
                    <tr>
                        <td class="mono">{{ $order->reference }}</td>
                        <td>{{ $order->buyer_name }}</td>
                        <td>{{ number_format($order->amount, 0, ',', ' ') }} F</td>
                        <td><span class="badge {{ $order->status }}">{{ ['pending' => '⏳ En attente', 'paid' => '✅ Payée', 'cancelled' => 'Annulée'][$order->status] }}</span></td>
                        <td><a class="btn btn-ghost btn-xs" href="{{ route('admin.orders.show', $order) }}">Détail</a></td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="muted" style="text-align:center; padding:26px;">Aucune commande pour le moment.</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
    </div>

    {{-- ============ ABONNEMENTS EXPIRANT ============ --}}
    <div class="card">
        <div class="card-title">⌛ Abonnements expirant bientôt <a href="{{ route('admin.licenses.index') }}">Tout voir →</a></div>
        @forelse($expiringSoon as $license)
            <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 0; border-bottom:1px solid var(--border);">
                <div>
                    <div style="font-weight:700; font-size:13.5px;">{{ $license->buyer_name }}</div>
                    <div class="muted" style="font-size:11.5px;">{{ $license->plan_name }}</div>
                </div>
                <span class="badge pending">{{ $license->expires_at->diffForHumans() }}</span>
            </div>
        @empty
            <p class="muted" style="text-align:center; padding:20px;">Aucun abonnement n'expire dans les 7 prochains jours 🎉</p>
        @endforelse
    </div>
</div>

<style>@media (max-width: 1000px) { .dash-cols { grid-template-columns: 1fr !important; } }</style>

@endsection
