<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * 📧🧮 v2.3 — Bilan hebdo (lundi → dimanche) envoyé au patron le lundi matin.
 *
 * Déclenché par le poste PC au premier démarrage de la semaine : le PDF
 * (généré localement) arrive en mémoire, le récap chiffré est calculé par le
 * serveur (mêmes agrégats que /accounting/summary en mode plage).
 * Mise en file si une queue est configurée, envoi immédiat sinon.
 */
class WeeklyRecapMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  array  $recap  Agrégats {receipts:{count,total,paid,points_discount,refunds,refunds_total}, cash:{in,out,ops}, closings:{count,sales,end_balance,days}}
     * @param  ?array  $bestDay  Meilleure journée {date, sales_collected, cashier} ou null
     */
    public function __construct(
        public string $from,
        public string $to,
        public string $shopName,
        public string $pdfBin,
        public array $recap,
        public ?array $bestDay = null,
    ) {}

    public function envelope(): Envelope
    {
        $total = number_format((int) ($this->recap['receipts']['total'] ?? 0), 0, ',', ' ');

        return new Envelope(
            subject: "🧮 Bilan hebdo {$this->from} → {$this->to} — {$total} F ({$this->shopName})",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.weekly_recap');
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBin, "bilan-hebdo-{$this->from}_au_{$this->to}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
