<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bons de commande fournisseurs — générés (auto ou manuellement)
 * à partir des produits en stock bas, regroupés PAR FOURNISSEUR.
 * Cycle : draft → sent → received (le receive crée les entrées de stock).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();            // BC-2026-XXXXXX
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // créateur (null = auto)
            $table->string('status')->default('draft');    // draft | sent | received | cancelled
            $table->unsignedInteger('total_estimated')->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');                // snapshot
            $table->unsignedInteger('quantity');           // qté suggérée (= commandée)
            $table->unsignedInteger('unit_price');         // prix d'achat (snapshot)
            $table->unsignedInteger('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
