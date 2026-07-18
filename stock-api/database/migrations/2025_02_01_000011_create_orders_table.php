<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Commandes de licences (achat via le site).
 * Le paiement est validé manuellement par l'admin (Mobile Money, virement...).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();         // CMD-2026-XXXXXX
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('plan_name');                   // snapshot au moment de l'achat
            $table->unsignedInteger('amount');             // snapshot du prix
            $table->string('buyer_name');
            $table->string('buyer_email');
            $table->string('buyer_phone')->nullable();
            $table->string('payment_method')->nullable();  // Orange Money, Wave, Moov, Virement
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
