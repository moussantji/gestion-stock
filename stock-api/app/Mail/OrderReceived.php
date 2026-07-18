<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\PaymentMethod;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderReceived extends Mailable
{
    use Queueable, SerializesModels;

    public ?PaymentMethod $method;

    public function __construct(public Order $order)
    {
        $this->method = PaymentMethod::where('name', $order->payment_method)
            ->where('is_active', true)
            ->first();
    }

    public function build()
    {
        $mail = $this->subject("✅ Commande {$this->order->reference} bien reçue — StockFlow")
            ->view('emails.orders.received')
            ->with([
                'order' => $this->order,
                'method' => $this->method,
            ]);

        // Reçu PDF en pièce jointe (si dompdf installé)
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            try {
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.order-receipt', [
                    'order' => $this->order->load(['plan', 'license']),
                    'shop' => config('shop'),
                ])->setPaper('a4');
                $mail->attachData($pdf->output(), "recu-{$this->order->reference}.pdf", [
                    'mime' => 'application/pdf',
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $mail;
    }
}
