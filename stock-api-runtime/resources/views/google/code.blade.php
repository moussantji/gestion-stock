<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre code de connexion — StockFlow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: rgb(7,10,18); color: rgb(241,245,249);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 24px;
        }
        .card {
            width: 100%; max-width: 400px;
            background: rgba(148,163,184,0.06); border: 1px solid rgba(148,163,184,0.14);
            border-radius: 20px; padding: 30px 24px; text-align: center;
        }
        .big { font-size: 40px; margin-bottom: 10px; }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
        p.sub { color: rgb(139,152,184); font-size: 13.5px; line-height: 1.55; }
        .code {
            margin: 20px auto 6px; display: inline-block;
            font-family: 'Courier New', monospace; font-size: 30px; font-weight: 800;
            letter-spacing: 3px; color: rgb(34,211,238);
            background: rgba(34,211,238,0.08); border: 1px dashed rgba(34,211,238,0.5);
            border-radius: 14px; padding: 14px 24px;
        }
        .ttl { color: rgb(139,152,184); font-size: 12px; margin-bottom: 18px; }
        .err {
            background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.35);
            color: rgb(248,113,113); border-radius: 12px; padding: 14px; font-size: 13.5px;
            line-height: 1.55; margin-top: 8px; text-align: left;
        }
        .back { display: inline-block; margin-top: 18px; color: rgb(34,211,238); font-size: 13px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        @if($code)
            <div class="big">✅</div>
            <h1>Connexion Google réussie</h1>
            <p class="sub">{{ $email }} — collez ce code dans votre app StockFlow (mobile ou PC) :</p>
            <div class="code">{{ $code }}</div>
            <div class="ttl">⏱ Valide 5 minutes, utilisable une seule fois.</div>
            <p class="sub">Vous pouvez fermer cet onglet une fois le code collé.</p>
        @else
            <div class="big">⚠️</div>
            <h1>Connexion impossible</h1>
            <div class="err">{{ $error }}</div>
            <a class="back" href="{{ route('google.app') }}">← Réessayer</a>
        @endif
    </div>
</body>
</html>
