<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Reçu PDF d'une commande de licence (page publique via la référence).
 */
class ReceiptController extends Controller
{
    /** GET /commande/{reference}/recu */
    public function orderReceipt(Order $order)
    {
        // Garde : sans dompdf installé, erreur 503 propre au lieu d'un fatal error
        abort_unless(
            class_exists(Pdf::class),
            503,
            'Package barryvdh/laravel-dompdf manquant — composer require barryvdh/laravel-dompdf'
        );

        $order->load(['plan', 'license']);

        $pdf = Pdf::loadView('pdf.order-receipt', [
            'order' => $order,
            'shop' => config('shop'),
        ])->setPaper('a4');

        return $pdf->stream("recu-{$order->reference}.pdf");
    }
}
