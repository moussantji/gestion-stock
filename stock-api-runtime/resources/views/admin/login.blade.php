<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion — {{ $companyName ?? config('shop.name', config('app.name', 'StockFlow')) }}</title>
    <link rel="icon" type="image/svg+xml" href="{{ asset('icon.svg') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <meta name="theme-color" content="#2563eb">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
    @php
        $themeRaw = \App\Support\Setting::getText('theme_config');
        $theme = json_decode($themeRaw, true) ?: [];
        $custom = is_array($theme['custom'] ?? null) ? $theme['custom'] : [];
    @endphp
    <style>:root { @foreach($custom as $key => $value) @if(preg_match('/^#[0-9A-Fa-f]{6}$/', (string) $value)) --{{ strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $key)) }}: {{ $value }}; @endif @endforeach }</style>
</head>
<body>
<div class="login-wrap">
    <div class="login-card">
        @if(!empty($companyLogo))
            <img class="login-logo login-logo-image" src="{{ $companyLogo }}" alt="Logo {{ $companyName ?? config('shop.name', 'StockFlow') }}">
        @else
            <div class="login-logo">◆</div>
        @endif
        <div class="login-kicker">ESPACE DE GESTION</div>
        <h1>{{ $companyName ?? config('shop.name', config('app.name', 'StockFlow')) }}</h1>

        @if($errors->any())
            <div class="flash error">{{ $errors->first() }}</div>
        @endif

        <form method="POST" action="{{ route('login.post') }}">
            @csrf
            <div class="field">
                <label for="email">Email</label>
                <input class="input" type="email" id="email" name="email" value="{{ old('email') }}" required autofocus>
            </div>
            <div class="field">
                <label for="password">Mot de passe</label>
                <input class="input" type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; padding:13px;">Se connecter</button>
        </form>

        <p class="muted" style="text-align:center; font-size:12.5px; margin-top:20px;">
            Connectez-vous pour gérer les stocks, ventes et utilisateurs.
        </p>
    </div>
</div>
</body>
</html>
