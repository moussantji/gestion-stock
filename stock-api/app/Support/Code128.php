<?php

namespace App\Support;

/**
 * 🏷️ Mini-encodeur Code 128 (jeu B) — zéro dépendance.
 * Produit la suite des largeurs barre/espace (1-4) dessinée ensuite en HTML.
 * Checksum : (startB=104 + Σ valeur×position) % 103.
 */
class Code128
{
    /** Largeurs bar/espace des 107 motifs (alternance barre→espace, départ barre). */
    private const PATTERNS = [
        '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
        '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
        '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
        '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
        '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
        '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
        '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
        '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
        '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
        '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
        '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
    ];

    private const START_B = 104;
    private const STOP = 106;

    /**
     * Encode un texte ASCII (32-126) → liste de motifs d'indices [startB, v1..vn, checksum, stop].
     * Les caractères non imprimables sont remplacés par un espace.
     */
    public static function encode(string $text): array
    {
        $values = [];
        foreach (str_split($text) as $char) {
            $ord = ord($char);
            $values[] = ($ord >= 32 && $ord <= 126) ? $ord - 32 : 0;
        }

        $checksum = self::START_B;
        foreach ($values as $i => $v) {
            $checksum += $v * ($i + 1);
        }

        return [self::START_B, ...$values, $checksum % 103, self::STOP];
    }

    /**
     * Rendu HTML inline : une série de <span> noirs/blancs (dompdf-friendly).
     * @return string HTML (sans échappement — largeurs uniquement)
     */
    public static function renderHtml(string $text, int $heightPx = 38, float $unitPx = 1.4): string
    {
        $html = '<div style="white-space:nowrap;line-height:0;">';
        foreach (self::encode($text) as $patternIndex) {
            $pattern = self::PATTERNS[$patternIndex];
            $isBar = true; // alternance barre / espace, départ barre
            foreach (str_split($pattern) as $width) {
                $w = round(((int) $width) * $unitPx, 1);
                $bg = $isBar ? '#000' : '#fff';
                $html .= '<span style="display:inline-block;width:' . $w . 'px;height:' . $heightPx
                    . 'px;background-color:' . $bg . ';"></span>';
                $isBar = ! $isBar;
            }
        }

        // Zone silencieuse finale (10 modules)
        $html .= '<span style="display:inline-block;width:' . round(10 * $unitPx, 1)
            . 'px;height:' . $heightPx . 'px;background-color:#fff;"></span>';

        return $html . '</div>';
    }
}
