@extends('layouts.admin')

@section('title', 'Tableau de bord — ' . config('shop.name', config('app.name', 'StockFlow')))

@section('content')
@php
    $maxRevenue = max(1, max($chart['revenue'] ?? [0]));
    $money = fn ($value) => number_format((float) $value, 0, ',', ' ') . ' F';
@endphp

<div class="page-heading">
    <div>
        <div class="eyebrow">PILOTAGE DE L’ENTREPRISE</div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-sub">Vue claire de votre stock, vos ventes et votre activité.</p>
    </div>
    <a class="btn btn-primary" href="{{ route('admin.settings.index') }}">Paramètres entreprise</a>
</div>
@if($stats['low_stock_count'] > 0 || $stats['out_of_stock_count'] > 0)
<div class="stock-alert-banner"><div class="alert-symbol">!</div><div><strong>Attention au stock</strong><span>{{ $stats['low_stock_count'] }} produit(s) sous le seuil · {{ $stats['out_of_stock_count'] }} rupture(s)</span></div><button class="btn btn-xs btn-ghost" id="enable-stock-notifications" type="button">Activer les notifications</button><a href="{{ route('admin.alerts.index', ['kind' => 'low']) }}">Voir les alertes</a></div>
@endif

<div class="quick-actions">
    <a class="quick-action primary" href="{{ route('admin.sales.create') }}"><span>↗</span><strong>Nouvelle vente</strong><small>Ouvrir la caisse</small></a>
    <a class="quick-action" href="{{ route('admin.movements.create') }}"><span>↕</span><strong>Entrée de stock</strong><small>Ajouter un mouvement</small></a>
    <a class="quick-action" href="{{ route('admin.inventories.create') }}"><span>▤</span><strong>Nouvel inventaire</strong><small>Compter le stock</small></a>
</div>
<div class="export-bar"><span>Exports rapides</span><a href="{{ route('admin.exports.products') }}">Produits CSV</a><a href="{{ route('admin.exports.movements') }}">Mouvements CSV</a><a href="{{ route('admin.exports.sales') }}">Ventes CSV</a></div>

<div class="stats-grid">
    <div class="stat-card violet"><div class="icon">◈</div><div class="value">{{ $money($stats['stock_value']) }}</div><div class="label">Valeur du stock</div></div>
    <div class="stat-card cyan"><div class="icon">↗</div><div class="value">{{ $money($stats['sales_today']) }}</div><div class="label">Ventes aujourd’hui</div></div>
    <div class="stat-card"><div class="icon">▣</div><div class="value">{{ $stats['products_count'] }}</div><div class="label">Produits référencés</div></div>
    <div class="stat-card amber"><div class="icon">!</div><div class="value">{{ $stats['low_stock_count'] }}</div><div class="label">Alertes stock bas</div></div>
</div>

<div class="stats-grid compact-stats">
    <div class="mini-stat"><strong>{{ $money($stats['sales_month']) }}</strong><span>Ventes ce mois</span></div>
    <div class="mini-stat"><strong>{{ $stats['receipts_count'] }}</strong><span>Reçus enregistrés</span></div>
    <div class="mini-stat"><strong>{{ $stats['movements_today'] }}</strong><span>Mouvements aujourd’hui</span></div>
    <div class="mini-stat"><strong>{{ $stats['customers_count'] }}</strong><span>Clients</span></div>
    <div class="mini-stat"><strong>{{ $stats['suppliers_count'] }}</strong><span>Fournisseurs</span></div>
</div>

<div class="dash-cols">
    <div class="card chart-card">
        <div class="card-title"><span><span class="title-icon">⌁</span> Évolution des ventes</span><span class="muted card-period">7 derniers jours</span></div>
        <div class="sales-bars" aria-label="Graphique des ventes des 7 derniers jours">
            @foreach($chart['revenue'] as $index => $revenue)
                <div class="sales-bar-col">
                    <div class="sales-bar-value">{{ $revenue > 0 ? $money($revenue) : '' }}</div>
                    <div class="sales-bar" style="height: {{ max(6, round(($revenue / $maxRevenue) * 150)) }}px;"></div>
                    <span>{{ $chart['labels'][$index] }}</span>
                </div>
            @endforeach
        </div>
        <div class="chart-caption"><span><i class="dot dot-primary"></i> Chiffre d’affaires</span><span>{{ $money($stats['sales_month']) }} ce mois</span></div>
    </div>

    <div class="card">
        <div class="card-title"><span><span class="title-icon">!</span> Stock à surveiller</span><span class="badge warning">{{ $stats['low_stock_count'] }}</span></div>
        @forelse($lowStockProducts as $product)
            <div class="stock-row">
                <div class="stock-avatar">{{ mb_strtoupper(mb_substr($product->name, 0, 1)) }}</div>
                <div class="stock-info"><strong>{{ $product->name }}</strong><span>Seuil : {{ $product->alert_threshold }}</span></div>
                <span class="stock-qty {{ $product->quantity === 0 ? 'danger' : '' }}">{{ $product->quantity }}</span>
            </div>
        @empty
            <div class="empty-inline">Aucune alerte de stock.</div>
        @endforelse
    </div>
</div>

<div class="card">
    <div class="card-title"><span><span class="title-icon">▣</span> Dernières ventes</span><span class="muted">{{ $stats['receipts_count'] }} reçus au total</span></div>
    <div class="table-wrap">
        <table>
            <thead><tr><th>Reçu</th><th>Client</th><th>Vendeur</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
            @forelse($recentReceipts as $receipt)
                <tr>
                    <td class="mono">{{ $receipt->number }}</td>
                    <td>{{ $receipt->customer?->name ?? $receipt->client_name ?? 'Client comptant' }}</td>
                    <td>{{ $receipt->user?->name ?? '—' }}</td>
                    <td class="amount-cell">{{ $money($receipt->total) }}</td>
                    <td class="muted">{{ $receipt->created_at->format('d/m/Y H:i') }}</td>
                </tr>
            @empty
                <tr><td colspan="5" class="muted table-empty">Aucune vente enregistrée.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>

@if(env('LICENSE_SALES_ENABLED', false) && $expiringSoon->count())
<div class="card legacy-card">
    <div class="card-title">Anciens abonnements expirant bientôt</div>
    @foreach($expiringSoon as $license)<div class="stock-row"><div class="stock-info"><strong>{{ $license->buyer_name }}</strong><span>{{ $license->plan_name }}</span></div><span class="badge warning">{{ $license->expires_at->diffForHumans() }}</span></div>@endforeach
</div>
@endif
@if($stats['low_stock_count'] > 0 || $stats['out_of_stock_count'] > 0)
<script>
const stockNotificationBody = '{{ $stats['low_stock_count'] }} produit(s) sous le seuil, {{ $stats['out_of_stock_count'] }} rupture(s).';
const notifyStock = () => { if ('Notification' in window && Notification.permission === 'granted' && !sessionStorage.getItem('stockflow_stock_notified')) { new Notification('Alerte stock — {{ config('shop.name', 'StockFlow') }}', { body: stockNotificationBody }); sessionStorage.setItem('stockflow_stock_notified', '1'); } };
const enableStockNotifications = document.getElementById('enable-stock-notifications');
if (enableStockNotifications && 'Notification' in window) { enableStockNotifications.addEventListener('click', async () => { await Notification.requestPermission(); notifyStock(); enableStockNotifications.textContent = Notification.permission === 'granted' ? 'Notifications activées' : 'Notifications refusées'; }); if (Notification.permission === 'granted') notifyStock(); }
</script>
@endif
@endsection
