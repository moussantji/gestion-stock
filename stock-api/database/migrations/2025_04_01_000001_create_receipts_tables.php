<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reçus de vente (la boutique vend à SES clients depuis l'app).
 * Chaque ligne décrémente le stock via un mouvement de sortie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();          // R-2026-XXXXXX
            $table->string('client_uuid', 64)->nullable()->unique(); // idempotence (double-tap mobile)
            $table->foreignId('user_id')->constrained(); // vendeur
            $table->string('client_name')->nullable();   // client de la boutique
            $table->string('client_phone')->nullable();
            $table->unsignedInteger('total')->default(0);
            $table->timestamps();
        });

        Schema::create('receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');              // snapshot
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('unit_price');       // snapshot
            $table->unsignedInteger('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_items');
        Schema::dropIfExists('receipts');
    }
};
