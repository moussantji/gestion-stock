<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    {{-- 🏷️ Planche A4 d'étiquettes : grille de cellules pointillées à découper --}}
    @page { margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; color: #000; font-size: 9px; }
    table.grid { width: 100%; border-collapse: collapse; }
    td.cell {
        border: 1px dashed #555;
        text-align: center;
        padding: 7px 4px 6px;
        vertical-align: middle;
    }
    .name { font-size: 8.5px; font-weight: bold; margin-bottom: 3px; }
    .bars { margin: 2px 0; }
    .code { font-family: DejaVu Sans Mono, monospace; font-size: 8px; letter-spacing: 1.5px; }
    .price { font-size: 8px; color: #222; margin-top: 2px; font-weight: bold; }
</style>
</head>
<body>

<table class="grid">
    @foreach(array_chunk($labels, $perRow) as $row)
        <tr>
            @foreach($row as $label)
                <td class="cell" width="{{ round(100 / $perRow) }}%">
                    <div class="name">{{ $label['name'] }}</div>
                    <div class="bars">{!! \App\Support\Code128::renderHtml($label['code']) !!}</div>
                    <div class="code">{{ $label['code'] }}</div>
                    <div class="price">{{ $label['price'] }}</div>
                </td>
            @endforeach
            {{-- cellules vides pour compléter la ligne --}}
            @for($i = count($row); $i < $perRow; $i++)
                <td class="cell" width="{{ round(100 / $perRow) }}%"></td>
            @endfor
        </tr>
    @endforeach
</table>

</body>
</html>
