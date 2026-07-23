<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Admin — StockFlow')</title>
    <link rel="icon" type="image/svg+xml" href="{{ asset('icon.svg') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <meta name="theme-color" content="#2563eb">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
    <link rel="stylesheet" href="{{ asset('css/admin-dashboard.css') }}">
    @php
        $themeRaw = \App\Support\Setting::getText('theme_config');
        $theme = json_decode($themeRaw, true) ?: [];
        $themeCustom = is_array($theme['custom'] ?? null) ? $theme['custom'] : [];
        $themePalettes = [
            'plumCoral' => ['primary' => '#E56B8C', 'accent' => '#FF9A8B', 'success' => '#64D6A0', 'danger' => '#FF6B6B', 'warning' => '#F6C85F'],
            'violetCyan' => ['primary' => '#7C5CFF', 'accent' => '#22D3EE', 'success' => '#34D399', 'danger' => '#F87171', 'warning' => '#FBBF24'],
            'indigoTurquoise' => ['primary' => '#6478FF', 'accent' => '#2DD4BF', 'success' => '#6EE7B7', 'danger' => '#FB7185', 'warning' => '#FACC15'],
        ];
        $themeColors = array_merge($themePalettes['plumCoral'], $themePalettes[$theme['paletteId'] ?? 'plumCoral'] ?? [], $themeCustom);
    @endphp
    <style>:root { @foreach($themeColors as $key => $value) @if(preg_match('/^#[0-9A-Fa-f]{6}$/', (string) $value)) --{{ strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $key)) }}: {{ $value }}; @endif @endforeach }</style>
