<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0b0f1a; font-family:-apple-system, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f1a; padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

                    {{-- Header --}}
                    <tr>
                        <td align="center" style="padding-bottom:24px;">
                            <div style="font-size:26px; font-weight:800; color:#f1f5f9; letter-spacing:-0.5px;">
                                ◆ Stock<span style="color:#7c5cff;">Flow</span>
                            </div>
                            <div style="font-size:12px; color:#8b98b8; margin-top:4px;">Gestion de stock nouvelle génération</div>
                        </td>
                    </tr>

                    {{-- Carte principale --}}
                    <tr>
                        <td style="background-color:#141b2e; border:1px solid #232c47; border-radius:20px; padding:36px 32px;">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td align="center" style="padding-top:24px; font-size:12px; color:#8b98b8; line-height:1.6;">
                            © {{ date('Y') }} StockFlow — <a href="mailto:support@stockflow.app" style="color:#22d3ee; text-decoration:none;">support@stockflow.app</a><br>
                            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
