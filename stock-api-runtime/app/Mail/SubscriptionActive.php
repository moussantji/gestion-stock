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
 * ✅📧 v2.14 — Nouvel abonnement actif sur un compte client EXISTANT
 * (le client avait déjà ses identifiants — aucun mot de passe renvoyé).
 */
class SubscriptionActive extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public License $license) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Votre abonnement StockFlow est actif',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clients.active');
    }
}
