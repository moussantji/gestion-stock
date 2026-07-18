<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Comptes par rôle — mot de passe : "password"
        User::create([
            'name' => 'Admin',
            'email' => 'admin@stock.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);

        User::create([
            'name' => 'Fatou Diarra',
            'email' => 'manageur@stock.com',
            'password' => 'password',
            'role' => User::ROLE_MANAGER,
        ]);

        User::create([
            'name' => 'Moussa Keita',
            'email' => 'employe@stock.com',
            'password' => 'password',
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $this->call([DemoDataSeeder::class, PlanSeeder::class, PaymentMethodSeeder::class]);
    }
}
