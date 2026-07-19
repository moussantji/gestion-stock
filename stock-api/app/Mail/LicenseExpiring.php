<?php

namespace App\Mail;

use App\Models\License;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LicenseExpiring extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public License $license,
        public int $daysLeft,
    ) {}

    public function build()
    {
        $mail = $this->subject("⌛ Votre abonnement StockFlow expire dans {$this->daysLeft} jour(s)")
            ->view('emails.licenses.expiring')
            ->with([
                'license' => $this->license,
                'daysLeft' => $this->daysLeft,
                'renewUrl' => route('home').'#tarifs',
            ]);

        return $mail;
    }
}
