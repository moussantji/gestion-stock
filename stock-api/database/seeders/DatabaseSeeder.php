<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 🌐 Données PLATEFORME d'abord (plans + moyens de paiement des abonnements).
        $this->call([PlanSeeder::class, PaymentMethodSeeder::class]);

        // 🏢 Super-admin PLATEFORME (StockFlow) — gère les abonnements via /admin.
        //    Sans entreprise : n'apparaît dans les données d'aucun locataire.
        User::create([
            'name' => 'StockFlow Admin',
            'email' => 'owner@stockflow.app',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'company_id' => null,
        ]);

        // 🏢 Entreprise de DÉMONSTRATION créée via le VRAI flux d'achat
        //    (commande payée → LicenseService::fulfillOrder → entreprise + licence + admin).
        $plan = Plan::query()->orderByDesc('price')->first();
        $order = Order::create([
            'reference' => Order::generateReference(),
            'plan_id' => $plan?->id,
            'plan_name' => $plan?->name ?? 'Pro',
            'amount' => $plan?->price ?? 15000,
            'buyer_name' => 'Boutique Démo',
            'buyer_email' => 'admin@stock.com',
            'buyer_phone' => '+223 70 00 00 00',
            'payment_method' => 'Orange Money',
            'status' => Order::STATUS_PENDING,
        ]);
        $result = LicenseService::fulfillOrder($order);
        $company = $result['company'];

        // Mot de passe démo fixe + personnel rattaché à l'entreprise — mdp : "password"
        $result['account']->update(['password' => 'password']);
        User::create([
            'name' => 'Fatou Diarra', 'email' => 'manageur@stock.com', 'password' => 'password',
            'role' => User::ROLE_MANAGER, 'company_id' => $company->id,
        ]);
        User::create([
            'name' => 'Moussa Keita', 'email' => 'employe@stock.com', 'password' => 'password',
            'role' => User::ROLE_EMPLOYEE, 'company_id' => $company->id,
        ]);

        // 📦 Stock de démonstration (rattaché à l'entreprise démo via Auth::login dans le seeder).
        $this->call([DemoDataSeeder::class]);
    }
}
