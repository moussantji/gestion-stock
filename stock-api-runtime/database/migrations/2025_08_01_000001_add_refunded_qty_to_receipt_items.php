<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** ↩️ Avoir partiel : quantité retournée par ligne d'article. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipt_items', function (Blueprint $table) {
            $table->unsignedInteger('refunded_qty')->default(0)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('receipt_items', function (Blueprint $table) {
            $table->dropColumn('refunded_qty');
        });
    }
};
