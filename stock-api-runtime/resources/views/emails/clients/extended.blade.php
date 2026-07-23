@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">🔁</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Votre abonnement a été prolongé !
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        Merci {{ $license->buyer_name }} 🙏 Votre renouvellement est confirmé — mêmes identifiants, même compte.
    </p>

    {{-- Abonnement prolongé --}}
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
            <td style="padding:9px 0; color:#8b98b8;">Nouvelle fin de validité</td>
            <td align="right" style="padding:9px 0; font-weight:800; color:#34d399;">{{ $license->expires_at->format('d/m/Y') }}</td>
        </tr>
    </table>

    <div style="background-color:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.35); border-radius:14px; padding:16px 18px; margin-top:24px; font-size:13.5px; color:#a7f3d0;">
        ✅ <strong>Rien à refaire de votre côté</strong> : votre compte (<span style="font-family:'Courier New', monospace;">{{ $license->buyer_email }}</span>) et votre mot de passe restent inchangés.
    </div>

    {{-- Bouton connexion --}}
    <div style="text-align:center; margin-top:28px;">
        <a href="{{ url('/compte') }}" style="display:inline-block; background:linear-gradient(135deg, #7c5cff, #22d3ee); color:#ffffff; font-weight:700; font-size:15px; text-decoration:none; padding:14px 30px; border-radius:12px;">
            Voir mon abonnement
        </a>
    </div>

    <p style="color:#8b98b8; font-size:12.5px; text-align:center; margin-top:24px;">
        Votre nouveau reçu est disponible dans votre espace client, rubrique « Commandes ».
    </p>
@endsection
