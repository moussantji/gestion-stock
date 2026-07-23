<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 🔄 Inventaires physiques :
 * - inventories      : la session de comptage (une seule « en cours » à la fois)
 * - inventory_items  : snapshot de TOUS les produits au démarrage
 *                      (expected = stock système figé · counted = saisi par l'équipe)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();       // INV-2026-XXXXXX
            $table->string('name', 120)->nullable();     // « Inventaire juillet »
            $table->string('status')->default('in_progress'); // in_progress | validated
            $table->foreignId('user_id')->constrained(); // créateur
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->integer('expected_quantity')->default(0);  // stock système au scan/départ
            $table->integer('counted_quantity')->nullable();   // null = pas encore compté
            $table->timestamps();

            $table->unique(['inventory_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('inventories');
    }
};
