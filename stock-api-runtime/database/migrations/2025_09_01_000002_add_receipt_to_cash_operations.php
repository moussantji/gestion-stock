<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ↩️ Lien avoir → opération de caisse (remboursement d'argent tracé)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_operations', function (Blueprint $table) {
            // Reçu remboursé (null = opération manuelle classique)
            $table->foreignId('receipt_id')->nullable()->after('category')
                ->constrained('receipts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cash_operations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('receipt_id');
        });
    }
};
