@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">💳</div>

    @if ($count > 0)
        <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
            {{ $count }} crédit(s) de plus de {{ $days }} jours
        </h1>
        <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
            {{ $shopName }} — encours ancien à relancer :
            <b style="color:#fbbf24;">{{ number_format($due, 0, ',', ' ') }} FCFA</b>
        </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:6px 8px; margin-bottom:20px;">
        <tr>
            <th align="left" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Client</th>
            <th align="left" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Reçu</th>
            <th align="right" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Âge</th>
            <th align="right" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Reste</th>
        </tr>
        @foreach ($rows as $row)
            <tr>
                <td style="color:#f1f5f9; font-size:13px; padding:9px 8px; border-bottom:1px solid #1f2937;">
                    {{ $row['customer'] }}
                    @if (!empty($row['shop']))
                        <div style="color:#8b98b8; font-size:11px;">🏬 {{ $row['shop'] }}</div>
                    @endif
                </td>
                <td style="color:#8b98b8; font-size:12px; padding:9px 8px; border-bottom:1px solid #1f2937;">
                    {{ $row['number'] ?? '—' }}<div style="font-size:11px;">{{ $row['date'] }}</div>
                </td>
                <td align="right" style="color:#f87171; font-size:12px; padding:9px 8px; border-bottom:1px solid #1f2937;">
                    {{ $row['age'] }} j
                </td>
                <td align="right" style="color:#fbbf24; font-size:13px; font-weight:700; padding:9px 8px; border-bottom:1px solid #1f2937;">
                    {{ number_format($row['remaining'], 0, ',', ' ') }} F
                </td>
            </tr>
        @endforeach
    </table>

    @if ($count > count($rows))
        <p style="text-align:center; color:#8b98b8; font-size:12px; margin:0 0 16px;">
            … et {{ $count - count($rows) }} autre(s) crédit(s) — liste complète dans l’app (Reçus → onglet Crédits).
        </p>
    @endif
    @endif

    {{-- 💳📅 v2.13 : rappels PLANIFIÉS (échéance demain J−1 ou dépassée, solde > 0) — additif, gardé --}}
    @if (!empty($planned))
        <h2 style="text-align:center; font-size:18px; color:#f1f5f9; font-weight:800; margin:18px 0 6px;">
            📅 Rappels planifiés ({{ count($planned) }})
        </h2>
        <p style="text-align:center; color:#8b98b8; font-size:13px; margin:0 0 18px;">
            Échéances en retard ou prévues <b style="color:#f1f5f9;">demain</b> — c'est le moment de relancer.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:6px 8px; margin-bottom:20px;">
            <tr>
                <th align="left" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Client</th>
                <th align="left" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Échéance</th>
                <th align="right" style="color:#8b98b8; font-size:11px; text-transform:uppercase; padding:10px 8px; border-bottom:1px solid #1f2937;">Reste dû</th>
            </tr>
            @foreach ($planned as $p)
                <tr>
                    <td style="color:#f1f5f9; font-size:13px; padding:9px 8px; border-bottom:1px solid #1f2937;">{{ $p['customer'] }}</td>
                    <td style="font-size:12px; padding:9px 8px; border-bottom:1px solid #1f2937; color:{{ $p['late_days'] > 0 ? '#f87171' : '#fbbf24' }};">
                        {{ $p['date'] }}
                        @if ($p['late_days'] > 0)
                            <div style="font-size:11px;">⚠️ {{ $p['late_days'] }} j de retard</div>
                        @else
                            <div style="font-size:11px;">⏰ demain (J−1)</div>
                        @endif
                    </td>
                    <td align="right" style="color:#fbbf24; font-size:13px; font-weight:700; padding:9px 8px; border-bottom:1px solid #1f2937;">
                        {{ number_format($p['due'], 0, ',', ' ') }} F
                    </td>
                </tr>
            @endforeach
        </table>
    @endif

    <p style="text-align:center; color:#8b98b8; font-size:12px; margin:16px 0 0;">
        Rappel automatique quotidien — seuil réglable dans l’app<br>
        (Réglages → Seuils &amp; fidélité → <b style="color:#f1f5f9;">rappel crédit, {{ $days }} j</b>).
    </p>
@endsection
