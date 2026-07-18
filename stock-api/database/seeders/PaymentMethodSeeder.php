<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        // ⚠️ Remplace les numéros par tes vrais numéros marchands
        // (ou modifie-les ensuite depuis /admin → Paiements)
        $methods = [
            [
                'key' => 'orange_money',
                'name' => 'Orange Money',
                'icon' => '🟠',
                'account' => '+223 70 00 00 00',
                'instructions' => "Composez #144# sur votre téléphone Orange\nChoisissez « Transfert d'argent » vers le numéro marchand StockFlow\nEntrez le montant exact de votre commande\nIndiquez la référence de commande en commentaire\nConservez le SMS de confirmation comme preuve",
                'sort_order' => 1,
            ],
            [
                'key' => 'wave',
                'name' => 'Wave',
                'icon' => '🔵',
                'account' => '+223 70 00 00 00',
                'instructions' => "Ouvrez l'application Wave\nEnvoyez le montant exact au numéro marchand StockFlow\nAjoutez la référence de commande en commentaire\nFaites une capture d'écran de la confirmation",
                'sort_order' => 2,
            ],
            [
                'key' => 'moov_money',
                'name' => 'Moov Money',
                'icon' => '🟣',
                'account' => '+223 70 00 00 00',
                'instructions' => "Composez *555# sur votre téléphone Moov\nChoisissez « Transfert » vers le numéro marchand StockFlow\nEntrez le montant exact de votre commande\nMentionnez la référence de commande\nConservez le SMS de confirmation",
                'sort_order' => 3,
            ],
            [
                'key' => 'virement',
                'name' => 'Virement bancaire',
                'icon' => '🏦',
                'account' => 'IBAN : ML00 0000 0000 0000 0000 — StockFlow SARL',
                'instructions' => "Effectuez un virement du montant exact vers le compte indiqué\nIndiquez impérativement la référence de commande dans le motif\nEnvoyez le reçu à support@stockflow.app",
                'sort_order' => 4,
            ],
        ];

        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(['key' => $method['key']], $method);
        }
    }
}
