<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ============================================================
// PLANIFICATEUR — Rappels d'expiration de licence (J-7, J-3, J-1)
// Nécessite sur le serveur un cron :
//   * * * * * cd /chemin/stock-api && php artisan schedule:run >> /dev/null 2>&1
// ============================================================
Schedule::command('licenses:remind')->dailyAt('09:00')->withoutOverlapping();

// 📦 Bons de commande fournisseurs automatiques (stock bas) + push admin
Schedule::command('stock:auto-purchase-orders')->dailyAt('08:00')->withoutOverlapping();

// 🔔 Digest push quotidien « stock bas » → admins + managers (07:30, avant l'ouverture)
Schedule::command('stock:low-stock-digest')->dailyAt('07:30')->withoutOverlapping();

// 📅 Rappel crédits anciens (seuil configurable, défaut +7 jours) → admins + managers (10:00)
Schedule::command('credits:remind')->dailyAt('10:00')->withoutOverlapping();

// 📧 v2.2 : digest EMAIL des crédits anciens → patron, 5 min après le push (silencieux si boss_email vide)
Schedule::command('credits:remind-email')->dailyAt('10:05')->withoutOverlapping();

// 🔁 Ventes récurrentes / abonnements échus → ventes à crédit auto (06:30, avant l'ouverture)
Schedule::command('stock:process-recurring-sales')->dailyAt('06:30')->withoutOverlapping();
