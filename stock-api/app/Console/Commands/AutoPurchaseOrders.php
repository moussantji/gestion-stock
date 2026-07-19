<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\PurchaseOrderService;
use App\Services\PushService;
use Illuminate\Console\Command;

/**
 * 📦 Génération AUTOMATIQUE des bons de commande fournisseurs
 * pour les produits en stock bas (un bon par fournisseur, anti-doublon).
 * Planifié chaque matin à 08:00 — exécuté POUR CHAQUE entreprise.
 */
class AutoPurchaseOrders extends Command
{
    protected $signature = 'stock:auto-purchase-orders';

    protected $description = 'Génère les bons de commande fournisseurs pour le stock bas (anti-doublon).';

    public function handle(): int
    {
        $total = 0;

        Company::runForEach(function (Company $company, $admin) use (&$total) {
            $created = PurchaseOrderService::generateFromLowStock($admin);
            if (empty($created)) {
                return;
            }

            $total += count($created);
            $numbers = collect($created)->pluck('number')->all();
            foreach ($numbers as $number) {
                $this->info("📦 [{$company->name}] Bon généré : {$number}");
            }

            // 🔔 Push vers les admins de CETTE entreprise uniquement
            PushService::sendToAdmins(
                '📦 Stock bas — bons de commande',
                count($created).' bon(s) généré(s) automatiquement : '.implode(', ', $numbers),
                ['type' => 'auto_purchase_orders', 'count' => count($created)],
                $company->id,
            );
        });

        $this->info($total === 0 ? '✅ Rien à commander (stock OK ou déjà couvert).' : "✅ {$total} bon(s) généré(s) au total.");

        return self::SUCCESS;
    }
}
