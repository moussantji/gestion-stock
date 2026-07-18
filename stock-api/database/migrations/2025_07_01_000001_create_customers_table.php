<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 👥 CRM clients : fiche client réutilisable + lien sur les reçus.
 * client_name/client_phone restent sur receipts en snapshot
 * (un reçu doit rester lisible même si la fiche client change/est supprimée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 30)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('notes', 500)->nullable();
            $table->timestamps();
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('client_phone')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
        });
        Schema::dropIfExists('customers');
    }
};
