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
</head>
<body>
<div class="admin-layout">

    {{-- ============ SIDEBAR ============ --}}
    <aside class="sidebar">
        <div class="logo"><span class="logo-mark">◆</span> StockFlow <span class="muted" style="font-size:11px; font-weight:600;">Admin</span></div>

        <div class="nav-group">Pilotage</div>
        <a class="nav-item {{ request()->routeIs('admin.dashboard') ? 'active' : '' }}" href="{{ route('admin.dashboard') }}">📊 Tableau de bord</a>

        <div class="nav-group">Ventes</div>
        <a class="nav-item {{ request()->routeIs('admin.orders.*') ? 'active' : '' }}" href="{{ route('admin.orders.index') }}">🧾 Commandes</a>
        <a class="nav-item {{ request()->routeIs('admin.licenses.*') ? 'active' : '' }}" href="{{ route('admin.licenses.index') }}">👤 Abonnements</a>
        <a class="nav-item {{ request()->routeIs('admin.plans.*') ? 'active' : '' }}" href="{{ route('admin.plans.index') }}">💎 Formules</a>
        <a class="nav-item {{ request()->routeIs('admin.payments.*') ? 'active' : '' }}" href="{{ route('admin.payments.index') }}">💳 Paiements</a>
        <a class="nav-item {{ request()->routeIs('admin.settings.*') ? 'active' : '' }}" href="{{ route('admin.settings.index') }}">🏪 Boutique</a>

        <div class="nav-group">Équipe</div>
        <a class="nav-item {{ request()->routeIs('admin.users.*') ? 'active' : '' }}" href="{{ route('admin.users.index') }}">👥 Utilisateurs</a>

        <div class="nav-group">Site</div>
        <a class="nav-item" href="{{ route('home') }}" target="_blank">🌐 Voir le site ↗</a>

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
</div>
</body>
</html>
