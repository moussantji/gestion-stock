<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; color: #1e293b; font-size: 11.5px; }

    .band { background-color: #0B0F1A; color: #fff; padding: 24px 30px 20px; text-align: center; }
    .brand { font-size: 19px; font-weight: bold; }
    .accent { color: #8B5CF6; }
    .band-sub { color: #8B98B8; font-size: 9.5px; margin-top: 3px; }
    .doc-type { font-size: 9px; color: #22D3EE; letter-spacing: 3px; margin-top: 12px; text-transform: uppercase; }
    .doc-ref { font-family: DejaVu Sans Mono, monospace; font-size: 13.5px; color: #fff; font-weight: bold; margin-top: 3px; }

    .wrap { padding: 18px 30px 26px; }
    .h { font-size: 8.5px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.4px; }
    .v { font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 2px; }
    .v-light { font-size: 10.5px; color: #334155; }

    .meta { width: 100%; margin-bottom: 4px; }
    .meta td { vertical-align: top; padding: 4px 0; }

    .dashed { border-top: 1px dashed #cbd5e1; margin: 10px 0; }

    .items { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .items td { padding: 8px 0; font-size: 11px; }
    .qty { color: #64748B; }
    .right { text-align: right; }
    .line-total td { border-top: 2px solid #0f172a; padding: 10px 0 2px; font-size: 15px; font-weight: bold; }
    .total-accent { color: #6D28D9; font-size: 16px; }

    .thanks { text-align: center; font-weight: bold; color: #0f172a; font-size: 12.5px; margin-top: 18px; }
    .footer { text-align: center; font-size: 9px; color: #64748B; margin-top: 14px; line-height: 1.7; }
    .badge {
        display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 10px;
        background-color: #D1FAE5; color: #047857; font-size: 10px; font-weight: bold; letter-spacing: 2px;
    }
    .badge-credit { background-color: #FEF3C7; color: #B45309; letter-spacing: 1px; }
    .badge-refund { background-color: #FEE2E2; color: #B91C1C; letter-spacing: 1px; }
    .pay-row td { padding: 5px 0 0; font-size: 12px; }
    .pay-due { color: #B45309; font-weight: bold; }
</style>
</head>
<body>

@php $logo = \App\Support\ShopInfo::logoDataUri(); @endphp

{{-- ============ BANDEAU ============ --}}
<div class="band">
    @if($logo)
        <img src="{{ $logo }}" alt="" style="height:54px;margin-bottom:7px;">
    @endif
    <div class="brand">◆ {{ $shop['name'] }}</div>
    <div class="band-sub">{{ $shop['address'] }} · {{ $shop['phone'] }}</div>
    <div class="doc-type">Reçu de vente</div>
    <div class="doc-ref">{{ $receipt->number }}</div>
    <div class="band-sub">{{ $receipt->created_at->format('d/m/Y à H:i') }}</div>
    @if($receipt->isRefunded())
        <div class="badge badge-refund">↩ ANNULÉ — AVOIR ÉMIS</div>
    @elseif($receipt->payment_status === 'paid')
        <div class="badge">✔ PAYÉ</div>
    @elseif($receipt->payment_status === 'partial')
        <div class="badge badge-credit">⏳ PARTIEL — RESTE {{ number_format($receipt->remaining, 0, ',', ' ') }} FCFA</div>
    @else
        <div class="badge badge-credit">⏳ CRÉDIT — À PAYER</div>
    @endif
</div>

<div class="wrap">

    {{-- ============ CLIENT / VENDEUR ============ --}}
    <table class="meta" width="100%">
        <tr>
            <td width="50%">
                <div class="h">Client</div>
                <div class="v">{{ $receipt->client_name ?? 'Client comptoir' }}</div>
                @if($receipt->client_phone)
                    <div class="v-light">{{ $receipt->client_phone }}</div>
                @endif
            </td>
            <td width="50%" class="right">
                <div class="h">Vendeur</div>
                <div class="v">{{ $receipt->user?->name }}</div>
            </td>
        </tr>
    </table>

    <div class="dashed"></div>

    {{-- ============ ARTICLES ============ --}}
    <table class="items" width="100%">
        @foreach($receipt->items as $item)
            <tr>
                <td width="58%">
                    <strong>{{ $item->product_name }}</strong>@if($item->promo ?? false) <span style="background:#F59E0B;color:#fff;border-radius:4px;padding:0 4px;font-size:9px;">PROMO</span>@endif<br>
                    <span class="qty">{{ $item->quantity }} × {{ number_format($item->unit_price, 0, ',', ' ') }} F</span>
                    @if(($item->refunded_qty ?? 0) > 0)
                        <br><span class="qty" style="color:#B91C1C;">↩ {{ $item->refunded_qty }} retourné(s)</span>
                    @endif
                </td>
                <td width="42%" class="right">{{ number_format($item->subtotal, 0, ',', ' ') }} F</td>
            </tr>
        @endforeach
        <tr class="line-total">
            <td>TOTAL</td>
            <td class="right total-accent">{{ number_format($receipt->total, 0, ',', ' ') }} FCFA</td>
        </tr>
        {{-- 🧮 v2.9 : ventilation TVA de présentation (prix TTC, 0 ligne = masquée) --}}
        @if(($tva['enabled'] ?? false) && count($tva['by_rate'] ?? []) > 0)
            <tr>
                <td class="qty">dont HT</td>
                <td class="right qty">{{ number_format($tva['total_ht'], 0, ',', ' ') }} F</td>
            </tr>
            @foreach($tva['by_rate'] as $row)
                <tr>
                    <td class="qty">dont TVA {{ $row['rate'] }} %</td>
                    <td class="right qty">{{ number_format($row['amount'], 0, ',', ' ') }} F</td>
                </tr>
            @endforeach
        @endif
        {{-- 🎁 Remise fidélité (points convertis) --}}
        @if(($receipt->points_discount ?? 0) > 0)
            <tr class="pay-row">
                <td>🎁 Remise fidélité ({{ $receipt->points_redeemed }} pts)</td>
                <td class="right">− {{ number_format($receipt->points_discount, 0, ',', ' ') }} FCFA</td>
            </tr>
            <tr class="line-total">
                <td>NET À PAYER</td>
                <td class="right total-accent">{{ number_format($receipt->total - $receipt->points_discount, 0, ',', ' ') }} FCFA</td>
            </tr>
        @endif
        {{-- 💳 Paiement partiel / crédit client --}}
        @if($receipt->remaining > 0)
            <tr class="pay-row">
                <td>Payé</td>
                <td class="right">{{ number_format($receipt->amount_paid, 0, ',', ' ') }} FCFA</td>
            </tr>
            <tr class="pay-row">
                <td class="pay-due">RESTE À PAYER</td>
                <td class="right pay-due">{{ number_format($receipt->remaining, 0, ',', ' ') }} FCFA</td>
            </tr>
        @endif
    </table>

    <div class="dashed"></div>

    <div class="thanks">{{ $shop['slogan'] }}</div>

    <div class="footer">
        Reçu n° {{ $receipt->number }} — généré avec StockFlow ◆ {{ now()->format('d/m/Y H:i') }}<br>
        Les articles vendus ne sont ni repris ni échangés.
    </div>
</div>

</body>
</html>
