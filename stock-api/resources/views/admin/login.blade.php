<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion admin — StockFlow</title>
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
<div class="login-wrap">
    <div class="login-card">
        <div class="login-logo">◆</div>
        <h1>StockFlow <span style="color:var(--primary)">Admin</span></h1>

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
            Réservé aux administrateurs · <a href="{{ route('home') }}" style="color:var(--accent);">← Retour au site</a>
        </p>
    </div>
</div>
</body>
</html>
