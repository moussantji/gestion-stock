<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\PushToken;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Console\Command;

/** 🔔 Digest push quotidien : produits en stock bas / rupture → admins + managers. */
class SendLowStockDigest extends Command
{
    protected $signature = 'stock:low-stock-digest';

    protected $description = 'Envoie le récap push quotidien des produits en stock bas (admins + managers)';

    public function handle(): int
    {
        // Seuil d'alerte atteint (même logique que Product::lowStock)
        $low = Product::whereRaw('quantity <= alert_threshold')->count();
        $out = Product::where('quantity', 0)->count();

        if ($low === 0) {
            $this->info('Aucun produit en stock bas — pas de digest.');

            return self::SUCCESS;
        }

        $names = Product::whereRaw('quantity <= alert_threshold')
            ->orderBy('quantity')
            ->limit(3)
            ->pluck('name')
            ->all();

        $title = "📦 Stock bas : {$low} produit(s)";
        $body = ($out > 0 ? "Dont {$out} en rupture. " : '')
            .'À réapprovisionner : '.implode(', ', $names)
            .($low > 3 ? '…' : '');

        // Admins + managers (les gens qui décident du réassort)
        $tokens = PushToken::whereIn(
            'user_id',
            User::whereIn('role', ['admin', 'manager'])->pluck('id')
        )->pluck('token')->all();

        $sent = PushService::send($tokens, $title, $body, ['type' => 'low_stock_digest']);

        $this->info("Digest envoyé à {$sent} appareil(s) — {$low} produit(s) en alerte.");

        return self::SUCCESS;
    }
}
