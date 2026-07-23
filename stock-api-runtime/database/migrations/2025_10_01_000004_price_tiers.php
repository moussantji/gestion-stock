<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 👥 Niveaux de prix : client « détail » ou « gros » + prix de gros par produit
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('price_tier', 10)->default('retail')->after('loyalty_points'); // retail | wholesale
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('wholesale_price')->nullable()->after('sale_price'); // prix de gros (FCFA)
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('price_tier');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('wholesale_price');
        });
    }
};
