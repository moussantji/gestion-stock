@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">⌛</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Votre abonnement expire dans {{ $daysLeft }} jour{{ $daysLeft > 1 ? 's' : '' }}
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        Bonjour {{ $license->buyer_name }}, pensez à renouveler pour garder votre accès.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#cbd5e1;">
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Compte</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#22d3ee;">{{ $license->buyer_email }}</td>
        </tr>
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Formule</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#f1f5f9;">{{ $license->plan_name }}</td>
        </tr>
        <tr>
            <td style="padding:9px 0; color:#8b98b8;">Expire le</td>
            <td align="right" style="padding:9px 0; font-weight:800; color:#fbbf24;">{{ $license->expires_at->format('d/m/Y') }}</td>
        </tr>
    </table>

    <div style="text-align:center; margin-top:28px;">
        <a href="{{ $renewUrl }}" style="display:inline-block; background:linear-gradient(135deg, #7c5cff, #22d3ee); color:#ffffff; font-weight:700; font-size:15px; text-decoration:none; padding:14px 30px; border-radius:12px;">
            🔄 Renouveler mon abonnement
        </a>
    </div>

    <p style="color:#8b98b8; font-size:12.5px; text-align:center; margin-top:24px;">
        💡 Renouvelez avec la <strong>même adresse email</strong> : votre abonnement sera prolongé automatiquement.<br>
        Suivez votre abonnement à tout moment sur <a href="{{ url('/compte') }}" style="color:#22d3ee; text-decoration:none; font-weight:700;">votre espace client</a>.
    </p>
@endsection
