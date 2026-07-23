<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    {{--
      📦 BON DE COMMANDE A4 — style « corporate premium » :
      sobre (le fournisseur reçoit ce document), bandeau sombre + accents violets.
      dompdf-safe : tables + styles inline uniquement.
    --}}
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; color: #1e293b; font-size: 12.5px; }

    .band { background-color: #0B0F1A; color: #ffffff; padding: 30px 46px 26px; }
    .brand { font-size: 24px; font-weight: bold; }
    .accent { color: #8B5CF6; }
    .band-sub { color: #8B98B8; font-size: 10.5px; margin-top: 3px; }
    .doc-type { font-size: 10.5px; color: #22D3EE; letter-spacing: 3.5px; text-transform: uppercase; }
    .doc-ref { font-family: DejaVu Sans Mono, monospace; font-size: 15px; color: #22D3EE; font-weight: bold; margin-top: 3px; }

    .wrap { padding: 26px 46px 38px; }
    .h { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; }
    .v { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
    .v-light { font-size: 11.5px; color: #334155; margin-top: 2px; }
    td { vertical-align: top; }

    .items { width: 100%; border-collapse: collapse; margin-top: 22px; }
    .items th { background-color: #0B0F1A; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 1.1px; padding: 10px 12px; text-align: left; }
    .items td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; }
    .right { text-align: right; }
    .total-row td { background-color: #F1F5F9; font-weight: bold; font-size: 14.5px; border-bottom: none; }
    .total-accent { color: #6D28D9; }

    .badge { display: inline-block; padding: 4px 13px; border-radius: 10px; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; }
    .badge-draft { background-color: #FEF3C7; color: #B45309; }
    .badge-sent { background-color: #DBEAFE; color: #1D4ED8; }
    .badge-received { background-color: #D1FAE5; color: #047857; }
    .badge-cancelled { background-color: #FEE2E2; color: #B91C1C; }

    .notes { margin-top: 20px; background-color: #F8FAFC; border-left: 3px solid #8B5CF6; padding: 12px 14px; font-size: 11.5px; color: #334155; }
    .sign { margin-top: 46px; width: 100%; }
    .sign-box { border-top: 1.5px solid #0f172a; width: 200px; padding-top: 6px; font-size: 10.5px; color: #475569; text-align: center; }
    .footer { margin-top: 34px; text-align: center; font-size: 10px; color: #64748B; line-height: 1.7; }
</style>
</head>
<body>

@php $logo = \App\Support\ShopInfo::logoDataUri(); @endphp

{{-- ============ BANDEAU ============ --}}
<div class="band">
    <table width="100%">
        <tr>
            <td>
                @if($logo)
                    <img src="{{ $logo }}" alt="" style="height:54px;margin-bottom:8px;">
                @endif
                <div class="brand">◆ {{ $shop['name'] }}</div>
                <div class="band-sub">{{ $shop['address'] }} · {{ $shop['phone'] }} · {{ $shop['email'] }}</div>
            </td>
            <td class="right" style="text-align:right;">
                <div class="doc-type">Bon de commande</div>
                <div class="doc-ref">{{ $order->number }}</div>
                <div class="band-sub">{{ $order->created_at->format('d/m/Y à H:i') }}</div>
            </td>
        </tr>
    </table>
</div>

<div class="wrap">

    {{-- ============ FOURNISSEUR + ÉMETTEUR ============ --}}
    <table width="100%">
        <tr>
            <td width="50%">
                <div class="h">Fournisseur</div>
                <div class="v">{{ $order->supplier?->name ?? '—' }}</div>
                @if($order->supplier?->phone)
                    <div class="v-light">Tél : {{ $order->supplier->phone }}</div>
                @endif
                @if($order->supplier?->email)
                    <div class="v-light">{{ $order->supplier->email }}</div>
                @endif
                @if($order->supplier?->address)
                    <div class="v-light">{{ $order->supplier->address }}</div>
                @endif
            </td>
            <td width="50%" class="right" style="text-align:right;">
                <div class="h">Statut</div>
                <div style="margin-top:4px;">
                    @if($order->status === 'draft')
                        <span class="badge badge-draft">📝 BROUILLON</span>
                    @elseif($order->status === 'sent')
                        <span class="badge badge-sent">✉️ ENVOYÉ</span>
                    @elseif($order->status === 'received')
                        <span class="badge badge-received">✅ RÉCEPTIONNÉ</span>
                    @else
                        <span class="badge badge-cancelled">ANNULÉ</span>
                    @endif
                </div>
                <div class="v-light" style="margin-top:8px;">
                    Émis par {{ $order->user?->name ?? 'Système' }}<br>
                    @if($order->sent_at) Envoyé le {{ $order->sent_at->format('d/m/Y') }}<br>@endif
                    @if($order->received_at) Réceptionné le {{ $order->received_at->format('d/m/Y') }}@endif
                </div>
            </td>
        </tr>
    </table>

    {{-- ============ ARTICLES ============ --}}
    <table class="items">
        <tr>
            <th style="width:44%;">Article</th>
            <th class="right" style="width:14%;">Quantité</th>
            <th class="right" style="width:20%;">Prix unitaire</th>
            <th class="right" style="width:22%;">Sous-total</th>
        </tr>
        @foreach($order->items as $item)
            <tr>
                <td class="bold" style="font-weight:bold;">{{ $item->product_name }}</td>
                <td class="right">{{ $item->quantity }}</td>
                <td class="right">{{ number_format($item->unit_price, 0, ',', ' ') }} FCFA</td>
                <td class="right" style="font-weight:bold;">{{ number_format($item->subtotal, 0, ',', ' ') }} FCFA</td>
            </tr>
        @endforeach
        <tr class="total-row">
            <td colspan="3">TOTAL ESTIMÉ ({{ $order->items->count() }} article(s))</td>
            <td class="right total-accent">{{ number_format($order->total_estimated, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>

    @if($order->notes)
        <div class="notes">📝 {{ $order->notes }}</div>
    @endif

    {{-- ============ SIGNATURES ============ --}}
    <table class="sign" width="100%">
        <tr>
            <td width="45%"><div class="sign-box">Signature de la boutique</div></td>
            <td width="10%"></td>
            <td width="45%" class="right" style="text-align:right;"><div class="sign-box" style="margin-left:auto;">Signature du fournisseur</div></td>
        </tr>
    </table>

    <div class="footer">
        ◆ {{ $shop['name'] }} · {{ $shop['phone'] }} · {{ $shop['email'] }}<br>
        {{ $order->number }} — généré le {{ now()->format('d/m/Y à H:i') }}
    </div>
</div>

</body>
</html>
