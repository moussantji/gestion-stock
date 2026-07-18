<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 💳 Paiement partiel / crédit client :
 * - receipts.amount_paid : total encaissé (plusieurs versements possibles)
 * - receipt_payments     : historique des versements (qui, combien, quand)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->unsignedInteger('amount_paid')->default(0)->after('total');
        });

        Schema::create('receipt_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained(); // qui a encaissé
            $table->unsignedInteger('amount');
            $table->string('note', 120)->nullable();     // ex: « Versement Orange Money »
            $table->timestamps();

            $table->index(['receipt_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_payments');

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropColumn('amount_paid');
        });
    }
};
