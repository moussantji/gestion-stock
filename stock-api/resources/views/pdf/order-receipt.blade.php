<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; color: rgb(30,41,59); font-size: 13px; }

    .band { background-color: rgb(11,15,26); color: rgb(255,255,255); padding: 38px 48px 30px; }
    .brand { font-size: 27px; font-weight: bold; }
    .accent { color: rgb(139,92,246); }
    .cyan { color: rgb(34,211,238); }
    .band-sub { color: rgb(139,152,184); font-size: 11px; margin-top: 3px; }
    .doc-type { font-size: 11px; color: rgb(139,152,184); letter-spacing: 4px; text-transform: uppercase; }
    .doc-ref { font-family: DejaVu Sans Mono, monospace; font-size: 16px; color: rgb(34,211,238); font-weight: bold; margin-top: 4px; }

    .wrap { padding: 30px 48px 40px; }

    .h { font-size: 9.5px; color: rgb(148,163,184); text-transform: uppercase; letter-spacing: 1.6px; }
    .v { font-size: 13.5px; font-weight: bold; color: rgb(15,23,42); margin-top: 3px; }
    .v-light { font-size: 12.5px; color: rgb(51,65,85); margin-top: 3px; }

    table { border-collapse: collapse; }
    .tbl-info th, .tbl-info td { vertical-align: top; text-align: left; }

    .status { display: inline-block; padding: 5px 14px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    .status-paid { color: rgb(4,120,87); background-color: rgb(209,250,229); }
    .status-pending { color: rgb(180,83,9); background-color: rgb(254,243,199); }

    .items { width: 100%; margin-top: 30px; }
    .items th { background-color: rgb(11,15,26); color: rgb(255,255,255); font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.2px; padding: 12px 14px; text-align: left; }
    .items td { padding: 13px 14px; border-bottom: 1px solid rgb(226,232,240); font-size: 13px; }
    .right { text-align: right; }
    .total-row td { background-color: rgb(241,245,249); font-weight: bold; font-size: 16px; border-bottom: none; color: rgb(15,23,42); }
    .total-accent { color: rgb(109,40,217); font-size: 17px; }

    .keybox { margin-top: 28px; border: 2px dashed rgb(139,92,246); background-color: rgb(245,243,255); padding: 18px; text-align: center; }
    .keybox .h { color: rgb(124,92,255); }
    .key { font-family: DejaVu Sans Mono, monospace; font-size: 20px; letter-spacing: 2.5px; color: rgb(109,40,217); font-weight: bold; margin-top: 6px; }
    .key-exp { font-size: 11.5px; color: rgb(76,29,149); margin-top: 6px; }

    .thanks { text-align: center; font-weight: bold; color: rgb(15,23,42); font-size: 14px; margin-top: 34px; }
    .footer { margin-top: 26px; padding-top: 18px; border-top: 2px solid rgb(226,232,240); text-align: center; font-size: 10.5px; color: rgb(100,116,139); line-height: 1.7; }
</style>
</head>
<body>

@php $logo = \App\Support\ShopInfo::logoDataUri(); @endphp

{{-- ============ BANDEAU ============ --}}
<div class="band">
    <table width="100%" class="tbl-info">
        <tr>
            <td>
                @if($logo)
                    <img src="{{ $logo }}" alt="" style="height:58px;margin-bottom:8px;">
                @endif
                <div class="brand">◆ Stock<span class="accent">Flow</span></div>
                <div class="band-sub">{{ $shop['address'] }} · {{ $shop['phone'] }} · {{ $shop['email'] }}</div>
            </td>
            <td class="right" style="text-align:right;">
                <div class="doc-type">Reçu de commande</div>
                <div class="doc-ref">{{ $order->reference }}</div>
                <div class="band-sub">{{ $order->created_at->format('d/m/Y à H:i') }}</div>
            </td>
        </tr>
    </table>
</div>

<div class="wrap">

    {{-- ============ CLIENT + STATUT ============ --}}
    <table width="100%" class="tbl-info">
        <tr>
            <td width="55%">
                <div class="h">Facturé à</div>
                <div class="v">{{ $order->buyer_name }}</div>
                <div class="v-light">{{ $order->buyer_email }}</div>
                @if($order->buyer_phone)
                    <div class="v-light">{{ $order->buyer_phone }}</div>
                @endif
            </td>
            <td width="45%" style="text-align:right;">
                <div class="h">Statut</div>
                <div style="margin-top:6px;">
                    @if($order->status === 'paid')
                        <span class="status status-paid">✔ PAYÉE le {{ $order->paid_at?->format('d/m/Y') }}</span>
                    @elseif($order->status === 'pending')
                        <span class="status status-pending">⏳ EN ATTENTE DE PAIEMENT</span>
                    @else
                        <span class="status" style="color:#64748B; background:#e2e8f0;">ANNULÉE</span>
                    @endif
                </div>
                <div class="v-light" style="margin-top:8px;">{{ $order->payment_method }}</div>
            </td>
        </tr>
    </table>

    {{-- ============ ARTICLES ============ --}}
    <table class="items">
        <tr>
            <th width="52%">Désignation</th>
            <th width="16%">Durée</th>
            <th width="16%" class="right">Qté</th>
            <th width="16%" class="right">Montant</th>
        </tr>
        <tr>
            <td>
                <strong>Licence StockFlow — {{ $order->plan_name }}</strong><br>
                <span style="color:#64748B; font-size:11.5px;">
                    {{ $order->plan?->max_users ?? '—' }} utilisateur(s) · {{ number_format($order->plan?->max_products ?? 0, 0, ',', ' ') }} produits max
                </span>
            </td>
            <td>{{ $order->plan?->duration_days ?? '—' }} jours</td>
            <td class="right">1</td>
            <td class="right">{{ number_format($order->amount, 0, ',', ' ') }} F</td>
        </tr>
        <tr class="total-row">
            <td colspan="3"><strong>TOTAL</strong></td>
            <td class="right total-accent">{{ number_format($order->amount, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>

    {{-- ============ 👤 ABONNEMENT (v2.14 — plus de clé) ============ --}}
    @if($order->license)
        <div class="keybox">
            <div class="h">Votre abonnement StockFlow</div>
            <div class="key" style="font-size:15px; letter-spacing:0;">{{ $order->license->buyer_email }}</div>
            <div class="key-exp">
                Expire le <strong>{{ $order->license->expires_at->format('d/m/Y') }}</strong>
                @if($order->license->effective_status === 'active') ✅
                @elseif($order->license->effective_status === 'expired') ⌛ expiré
                @else 🚫 révoqué @endif
            </div>
        </div>
    @endif

    <div class="thanks">{{ $shop['slogan'] }}</div>

    <div class="footer">
        Reçu généré automatiquement par StockFlow — {{ now()->format('d/m/Y H:i') }}<br>
        Suivez votre abonnement à tout moment sur votre espace client du site StockFlow.
    </div>
</div>

</body>
</html>
