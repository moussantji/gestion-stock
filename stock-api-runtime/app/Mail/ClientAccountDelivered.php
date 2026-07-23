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
 * 👤📧 v2.14 — Livraison du COMPTE CLIENT (identifiants du portail) :
 * remplace l'email de clé de licence. Envoyé à la création du compte
 * et à chaque régénération de mot de passe demandée par l'admin.
 */
class ClientAccountDelivered extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public License $license,
        public string $password, // clair — transmis UNE fois, jamais stocké en clair
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '👤 Votre compte StockFlow — vos identifiants',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clients.account_delivered');
    }
}
