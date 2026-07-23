<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 🏬📦 v13 — Stock par boutique + transferts inter-boutiques.
 *
 * Principe : `products.quantity` reste le TOTAL GLOBAL (toutes les lectures
 * existantes : alertes, prévisions, stats… restent inchangées).
 * `product_shop_stocks` = stock présent physiquement dans chaque boutique.
 * Le « siège » (HQ) = products.quantity − SUM(buckets).
 * 👉 Aucun bucket pour un produit ⇒ comportement 100 % identique à la v12.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_shop_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->integer('quantity')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'shop_id']);
            $table->index('shop_id');
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique(); // TR-2026-000001
            $table->foreignId('from_shop_id')->nullable()->constrained('shops')->nullOnDelete(); // null = siège
            $table->foreignId('to_shop_id')->nullable()->constrained('shops')->nullOnDelete();   // null = siège
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained('stock_transfers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('quantity'); // > 0
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('product_shop_stocks');
    }
};
