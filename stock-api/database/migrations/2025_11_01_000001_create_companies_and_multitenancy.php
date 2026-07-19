<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 🏢 SaaS multi-locataire (v26)
 *
 * Chaque abonné = une `company` (locataire). TOUTES les données métier sont
 * rattachées à une entreprise via `company_id` et isolées par un GLOBAL SCOPE
 * strict (trait BelongsToCompany). Les tables PLATEFORME (plans, orders,
 * licenses, payment_methods) restent globales — elles appartiennent à StockFlow.
 */
return new class extends Migration
{
    /** Tables métier qui reçoivent company_id (frontière stricte de locataire). */
    private const TENANT_TABLES = [
        'shops', 'categories', 'suppliers', 'products', 'stock_movements',
        'receipts', 'receipt_items', 'receipt_payments',
        'customers', 'loyalty_transactions',
        'cash_operations', 'cash_closings',
        'purchase_orders', 'purchase_order_items',
        'inventories', 'inventory_items',
        'recurring_sales', 'recurring_sale_items',
        'stock_transfers', 'stock_transfer_items',
        'product_shop_stocks',
    ];

    public function up(): void
    {
        // 1) Registre des locataires
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('owner_email', 255)->nullable()->index();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2) company_id sur les tables métier (NB: ne PAS chaîner ->index() après
        //    ->constrained() — cf. bug errno 121 : ça écrase le nom de la FK)
        foreach (self::TENANT_TABLES as $name) {
            if (! Schema::hasColumn($name, 'company_id')) {
                Schema::table($name, function (Blueprint $table) {
                    $table->foreignId('company_id')->nullable()->after('id')
                        ->constrained('companies')->nullOnDelete();
                });
            }
        }

        // 3) users : company_id nullable (plateforme super-admin = null ; staff = entreprise)
        if (! Schema::hasColumn('users', 'company_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('company_id')->nullable()->after('id')
                    ->constrained('companies')->nullOnDelete();
            });
        }

        // 4) licenses : lien vers l'entreprise (plateforme, mais rattache l'abonnement)
        if (! Schema::hasColumn('licenses', 'company_id')) {
            Schema::table('licenses', function (Blueprint $table) {
                $table->foreignId('company_id')->nullable()->after('id')
                    ->constrained('companies')->nullOnDelete();
            });
        }

        // 5) settings : réglages PAR ENTREPRISE (unique key → unique [company_id, key])
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique('settings_key_unique');
        });
        if (! Schema::hasColumn('settings', 'company_id')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->foreignId('company_id')->nullable()->after('id')
                    ->constrained('companies')->nullOnDelete();
            });
        }
        Schema::table('settings', function (Blueprint $table) {
            $table->unique(['company_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'key']);
            $table->dropConstrainedForeignId('company_id');
            $table->unique('key');
        });

        foreach (['licenses', 'users'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('company_id');
            });
        }

        foreach (array_reverse(self::TENANT_TABLES) as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('company_id');
            });
        }

        Schema::dropIfExists('companies');
    }
};
