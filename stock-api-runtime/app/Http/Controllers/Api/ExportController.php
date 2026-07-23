<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;

/**
 * Exports CSV (admin/manager).
 * Le séparateur ";" + BOM UTF-8 garantit une ouverture correcte dans Excel (fr).
 */
class ExportController extends Controller
{
    /** GET /api/export/products */
    public function products()
    {
        $callback = function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel

            fputcsv($out, [
                'ID', 'Nom', 'SKU', 'Code-barres', 'Catégorie', 'Fournisseur',
                'Prix achat', 'Prix vente', 'Quantité', 'Seuil alerte', 'Valeur stock',
            ], ';');

            Product::with(['category:id,name', 'supplier:id,name'])->orderBy('name')
                ->chunk(300, function ($products) use ($out) {
                    foreach ($products as $p) {
                        fputcsv($out, [
                            $p->id,
                            $p->name,
                            $p->sku,
                            $p->barcode,
                            $p->category?->name ?? '',
                            $p->supplier?->name ?? '',
                            $p->purchase_price,
                            $p->sale_price,
                            $p->quantity,
                            $p->alert_threshold,
                            $p->stock_value,
                        ], ';');
                    }
                });

            fclose($out);
        };

        return response()->stream($callback, 200, $this->csvHeaders('produits.csv'));
    }

    /** GET /api/export/movements?type=&date_from=&date_to= */
    public function movements(Request $request)
    {
        $query = StockMovement::with(['product:id,name,sku', 'user:id,name'])->latest();

        if (in_array($request->query('type'), ['in', 'out'], true)) {
            $query->where('type', $request->query('type'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        $callback = function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, ['ID', 'Date', 'Produit', 'SKU', 'Type', 'Quantité', 'Prix unitaire', 'Motif', 'Référence', 'Utilisateur'], ';');

            $query->chunk(300, function ($movements) use ($out) {
                foreach ($movements as $m) {
                    fputcsv($out, [
                        $m->id,
                        $m->created_at?->format('Y-m-d H:i'),
                        $m->product?->name ?? '',
                        $m->product?->sku ?? '',
                        $m->type === 'in' ? 'Entrée' : 'Sortie',
                        $m->quantity,
                        $m->unit_price ?? '',
                        $m->reason ?? '',
                        $m->reference ?? '',
                        $m->user?->name ?? '',
                    ], ';');
                }
            });

            fclose($out);
        };

        return response()->stream($callback, 200, $this->csvHeaders('mouvements.csv'));
    }

    private function csvHeaders(string $filename): array
    {
        return [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];
    }
}
