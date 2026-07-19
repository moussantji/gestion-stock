<?php

namespace App\Mail;

use App\Models\License;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * 🔁📧 v2.14 — Renouvellement : l'abonnement existant a été PROLONGÉ
 * (même compte client, mot de passe inchangé).
 */
class SubscriptionExtended extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public License $license) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🔁 Votre abonnement StockFlow est prolongé jusqu\'au '
                .$this->license->expires_at->format('d/m/Y'),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clients.extended');
    }
}
