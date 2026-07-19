<?php

namespace App\Support;

/**
 * 📊 Génère un vrai fichier Excel .xlsx SANS aucune dépendance Composer :
 * un .xlsx n'est qu'un ZIP de XML — on écrit le minimum strict nécessaire
 * ([Content_Types], rels, workbook, feuilles à chaînes inline).
 * Ouvrira dans Excel, LibreOffice, Google Sheets et Numbers.
 */
class XlsxWriter
{
    /**
     * @param  string  $path  chemin complet du fichier à écrire
     * @param  array  $sheets  [['name' => 'Onglet', 'rows' => [[...], [...]]], ...]
     *                         valeurs int/float → cellules numériques, sinon texte
     */
    public static function write(string $path, array $sheets): void
    {
        abort_unless(class_exists(\ZipArchive::class), 503, 'Extension PHP « zip » manquante sur le serveur.');

        $zip = new \ZipArchive;
        if ($zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Impossible de créer le fichier Excel.');
        }

        // ---------- [Content_Types].xml ----------
        $types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
        foreach ($sheets as $i => $sheet) {
            $types .= '<Override PartName="/xl/worksheets/sheet'.($i + 1).'.xml" '
                .'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }
        $types .= '</Types>';
        $zip->addFromString('[Content_Types].xml', $types);

        // ---------- _rels/.rels ----------
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" '
            .'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            .'Target="xl/workbook.xml"/>'
            .'</Relationships>');

        // ---------- xl/workbook.xml (noms d'onglets, ≤ 31 car.) ----------
        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            .'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
        foreach ($sheets as $i => $sheet) {
            $name = mb_substr((string) ($sheet['name'] ?? 'Feuille'.($i + 1)), 0, 31);
            $workbook .= '<sheet name="'.self::xml($name).'" sheetId="'.($i + 1).'" r:id="rId'.($i + 1).'"/>';
        }
        $workbook .= '</sheets></workbook>';
        $zip->addFromString('xl/workbook.xml', $workbook);

        // ---------- xl/_rels/workbook.xml.rels ----------
        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        foreach ($sheets as $i => $sheet) {
            $rels .= '<Relationship Id="rId'.($i + 1).'" '
                .'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                .'Target="worksheets/sheet'.($i + 1).'.xml"/>';
        }
        $rels .= '</Relationships>';
        $zip->addFromString('xl/_rels/workbook.xml.rels', $rels);

        // ---------- Feuilles ----------
        foreach ($sheets as $i => $sheet) {
            $zip->addFromString(
                'xl/worksheets/sheet'.($i + 1).'.xml',
                self::sheetXml($sheet['rows'] ?? [])
            );
        }

        $zip->close();
    }

    /** XML d'une feuille : valeurs numériques natives, texte en chaînes inline. */
    private static function sheetXml(array $rows): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';

        foreach (array_values($rows) as $r => $row) {
            $xml .= '<row r="'.($r + 1).'">';
            foreach (array_values((array) $row) as $c => $value) {
                $ref = self::colLetter($c).($r + 1);
                if (is_int($value) || is_float($value)) {
                    $xml .= '<c r="'.$ref.'"><v>'.$value.'</v></c>';
                } elseif ($value === null || $value === '') {
                    $xml .= '<c r="'.$ref.'"/>';
                } else {
                    // xml:space="preserve" garde les espaces de tête/queue ("12 500 FCFA")
                    $xml .= '<c r="'.$ref.'" t="inlineStr"><is><t xml:space="preserve">'
                        .self::xml((string) $value).'</t></is></c>';
                }
            }
            $xml .= '</row>';
        }

        return $xml.'</sheetData></worksheet>';
    }

    /** 0 → A, 1 → B, … 26 → AA */
    private static function colLetter(int $index): string
    {
        $letters = '';
        $index++;
        while ($index > 0) {
            $mod = ($index - 1) % 26;
            $letters = chr(65 + $mod).$letters;
            $index = intdiv($index - $mod - 1, 26);
        }

        return $letters;
    }

    private static function xml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
