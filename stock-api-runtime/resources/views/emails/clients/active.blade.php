@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">✅</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Votre abonnement StockFlow est actif
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        Merci {{ $license->buyer_name }} 🙏 Votre paiement a été validé.
    </p>

    {{-- Compte existant --}}
    <div style="background-color:rgba(34,211,238,0.08); border:1px dashed rgba(34,211,238,0.5); border-radius:14px; padding:20px; margin-bottom:26px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
                <td style="padding:6px 0; color:#8b98b8;">Adresse du portail</td>
                <td align="right" style="padding:6px 0; font-weight:700; color:#22d3ee;">{{ url('/compte') }}</td>
            </tr>
            <tr>
                <td style="padding:6px 0; color:#8b98b8;">Email de connexion</td>
                <td align="right" style="padding:6px 0; font-weight:700; color:#f1f5f9;">{{ $license->buyer_email }}</td>
            </tr>
        </table>
        <p style="color:#8b98b8; font-size:12.5px; margin:12px 0 0;">
            Vous avez déjà un compte StockFlow : connectez-vous avec le mot de passe reçu précédemment.
            Mot de passe perdu ? Votre fournisseur peut vous en régénérer un nouveau.
        </p>
    </div>

    {{-- Abonnement --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#cbd5e1;">
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Formule</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#f1f5f9;">{{ $license->plan_name }}</td>
        </tr>
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Montant payé</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#f1f5f9;">{{ number_format($license->price, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr>
            <td style="padding:9px 0; color:#8b98b8;">Fin de validité</td>
            <td align="right" style="padding:9px 0; font-weight:700; color:#34d399;">{{ $license->expires_at->format('d/m/Y') }}</td>
        </tr>
    </table>

    {{-- Bouton connexion --}}
    <div style="text-align:center; margin-top:28px;">
        <a href="{{ url('/compte') }}" style="display:inline-block; background:linear-gradient(135deg, #7c5cff, #22d3ee); color:#ffffff; font-weight:700; font-size:15px; text-decoration:none; padding:14px 30px; border-radius:12px;">
            Me connecter à mon compte
        </a>
    </div>

    <p style="color:#8b98b8; font-size:12.5px; text-align:center; margin-top:24px;">
        Une question ? Répondez simplement à cet email ou contactez votre fournisseur StockFlow.
    </p>
@endsection
