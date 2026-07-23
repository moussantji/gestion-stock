<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 🚚 v14 — Statut des transferts : en transit → réception à valider (ou annulation).
 *
 * Pendant le transit, le stock n'est NULLE PART : retiré de la source
 * (bucket − et global −) à l'envoi, il ne rentre à destination que lors
 * de la VALIDATION de la réception (bucket + et global +).
 * ⇒ Le siège (= global − Σ boutiques) ne peut jamais vendre le contenu
 *    d'un camion en route.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('status', 20)->default('in_transit')->after('note'); // in_transit | received | cancelled
            $table->timestamp('sent_at')->nullable()->after('status');
            $table->timestamp('received_at')->nullable()->after('sent_at');
            $table->foreignId('received_by')->nullable()->after('received_at')->constrained('users')->nullOnDelete();
            $table->index('status');
        });

        // Les transferts v13 étaient exécutés immédiatement → déjà « réceptionnés »
        DB::table('stock_transfers')->where('status', 'in_transit')->update([
            'status' => 'received',
            'sent_at' => DB::raw('created_at'),
            'received_at' => DB::raw('updated_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropConstrainedForeignId('received_by');
            $table->dropColumn(['status', 'sent_at', 'received_at']);
        });
    }
};
