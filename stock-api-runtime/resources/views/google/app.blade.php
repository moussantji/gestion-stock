<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion Google — StockFlow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: rgb(7,10,18); color: rgb(241,245,249);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 24px;
        }
        .card {
            width: 100%; max-width: 380px;
            background: rgba(148,163,184,0.06); border: 1px solid rgba(148,163,184,0.14);
            border-radius: 20px; padding: 30px 24px; text-align: center;
        }
        .logo {
            width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 16px;
            background: linear-gradient(135deg, rgb(124,92,255), rgb(34,211,238));
            display: flex; align-items: center; justify-content: center;
            font-size: 24px; color: rgb(255,255,255); font-weight: 800;
        }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        p.sub { color: rgb(139,152,184); font-size: 13.5px; margin-bottom: 24px; }
        .g-box { display: flex; justify-content: center; min-height: 44px; }
        .warn {
            background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.35);
            color: rgb(251,191,36); border-radius: 12px; padding: 13px 14px; font-size: 13px; line-height: 1.5;
        }
        .back { display: inline-block; margin-top: 18px; color: rgb(34,211,238); font-size: 13px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">◆</div>
        <h1>Connexion à StockFlow</h1>
        <p class="sub">Choisissez votre compte Google — un code à coller dans l'app s'affichera ensuite.</p>

        @if($clientId)
            {{-- Bouton Google officiel (Google Identity Services) --}}
            <script src="https://accounts.google.com/gsi/client" async defer></script>
            <div id="g_id_onload"
                 data-client_id="{{ $clientId }}"
                 data-login_uri="{{ $callbackUrl }}"
                 data-auto_prompt="false">
            </div>
            <div class="g-box">
                <div class="g_id_signin"
                     data-type="standard"
                     data-size="large"
                     data-theme="filled_black"
                     data-text="continue_with"
                     data-shape="rectangular"
                     data-logo_alignment="left"
                     data-width="280">
                </div>
            </div>
        @else
            <div class="warn">
                ⚠️ Connexion Google non configurée sur ce serveur.<br>
                <span style="color:rgb(139,152,184);">GOOGLE_CLIENT_ID est absent du fichier .env — utilisez email + mot de passe dans l'app.</span>
            </div>
        @endif

        <a class="back" href="{{ route('client.login') }}">← Retour à l'espace client</a>
    </div>
</body>
</html>
