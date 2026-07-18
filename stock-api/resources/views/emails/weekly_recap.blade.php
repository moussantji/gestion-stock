@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">🧮</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Bilan hebdomadaire
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        {{ $shopName }} — semaine du <b style="color:#f1f5f9;">{{ $from }}</b> au <b style="color:#f1f5f9;">{{ $to }}</b>, servie avec le café du lundi ☕
    </p>

    {{-- Chiffres clés --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:18px 20px; margin-bottom:14px;">
        <tr>
            <td style="color:#8b98b8; font-size:13px; line-height:2.1; width:50%; vertical-align:top;">
                💰 CA encaissé<br>
                🧾 Ventes<br>
                🛒 Panier moyen<br>
                📥 Apports caisse<br>
                📤 Dépenses caisse
            </td>
            <td align="right" style="color:#f1f5f9; font-size:13px; font-weight:700; line-height:2.1; vertical-align:top;">
                {{ number_format((int) ($recap['receipts']['paid'] ?? 0), 0, ',', ' ') }} F<br>
                {{ (int) ($recap['receipts']['count'] ?? 0) }}<br>
                {{ ($recap['receipts']['count'] ?? 0) > 0 ? number_format((int) round(($recap['receipts']['total'] ?? 0) / max(1, (int) $recap['receipts']['count'])), 0, ',', ' ') : 0 }} F<br>
                +{{ number_format((int) ($recap['cash']['in'] ?? 0), 0, ',', ' ') }} F<br>
                −{{ number_format((int) ($recap['cash']['out'] ?? 0), 0, ',', ' ') }} F
            </td>
        </tr>
    </table>

    {{-- 🏬 Détail par boutique (v2.7) — affiché seulement si ≥ 2 boutiques sur la semaine --}}
    @if(count($recap['by_shop'] ?? []) >= 2)
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:18px 20px; margin-bottom:14px;">
        <tr>
            <td colspan="2" style="color:#f1f5f9; font-size:14px; font-weight:800; padding-bottom:8px;">
                📊 Détail par boutique
            </td>
        </tr>
        @foreach($recap['by_shop'] as $s)
        <tr>
            <td style="color:#8b98b8; font-size:13px; line-height:2.1; border-top:1px solid #1f2937;">
                🏬 {{ $s['name'] }}
                <span style="font-size:11px;">— {{ (int) ($s['count'] ?? 0) }} vente(s)</span>
            </td>
            <td align="right" style="color:#f1f5f9; font-size:13px; font-weight:700; line-height:2.1; border-top:1px solid #1f2937;">
                {{ number_format((int) ($s['total'] ?? 0), 0, ',', ' ') }} F
                <span style="color:#8b98b8; font-size:11px;">· {{ $s['share'] ?? 0 }} %</span>
            </td>
        </tr>
        @endforeach
        <tr>
            <td style="color:#f1f5f9; font-size:13px; font-weight:800; line-height:2.1; border-top:1px solid #374151;">
                TOTAL
            </td>
            <td align="right" style="color:#f1f5f9; font-size:13px; font-weight:800; line-height:2.1; border-top:1px solid #374151;">
                {{ number_format((int) collect($recap['by_shop'] ?? [])->sum('total'), 0, ',', ' ') }} F
            </td>
        </tr>
    </table>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
        <tr>
            <td style="color:#8b98b8; font-size:13px; line-height:2.1; width:50%; vertical-align:top;">
                🧾 Clôtures (Z)<br>
                💵 Solde caisse fin de semaine
                @if($bestDay)
                    <br>🏆 Meilleure journée
                @endif
                @if((int) ($recap['receipts']['points_discount'] ?? 0) > 0)
                    <br>🎯 Remises points
                @endif
                @if((int) ($recap['receipts']['refunds_total'] ?? 0) > 0)
                    <br>↩️ Avoirs
                @endif
            </td>
            <td align="right" style="color:#f1f5f9; font-size:13px; font-weight:700; line-height:2.1; vertical-align:top;">
                {{ (int) ($recap['closings']['count'] ?? 0) }}<br>
                {{ number_format((int) ($recap['closings']['end_balance'] ?? 0), 0, ',', ' ') }} F
                @if($bestDay)
                    <br>{{ $bestDay['date'] ?? '' }} — {{ number_format((int) ($bestDay['sales_collected'] ?? 0), 0, ',', ' ') }} F
                @endif
                @if((int) ($recap['receipts']['points_discount'] ?? 0) > 0)
                    <br>−{{ number_format((int) $recap['receipts']['points_discount'], 0, ',', ' ') }} F
                @endif
                @if((int) ($recap['receipts']['refunds_total'] ?? 0) > 0)
                    <br>−{{ number_format((int) $recap['receipts']['refunds_total'], 0, ',', ' ') }} F
                @endif
            </td>
        </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
        <tr>
            <td style="color:#8b98b8; font-size:13px; line-height:1.9;">
                📄 <b style="color:#f1f5f9;">bilan-hebdo-{{ $from }}_au_{{ $to }}.pdf</b> — KPIs complets + journal des Z jour par jour (en pièce jointe)<br>
                <span style="font-size:12px;">💡 Le même fichier est rangé dans <b style="color:#f1f5f9;">Documents/StockFlow/Rapports</b> sur le poste de caisse.</span>
            </td>
        </tr>
    </table>

    <p style="text-align:center; color:#8b98b8; font-size:12px; margin:24px 0 0;">
        Envoyé automatiquement au premier démarrage de la semaine, depuis votre poste StockFlow PC.
    </p>
@endsection
