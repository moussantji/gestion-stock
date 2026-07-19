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
 * 📧 v2.1 — Pack du jour envoyé au patron (PDF récap + CSV des ventes).
 *
 * Les fichiers arrivent en mémoire (générés par le poste PC à la clôture) :
 * aucun fichier n'est stocké côté serveur. Mise en file si une queue est
 * configurée, envoi immédiat sinon (pilote sync = queue() exécute de suite).
 */
class DailyPackMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $day,
        public string $shopName,
        public string $pdfBin,
        public ?string $csvText = null,
        public ?string $csvName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "📦 Pack du jour {$this->day} — {$this->shopName}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.daily_pack');
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        $files = [
            Attachment::fromData(fn () => $this->pdfBin, "pack-jour-{$this->day}.pdf")
                ->withMime('application/pdf'),
        ];

        if ($this->csvText !== null && $this->csvText !== '') {
            $files[] = Attachment::fromData(fn () => $this->csvText, $this->csvName ?: "ventes-jour-{$this->day}.csv")
                ->withMime('text/csv');
        }

        return $files;
    }
}
