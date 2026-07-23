<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 🎁 Points de fidélité : solde client + journal + remise en points sur les ventes
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedInteger('loyalty_points')->default(0)->after('notes');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->unsignedInteger('points_discount')->default(0)->after('amount_paid'); // remise FCFA
            $table->unsignedInteger('points_redeemed')->default(0)->after('points_discount');
        });

        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('receipt_id')->nullable()->constrained('receipts')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('points');                 // signé : +gain / −utilisation
            $table->string('type', 10);                // earn | redeem | adjust
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropColumn(['points_discount', 'points_redeemed']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('loyalty_points');
        });
    }
};
