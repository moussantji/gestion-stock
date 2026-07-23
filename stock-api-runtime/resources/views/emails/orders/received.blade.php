@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">✅</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Commande bien reçue !
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        Merci {{ $order->buyer_name }} 🙏 Il ne reste plus qu'à payer.
    </p>

    {{-- Récap --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#cbd5e1; margin-bottom:24px;">
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Référence</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#22d3ee; font-family:'Courier New', monospace;">{{ $order->reference }}</td>
        </tr>
        <tr>
            <td style="padding:9px 0; border-bottom:1px solid #232c47; color:#8b98b8;">Formule</td>
            <td align="right" style="padding:9px 0; border-bottom:1px solid #232c47; font-weight:700; color:#f1f5f9;">{{ $order->plan_name }}</td>
        </tr>
        <tr>
            <td style="padding:9px 0; color:#8b98b8;">Montant à payer</td>
            <td align="right" style="padding:9px 0; font-weight:800; color:#f1f5f9; font-size:17px;">{{ number_format($order->amount, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>

    {{-- Étapes de paiement --}}
    <div style="background-color:rgba(124,92,252,0.08); border:1px solid rgba(124,92,252,0.3); border-radius:14px; padding:20px 22px;">
        <div style="font-size:15px; font-weight:800; color:#f1f5f9; margin-bottom:8px;">
            {{ $method?->icon ?? '💳' }} Paiement : {{ $order->payment_method }}
        </div>

        @if($method?->account)
            <div style="font-size:13.5px; color:#22d3ee; font-weight:700; margin-bottom:10px;">
                📱 {{ $method->account }}
            </div>
        @endif

        <ol style="margin:0; padding-left:18px; color:#cbd5e1; font-size:13.5px; line-height:1.8;">
            @foreach($method?->steps() ?? ['Payez le montant exact en indiquant votre référence de commande.'] as $step)
                <li>{{ $step }}</li>
            @endforeach
        </ol>
    </div>

    <p style="color:#8b98b8; font-size:12.5px; text-align:center; margin-top:24px;">
        ⏱ Dès réception de votre paiement, nous créons votre compte client <strong style="color:#cbd5e1;">sous 24h</strong>
        et vous la livrons par email.
    </p>
@endsection
