<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Licences générées après validation d'une commande.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();               // SF-XXXX-XXXX-XXXX
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('buyer_name');
            $table->string('buyer_email');
            $table->string('plan_name');
            $table->unsignedInteger('price');
            $table->timestamp('starts_at');
            $table->timestamp('expires_at')->index();
            $table->enum('status', ['active', 'revoked'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
