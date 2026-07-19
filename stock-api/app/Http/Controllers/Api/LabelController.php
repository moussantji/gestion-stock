<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

/**
 * 🏷️ Étiquettes code-barres : planche A4 à coller (dompdf + Code128 maison).
 * GET /api/products/labels.pdf?ids=1,2,3&per_row=3&copies=1
 */
class LabelController extends Controller
{
    public function pdf(Request $request)
    {
        abort_unless(class_exists(Pdf::class), 503, 'Package barryvdh/laravel-dompdf manquant.');

        $ids = array_filter(array_map('intval', explode(',', (string) $request->query('ids', ''))));
        abort_unless(! empty($ids), 422, 'Paramètre ids manquant (ex: ?ids=1,2,3).');
        abort_if(count($ids) > 60, 422, 'Maximum 60 produits par planche.');

        $perRow = min(5, max(2, $request->integer('per_row', 3)));
        $copies = min(5, max(1, $request->integer('copies', 1)));
        // 📦 v2.10 : mode « 1 étiquette par unité en stock » (réassort) — plafonds garde-fous
        $stockQty = $request->boolean('stock_qty');

        $products = Product::whereIn('id', $ids)->get(['id', 'name', 'sku', 'barcode', 'sale_price', 'quantity']);

        $labels = [];
        // Ordre conservé comme demandé + fallback label = SKU si pas de code-barres
        foreach ($ids as $id) {
            $product = $products->firstWhere('id', $id);
            if (! $product) {
                continue;
            }
            $n = $stockQty
                ? min(50, max(1, (int) $product->quantity)) // 📦 v2.10 : 1 étiquette/unité, bornée 1..50
                : $copies;
            for ($c = 0; $c < $n; $c++) {
                $labels[] = [
                    'name' => mb_strimwidth($product->name, 0, 26, '…'),
                    'code' => $product->barcode ?: $product->sku,
                    'price' => number_format((float) $product->sale_price, 0, ',', ' ').' FCFA',
                ];
            }
        }
        abort_unless(! empty($labels), 404, 'Aucun produit trouvé pour ces ids.');
        abort_if(count($labels) > 300, 422, 'Planche trop lourde : 300 étiquettes max (affinez la sélection).'); // 📦 v2.10

        $pdf = Pdf::loadView('pdf.barcode-labels', [
            'labels' => $labels,
            'perRow' => $perRow,
            'shop' => config('shop'),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('etiquettes.pdf');
    }
}
