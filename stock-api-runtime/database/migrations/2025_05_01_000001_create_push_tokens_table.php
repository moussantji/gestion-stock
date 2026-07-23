<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tokens Expo Push des téléphones (notifications push distantes).
 * Un utilisateur peut avoir plusieurs appareils ; un token peut
 * changer de main (déconnexion/reconnexion) → upsert sur le token.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token', 120)->unique();      // ExponentPushToken[xxxx]
            $table->string('device_name')->nullable();   // ex: "Galaxy A54"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
