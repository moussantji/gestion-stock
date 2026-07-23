<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** 💵 Caisse : opérations manuelles (dépenses, retraits, apports). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_operations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10);          // in | out
            $table->unsignedInteger('amount');
            $table->string('reason');            // ex: « Livraison », « Achat sacs »
            $table->foreignId('user_id')->constrained();
            $table->timestamps();

            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_operations');
    }
};
