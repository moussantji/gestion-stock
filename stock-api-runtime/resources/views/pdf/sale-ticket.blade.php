<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    {{--
      🖨 TICKET 80mm — optimisé imprimante thermique :
      - noir & blanc uniquement (pas d'encre couleur ni de fond)
        - police monospace lisible en petite taille
      - largeur utile ~210 pt (papier 226.77pt)
    --}}
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: "DejaVu Sans Mono", monospace;
        color: #000;
        font-size: 8.5pt;
        padding: 10pt 8pt 16pt;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 7pt; }
    .logo { height: 34px; margin-bottom: 4px; }
    .shop-name { font-size: 12pt; font-weight: bold; letter-spacing: 0.5px; }
    .muted { color: #222; }
    hr.dash { border: none; border-top: 1px dashed #000; margin: 6pt 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1.5pt 0; }
    .right { text-align: right; }
    .items td { font-size: 8pt; }
    .item-name { padding-top: 3pt; }
    .total-row td {
        font-size: 11.5pt; font-weight: bold;
        border-top: 1.5pt solid #000; border-bottom: 1.5pt solid #000;
        padding: 4pt 0;
    }
    .thanks { font-size: 9.5pt; font-weight: bold; letter-spacing: 1px; margin-top: 8pt; }
</style>
</head>
<body>

@php $logo = \App\Support\ShopInfo::logoDataUri(); @endphp

{{-- ============ EN-TÊTE BOUTIQUE ============ --}}
<div class="center">
    @if($logo)
        <img src="{{ $logo }}" alt="" class="logo"><br>
    @endif
    <div class="shop-name">{{ $shop['name'] }}</div>
    <div class="small">{{ $shop['address'] }}</div>
    <div class="small">Tél : {{ $shop['phone'] }}</div>
</div>

<hr class="dash">

{{-- ============ MÉTA ============ --}}
<table>
    <tr>
        <td>{{ $receipt->number }}</td>
        <td class="right">{{ $receipt->created_at->format('d/m/Y H:i') }}</td>
    </tr>
    <tr>
        <td colspan="2" class="small">
            Client : {{ $receipt->client_name ?? 'Client comptoir' }}<br>
            Vendeur : {{ $receipt->user?->name }}
        </td>
    </tr>
</table>

<hr class="dash">

{{-- ============ ARTICLES ============ --}}
<table class="items">
    @foreach($receipt->items as $item)
        <tr>
            <td colspan="2" class="item-name bold">{{ $item->product_name }}@if($item->promo ?? false) <span style="color:#B45309;">[PROMO]</span>@endif</td>
        </tr>
        <tr>
            <td class="muted">{{ $item->quantity }} × {{ number_format($item->unit_price, 0, ',', ' ') }} F</td>
            <td class="right bold">{{ number_format($item->subtotal, 0, ',', ' ') }} F</td>
        </tr>
        {{-- 🧾 v2.12 : avoir partiel sur la ligne (gardé — absent sans retour) --}}
        @if(($item->refunded_qty ?? 0) > 0)
        <tr>
            <td colspan="2" class="qty" style="color:#B91C1C;">↩ {{ $item->refunded_qty }} retourné(s) remboursé(s)</td>
        </tr>
        @endif
    @endforeach
</table>

<hr class="dash">

{{-- ============ TOTAL ============ --}}
@php $avoir = 0; foreach ($receipt->items as $i) { $avoir += (int) ($i->refunded_qty ?? 0) * (int) ($i->unit_price ?? 0); } @endphp
<table>
    <tr class="total-row">
        <td>TOTAL</td>
        <td class="right">{{ number_format($receipt->total, 0, ',', ' ') }} FCFA</td>
    </tr>
    {{-- 🧾 v2.12 : récap avoirs (présentation — absent sans retour) --}}
    @if($avoir > 0)
        <tr>
            <td class="qty" style="color:#B91C1C;">Avoir (retours)</td>
            <td class="right qty" style="color:#B91C1C;">- {{ number_format($avoir, 0, ',', ' ') }} F</td>
        </tr>
        <tr class="total-row">
            <td>TOTAL NET</td>
            <td class="right">{{ number_format(max(0, $receipt->total - $avoir), 0, ',', ' ') }} FCFA</td>
        </tr>
    @endif
    {{-- 🧮 v2.9 : ventilation TVA de présentation --}}
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
        <tr>
            <td>FIDELITE -{{ $receipt->points_redeemed }} pts</td>
            <td class="right">-{{ number_format($receipt->points_discount, 0, ',', ' ') }} F</td>
        </tr>
        <tr class="total-row">
            <td class="bold">NET A PAYER</td>
            <td class="right bold">{{ number_format($receipt->total - $receipt->points_discount, 0, ',', ' ') }} F</td>
        </tr>
    @endif
    {{-- 💳 Paiement partiel / crédit client --}}
    @if($receipt->remaining > 0)
        <tr>
            <td>Payé</td>
            <td class="right">{{ number_format($receipt->amount_paid, 0, ',', ' ') }} F</td>
        </tr>
        <tr>
            <td class="bold">RESTE A PAYER</td>
            <td class="right bold">{{ number_format($receipt->remaining, 0, ',', ' ') }} F</td>
        </tr>
    @endif
</table>
<div class="center small" style="margin-top:2pt;">
    {{ $receipt->items->count() }} article(s) ·
    @if($receipt->isRefunded())
        ↩ ANNULE - AVOIR
    @elseif($receipt->payment_status === 'paid')
        Payé ✔
    @else
        ⚠ CREDIT : reste {{ number_format($receipt->remaining, 0, ',', ' ') }} F
    @endif
</div>

<hr class="dash">

{{-- ============ PIED ============ --}}
<div class="center">
    <div class="thanks">MERCI !</div>
    @if($shop['slogan'])
        <div class="small" style="margin-top:2pt;">{{ $shop['slogan'] }}</div>
    @endif
    <div class="small" style="margin-top:6pt;">◆ {{ $shop['name'] }} · {{ $receipt->number }}</div>
</div>

</body>
</html>
