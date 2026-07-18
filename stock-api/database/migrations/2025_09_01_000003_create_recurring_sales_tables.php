<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 🔁 Ventes récurrentes / abonnements clients (dépôt-vente, réguliers)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // créateur
            $table->string('label', 120)->nullable();
            $table->string('frequency', 10)->default('weekly'); // weekly | monthly
            $table->timestamp('next_run_at')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->string('status', 10)->default('active'); // active | paused
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_run_at']);
        });

        Schema::create('recurring_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recurring_sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('unit_price')->default(0); // FCFA (arrondi)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_sale_items');
        Schema::dropIfExists('recurring_sales');
    }
};
