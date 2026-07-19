<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PurchaseOrderService;
use App\Services\PushService;
use Illuminate\Console\Command;

/**
 * 📦 Génération AUTOMATIQUE des bons de commande fournisseurs
 * pour les produits en stock bas (un bon par fournisseur, anti-doublon).
 * Planifié chaque matin à 08:00 (voir routes/console.php).
 */
class AutoPurchaseOrders extends Command
{
    protected $signature = 'stock:auto-purchase-orders';

    protected $description = 'Génère les bons de commande fournisseurs pour le stock bas (anti-doublon).';

    public function handle(): int
    {
        $created = PurchaseOrderService::generateFromLowStock(User::where('role', User::ROLE_ADMIN)->first());

        if (empty($created)) {
            $this->info('✅ Rien à commander (stock OK ou déjà couvert).');

            return self::SUCCESS;
        }

        $numbers = collect($created)->pluck('number')->all();
        foreach ($numbers as $number) {
            $this->info("📦 Bon généré : {$number}");
        }

        // 🔔 Push distante vers les admins
        $pushed = PushService::sendToAdmins(
            '📦 Stock bas — bons de commande',
            count($created).' bon(s) généré(s) automatiquement : '.implode(', ', $numbers),
            ['type' => 'auto_purchase_orders', 'count' => count($created)]
        );
        $this->info("🔔 Push envoyée à {$pushed} téléphone(s) admin.");

        return self::SUCCESS;
    }
}