</head>
<body>
<div class="admin-layout">

    {{-- ============ SIDEBAR ============ --}}
    <aside class="sidebar">
        <div class="logo">
            @if(\App\Support\ShopInfo::logoUrl())
                <img class="logo-image" src="{{ \App\Support\ShopInfo::logoUrl() }}" alt="Logo">
            @else
                <span class="logo-mark">◆</span>
            @endif
            <span>{{ config('shop.name', config('app.name', 'StockFlow')) }}</span>
            <span class="muted" style="font-size:11px; font-weight:600;">Gestion</span>
        </div>

        <div class="nav-group">Pilotage</div>
        <a class="nav-item {{ request()->routeIs('admin.dashboard') ? 'active' : '' }}" href="{{ route('admin.dashboard') }}">📊 Tableau de bord</a>
        <a class="nav-item {{ request()->routeIs('admin.stats.*') ? 'active' : '' }}" href="{{ route('admin.stats.index') }}">↗ Statistiques</a>
        <a class="nav-item {{ request()->routeIs('admin.cash.*') ? 'active' : '' }}" href="{{ route('admin.cash.index') }}">◉ Caisse</a>

        <div class="nav-group">Stock</div>
        <a class="nav-item {{ request()->routeIs('admin.products.*') ? 'active' : '' }}" href="{{ route('admin.products.index') }}">▣ Produits</a>
        <a class="nav-item {{ request()->routeIs('admin.movements.*') ? 'active' : '' }}" href="{{ route('admin.movements.index') }}">↕ Mouvements</a>
        <a class="nav-item {{ request()->routeIs('admin.inventories.*') ? 'active' : '' }}" href="{{ route('admin.inventories.index') }}">▤ Inventaires</a>
        <a class="nav-item {{ request()->routeIs('admin.alerts.*') ? 'active' : '' }}" href="{{ route('admin.alerts.index') }}">! Alertes stock</a>

        <div class="nav-group">Approvisionnement</div>
        <a class="nav-item {{ request()->routeIs('admin.suppliers.*') ? 'active' : '' }}" href="{{ route('admin.suppliers.index') }}">▱ Fournisseurs</a>
        <a class="nav-item {{ request()->routeIs('admin.purchase-orders.*') ? 'active' : '' }}" href="{{ route('admin.purchase-orders.index') }}">▤ Bons de commande</a>

        <div class="nav-group">Ventes</div>
        <a class="nav-item {{ request()->routeIs('admin.sales.*') ? 'active' : '' }}" href="{{ route('admin.sales.index') }}">▣ Ventes et reçus</a>
        <a class="nav-item {{ request()->routeIs('admin.customers.*') ? 'active' : '' }}" href="{{ route('admin.customers.index') }}">◉ Clients</a>
        @if(env('LICENSE_SALES_ENABLED', false))
            <a class="nav-item {{ request()->routeIs('admin.orders.*') ? 'active' : '' }}" href="{{ route('admin.orders.index') }}">🧾 Commandes</a>
            <a class="nav-item {{ request()->routeIs('admin.licenses.*') ? 'active' : '' }}" href="{{ route('admin.licenses.index') }}">👤 Abonnements</a>
            <a class="nav-item {{ request()->routeIs('admin.plans.*') ? 'active' : '' }}" href="{{ route('admin.plans.index') }}">💎 Formules</a>
            <a class="nav-item {{ request()->routeIs('admin.payments.*') ? 'active' : '' }}" href="{{ route('admin.payments.index') }}">💳 Paiements</a>
        @endif
        <a class="nav-item {{ request()->routeIs('admin.settings.*') ? 'active' : '' }}" href="{{ route('admin.settings.index') }}">🏪 Entreprise</a>

        <div class="nav-group">Équipe</div>
        <a class="nav-item {{ request()->routeIs('admin.users.*') ? 'active' : '' }}" href="{{ route('admin.users.index') }}">👥 Utilisateurs</a>

        <div class="nav-group">Système</div>
        <a class="nav-item" href="{{ route('admin.settings.index') }}">⚙️ Paramètres de l’entreprise</a>

        <div class="sidebar-footer">
            <div class="muted" style="font-size:12.5px; padding: 0 10px 8px;">
                👤 {{ auth()->user()->name }}
            </div>
            <form method="POST" action="{{ route('admin.logout') }}">
                @csrf
                <button type="submit">🚪 Déconnexion</button>
            </form>
        </div>
    </aside>

    {{-- ============ CONTENU ============ --}}
    <main class="main">
        @if(session('success'))
            <div class="flash success">{{ session('success') }}</div>
        @endif
        @if(session('error'))
            <div class="flash error">{{ session('error') }}</div>
        @endif
        {{-- 👤 v2.14 : mot de passe du NOUVEAU compte client, affiché une seule fois --}}
        @if(session('subscription_password'))
            <div class="flash success" style="border:1px solid var(--accent); text-align:center;">
                👤 <strong>Mot de passe du compte client (affiché 1 seule fois) :</strong><br>
                <code style="font-size:19px; letter-spacing:1.5px; color:var(--accent); font-weight:800;">{{ session('subscription_password') }}</code>
                <div class="muted" style="font-size:12.5px; margin-top:5px;">Partagez-le au client (WhatsApp…) avec cette adresse : {{ url('/compte') }} — il ne sera plus affiché.</div>
            </div>
        @endif

        @yield('content')
    </main>
    <nav class="admin-mobile-nav" aria-label="Navigation mobile">
        <a href="{{ route('admin.dashboard') }}" class="{{ request()->routeIs('admin.dashboard') ? 'active' : '' }}"><span>⌂</span><small>Accueil</small></a>
        <a href="{{ route('admin.products.index') }}" class="{{ request()->routeIs('admin.products.*') ? 'active' : '' }}"><span>▣</span><small>Stock</small></a>
        <a href="{{ route('admin.sales.index') }}" class="{{ request()->routeIs('admin.sales.*') ? 'active' : '' }}"><span>↗</span><small>Ventes</small></a>
        <a href="{{ route('admin.cash.index') }}" class="{{ request()->routeIs('admin.cash.*') ? 'active' : '' }}"><span>◈</span><small>Caisse</small></a>
        <a href="{{ route('admin.stats.index') }}" class="{{ request()->routeIs('admin.stats.*') ? 'active' : '' }}"><span>⌁</span><small>Stats</small></a>
    </nav>
</div>
</body>
</html>
