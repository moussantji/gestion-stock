<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Pour démarrer une petite boutique.',
                'price' => 25000,
                'duration_days' => 30,
                'max_users' => 2,
                'max_products' => 100,
                'features' => [
                    'Gestion des produits & catégories',
                    'Entrées / sorties de stock',
                    'Alertes de stock bas',
                    '2 utilisateurs',
                    'Support par email',
                ],
                'sort_order' => 1,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'Pour les commerces en croissance.',
                'price' => 59000,
                'duration_days' => 30,
                'max_users' => 10,
                'max_products' => 1000,
                'features' => [
                    'Tout Starter',
                    'Scan de code-barres 📷',
                    'Mode hors ligne + synchronisation',
                    'Tableau de bord avancé',
                    'Fournisseurs & exports CSV',
                    '10 utilisateurs',
                    'Support prioritaire',
                ],
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Pour les réseaux de boutiques et grossistes.',
                'price' => 149000,
                'duration_days' => 30,
                'max_users' => 100,
                'max_products' => 100000,
                'features' => [
                    'Tout Business',
                    'Utilisateurs illimités',
                    'Produits illimités',
                    'Rôles & permissions avancés',
                    'API dédiée & intégrations',
                    'Formation de l\'équipe',
                    'Support dédié 7j/7',
                ],
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
