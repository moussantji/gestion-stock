<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion — StockFlow</title>

    {{-- Icônes + manifest PWA : chemins RELATIFS -> plus d'erreur "icon-192.png" dans la console --}}
    <link rel="icon" type="image/svg+xml" href="{{ asset('icon.svg') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32.png') }}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16.png') }}">
    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <meta name="theme-color" content="#2563eb">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
            background: #f1f5f9;
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            padding: 24px;
            color: #0f172a;
        }
        .card {
            background: #fff;
            width: 100%; max-width: 400px;
            border-radius: 18px;
            box-shadow: 0 10px 40px rgba(15, 23, 42, .10);
            padding: 36px 32px 28px;
        }

        .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
        .brand-logo { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
                      box-shadow: 0 4px 14px rgba(37, 99, 235, .35); }
        .brand-name { font-size: 21px; font-weight: 800; letter-spacing: -.3px; }
        .brand-name span { color: #2563eb; }

        h1 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #64748b; margin-bottom: 22px; }

        .alert {
            background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
            border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500;
            margin-bottom: 16px;
        }

        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        input {
            width: 100%; padding: 12px 14px;
            border: 1.5px solid #e2e8f0; border-radius: 10px;
            font-size: 14px; font-family: inherit;
            background: #f8fafc; color: #0f172a;
            transition: border-color .15s, box-shadow .15s, background .15s;
        }
        input:focus {
            outline: none; border-color: #2563eb; background: #fff;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
        }

        .btn {
            width: 100%; padding: 13px;
            border: none; border-radius: 10px;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit;
            cursor: pointer; margin-top: 4px;
            transition: transform .1s, box-shadow .15s;
            box-shadow: 0 4px 14px rgba(37, 99, 235, .30);
        }
        .btn:hover { box-shadow: 0 6px 20px rgba(37, 99, 235, .40); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }

        .demo {
            margin-top: 24px;
            background: #eff6ff; border: 1px solid #bfdbfe;
            border-radius: 12px; padding: 14px 16px 12px;
        }
        .demo-title { font-size: 12px; font-weight: 700; color: #1d4ed8;
                      text-transform: uppercase; letter-spacing: .4px; margin-bottom: 10px; }
        .demo-row {
            display: flex; justify-content: space-between; align-items: center;
            width: 100%; border: none; background: transparent;
            padding: 6px 8px; margin: 0 -8px; border-radius: 8px;
            font-family: inherit; font-size: 12.5px; cursor: pointer; text-align: left;
        }
        .demo-row:hover { background: #dbeafe; }
        .demo-email { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
                      font-weight: 600; color: #1e293b; }
        .demo-role { color: #64748b; font-size: 12px; }
        .demo-hint { font-size: 11px; color: #60a5fa; margin-top: 8px; text-align: center; }

        footer { margin-top: 18px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
<div class="card">

    <div class="brand">
        {{-- Logo SF intégré en SVG inline : s'affiche même sans copier les PNG --}}
        <svg class="brand-logo" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="sfg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#2563eb"/>
                    <stop offset="1" stop-color="#7c3aed"/>
                </linearGradient>
            </defs>
            <rect width="512" height="512" rx="115" fill="url(#sfg)"/>
            <text x="256" y="268" text-anchor="middle" dominant-baseline="central"
                  font-family="Inter, Arial, sans-serif" font-size="215" font-weight="700" fill="#ffffff">SF</text>
        </svg>
        <div class="brand-name">Stock<span>Flow</span></div>
    </div>

    <h1>Connexion à votre espace</h1>
    <p class="subtitle">Gérez votre boutique en toute simplicité.</p>

    @if($errors->any())
        <div class="alert">{{ $errors->first() }}</div>
    @endif

    {{-- POST vers /login (adapte si ta route de connexion est différente) --}}
    <form method="POST" action="{{ url('/login') }}">
        @csrf
        <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" value="{{ old('email') }}"
                   required autofocus autocomplete="username" placeholder="vous@exemple.com">
        </div>
        <div class="field">
            <label for="password">Mot de passe</label>
            <input id="password" name="password" type="password"
                   required autocomplete="current-password" placeholder="Votre mot de passe">
        </div>
        <button type="submit" class="btn">Se connecter</button>
    </form>

    <div class="demo">
        <div class="demo-title">Comptes de démonstration</div>{{-- coquille corrigée : "Comptables" -> "Comptes" --}}
        <button type="button" class="demo-row" data-email="admin@stock.com">
            <span class="demo-email">admin@stock.com</span>
            <span class="demo-role">password · Administrateur</span>
        </button>
        <button type="button" class="demo-row" data-email="manager@stock.com">
            <span class="demo-email">manager@stock.com</span>
            <span class="demo-role">password · Gérant</span>
        </button>
        <button type="button" class="demo-row" data-email="employe@stock.com">
            <span class="demo-email">employe@stock.com</span>
            <span class="demo-role">password · Employé</span>
        </button>
        <div class="demo-hint">Cliquez sur un compte pour pré-remplir le formulaire</div>
    </div>

    <footer>Réservé au personnel autorisé.</footer>
</div>

<script>
    // Cliquer sur un compte de démo pré-remplit email + mot de passe
    document.querySelectorAll('.demo-row').forEach(function (row) {
        row.addEventListener('click', function () {
            document.getElementById('email').value = row.dataset.email;
            document.getElementById('password').value = 'password';
            document.getElementById('password').focus();
        });
    });
</script>
</body>
</html>
