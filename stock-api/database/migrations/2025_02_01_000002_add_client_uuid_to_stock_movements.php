<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // Identifiant envoyé par l'app mobile → idempotence (mode hors ligne)
            $table->string('client_uuid', 64)->nullable()->unique()->after('id');
            // Accélère le dashboard (graphique 7 jours)
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropUnique(['client_uuid']);
            $table->dropIndex(['created_at']);
            $table->dropColumn('client_uuid');
        });
    }
};
