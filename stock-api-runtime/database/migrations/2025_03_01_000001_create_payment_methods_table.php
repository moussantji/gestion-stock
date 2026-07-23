<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Moyens de paiement + instructions personnalisables depuis l'admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();         // orange_money, wave, moov_money...
            $table->string('name');                  // Orange Money
            $table->string('icon')->default('💳');   // emoji affiché sur le site
            $table->string('account')->nullable();   // numéro / compte du marchand
            $table->text('instructions')->nullable();// étapes, une par ligne
            $table->boolean('is_active')->default(true);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
