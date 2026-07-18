<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 💵🏬 Z de caisse : l'unicité devient (date + boutique) — chaque boutique
// clôture sa propre journée. NB : avec shop_id NULL, MySQL autorise plusieurs
// NULL dans l'index composite → le garde-fou 422 du contrôleur couvre ce cas.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_closings', function (Blueprint $table) {
            $table->dropUnique(['closing_date']);
            $table->unique(['closing_date', 'shop_id'], 'cash_closings_date_shop_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cash_closings', function (Blueprint $table) {
            $table->dropUnique('cash_closings_date_shop_unique');
            $table->unique(['closing_date']);
        });
    }
};
