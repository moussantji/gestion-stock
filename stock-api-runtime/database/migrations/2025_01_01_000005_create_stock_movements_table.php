<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->enum('type', ['in', 'out']); // in = entrée, out = sortie
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->string('reason')->nullable();   // Achat, Vente, Inventaire, Casse...
            $table->string('reference')->nullable(); // N° bon de livraison, facture...
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
