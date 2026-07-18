<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 📦 Multi-boutiques : boutiques + rattachement des entités (shop_id nullable).
// NB v12 : stock GLOBAL partagé — le stock par boutique + transferts arrivent en v13.
return new class extends Migration
{
    private const TABLES = [
        'users', 'customers', 'receipts', 'stock_movements',
        'cash_operations', 'cash_closings', 'purchase_orders',
        'inventories', 'recurring_sales',
    ];

    public function up(): void
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('phone', 30)->nullable();
            $table->string('address', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                // null = non rattaché (legacy) → visible par toutes les boutiques
                // NB : ->constrained() crée déjà l'index de la FK. Ne PAS chaîner ->index() :
                // cela écrase le nom de la contrainte (attribut « index ») par « 1 », ce qui
                // provoque une collision de noms de FK (errno 121) sous MySQL/MariaDB.
                $table->foreignId('shop_id')->nullable()->after('id')
                    ->constrained('shops')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('shop_id');
            });
        }

        Schema::dropIfExists('shops');
    }
};
