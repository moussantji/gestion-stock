<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * 💳📧 v2.2 — Digest des crédits anciens non soldés (cron quotidien 10:05).
 * Données sérialisées en mémoire (lignes calculées par la commande).
 */
class CreditReminderMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    /**
     * @param array<int, array{customer:string, number:string|null, date:string|null, age:int, remaining:int, shop:string|null}> $rows
     * @param array<int, array{customer:string, date:string, late_days:int, due:int}> $planned 💳📅 v2.13 : rappels planifiés (retards + J−1) — additif
     */
    public function __construct(
        public int $days,
        public int $count,
        public int $due,
        public array $rows,
        public string $shopName,
        public array $planned = [], // 💳📅 v2.13 : additif ([] = comportement inchangé)
    ) {}

    public function envelope(): Envelope
    {
        // 💳 v2.13 : sujet adapté quand il n'y a QUE des rappels planifiés
        $subject = $this->count > 0
            ? "💳 {$this->count} crédit(s) de +{$this->days} jours — encours " . number_format($this->due, 0, ',', ' ') . ' FCFA'
            : '📅 ' . count($this->planned) . ' rappel(s) planifié(s) — échéances crédit à surveiller';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.credit_reminder');
    }
}
