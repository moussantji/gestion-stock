<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ↩️ Avoirs : un reçu peut être annulé (restock automatique).
 * status: completed (défaut) | refunded.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->string('status', 20)->default('completed')->after('amount_paid');
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_reason', 255)->nullable();
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('refunded_by');
            $table->dropColumn(['status', 'refunded_at', 'refund_reason']);
        });
    }
};
