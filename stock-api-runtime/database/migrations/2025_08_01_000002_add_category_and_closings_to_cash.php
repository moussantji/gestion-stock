<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** 💵 Catégories de dépenses + clôture journalière (Z de caisse). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_operations', function (Blueprint $table) {
            $table->string('category', 40)->nullable()->after('type');
        });

        Schema::create('cash_closings', function (Blueprint $table) {
            $table->id();
            $table->date('closing_date')->unique(); // 1 Z par jour
            $table->unsignedInteger('total_in')->default(0);
            $table->unsignedInteger('total_out')->default(0);
            $table->unsignedInteger('sales_collected')->default(0); // encaissé via ventes
            $table->integer('balance');                             // solde cumulé à la clôture
            $table->string('notes', 500)->nullable();
            $table->foreignId('user_id')->constrained();            // qui a clôturé
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_closings');
        Schema::table('cash_operations', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
