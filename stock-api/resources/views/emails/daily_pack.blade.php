@extends('emails.layout')

@section('content')
    <div style="text-align:center; font-size:44px;">📦</div>

    <h1 style="text-align:center; font-size:22px; color:#f1f5f9; font-weight:800; margin:14px 0 6px;">
        Pack du jour — {{ $day }}
    </h1>
    <p style="text-align:center; color:#8b98b8; font-size:14px; margin:0 0 24px;">
        {{ $shopName }} : la journée est clôturée, voici le récapitulatif complet.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
        <tr>
            <td style="color:#8b98b8; font-size:13px; line-height:1.9;">
                📄 <b style="color:#f1f5f9;">pack-jour-{{ $day }}.pdf</b> — chiffre du jour, totaux par vendeur, Z signé<br>
                📤 <b style="color:#f1f5f9;">ventes-jour-{{ $day }}.csv</b> — toutes les ventes du jour, prêtes pour Excel<br>
                <span style="font-size:12px;">💡 Le CSV s'ouvre directement dans Excel (séparateur « ; », accents préservés).</span>
            </td>
        </tr>
    </table>

    <p style="text-align:center; color:#8b98b8; font-size:12px; margin:24px 0 0;">
        Envoyé automatiquement à la clôture de caisse, depuis votre poste StockFlow PC.<br>
        Retrouvez aussi ces fichiers dans <b style="color:#f1f5f9;">Documents/StockFlow/Rapports</b> sur le poste de caisse.
    </p>
@endsection
