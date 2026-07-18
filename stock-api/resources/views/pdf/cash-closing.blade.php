<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    /* 🧾 Z de caisse — dompdf : tables + styles inline uniquement */
    @page { margin: 26px 30px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; }
    .muted { color: #64748b; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 2px; vertical-align: top; }
    .header-table td { border: none; }
    .title { font-size: 17px; font-weight: bold; letter-spacing: 1px; }
    .subtitle { font-size: 10px; color: #64748b; }
    .rule { border-top: 1px dashed #94a3b8; margin: 8px 0; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
    .row-line td { border-bottom: 1px solid #e2e8f0; }
    .num { text-align: right; white-space: nowrap; }
    .in { color: #15803d; }
    .out { color: #b91c1c; }
    .total-row td { border-top: 2px solid #0f172a; font-size: 12.5px; font-weight: bold; padding-top: 6px; }
    .footer { text-align: center; color: #64748b; font-size: 9px; margin-top: 14px; }
</style>
</head>
<body>

@php
    $catLabels = [
        'transport' => 'Transport',
        'supplier' => 'Fournisseur',
        'salary' => 'Salaires',
        'rent' => 'Loyer',
        'refund' => 'Remboursement',
        'other' => 'Autre',
    ];
@endphp

{{-- ===== En-tête boutique ===== --}}
<table class="header-table">
    <tr>
        @if(!empty($logoUri))
        <td style="width:52px;"><img src="{{ $logoUri }}" style="width:44px; height:44px;" alt="logo"></td>
        @endif
        <td>
            <div class="title">{{ $shop['name'] ?? 'StockFlow' }}</div>
            <div class="subtitle">{{ $shop['address'] ?? '' }} @if(!empty($shop['phone']))· {{ $shop['phone'] }}@endif</div>
        </td>
        <td class="num">
            <div class="title" style="font-size:14px;">Z DE CAISSE</div>
            <div class="subtitle">Clôture du <span class="bold">{{ \Carbon\Carbon::parse($closing->closing_date)->format('d/m/Y') }}</span></div>
        </td>
    </tr>
</table>

<div class="rule"></div>

{{-- ===== Synthèse ===== --}}
<div class="box">
    <table>
        <tr class="row-line">
            <td>💰 Ventes encaissées le jour même <span class="muted">(indicatif)</span></td>
            <td class="num in">{{ number_format($closing->sales_collected, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr class="row-line">
            <td>⬇️ Apports en espèces (opérations manuelles)</td>
            <td class="num in">+ {{ number_format($closing->total_in, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr class="row-line">
            <td>⬆️ Dépenses en espèces (opérations manuelles)</td>
            <td class="num out">− {{ number_format($closing->total_out, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr class="row-line">
            <td class="muted" colspan="2" style="font-size:9px;">Solde = apports − dépenses (caisse physique). Les ventes encaissées ne sont pas fusionnées automatiquement.</td>
        </tr>
        <tr class="total-row">
            <td>SOLDE DE CAISSE À LA CLÔTURE</td>
            <td class="num">{{ number_format($closing->balance, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>
</div>

{{-- ===== Sorties par catégorie ===== --}}
@if($outByCategory->isNotEmpty())
<div class="bold" style="margin-top:6px;">Sorties par catégorie</div>
<table>
    @foreach($outByCategory as $cat => $amount)
    <tr class="row-line">
        <td>{{ $catLabels[$cat] ?? ucfirst($cat) }}</td>
        <td class="num out">− {{ number_format($amount, 0, ',', ' ') }} FCFA</td>
    </tr>
    @endforeach
</table>
@endif

{{-- ===== Détail des opérations ===== --}}
@if($ops->isNotEmpty())
<div class="bold" style="margin-top:8px;">Détail des opérations ({{ $ops->count() }})</div>
<table>
    @foreach($ops as $op)
    <tr class="row-line">
        <td class="muted" style="width:44px;">{{ $op->created_at->format('H:i') }}</td>
        <td>
            {{ $op->reason }}
            @if($op->receipt_id)<span class="muted"> · avoir</span>@endif
            <br><span class="muted">{{ $op->user->name ?? '' }}@if($op->category) · {{ $catLabels[$op->category] ?? $op->category }}@endif</span>
        </td>
        <td class="num {{ $op->type === 'in' ? 'in' : 'out' }}" style="width:90px;">
            {{ $op->type === 'in' ? '+' : '−' }} {{ number_format($op->amount, 0, ',', ' ') }}
        </td>
    </tr>
    @endforeach
</table>
@else
<div class="muted center" style="margin-top:8px;">Aucune opération manuelle ce jour-là.</div>
@endif

@if(!empty($closing->notes))
<div class="box muted">📝 {{ $closing->notes }}</div>
@endif

<div class="rule"></div>
<div class="muted">
    Clôturée par <span class="bold">{{ $closing->user->name ?? '—' }}</span>
    le {{ $closing->created_at->format('d/m/Y à H:i') }}
</div>

<div class="footer">{{ $shop['name'] ?? 'StockFlow' }} — Z de caisse généré par StockFlow</div>

</body>
</html>
