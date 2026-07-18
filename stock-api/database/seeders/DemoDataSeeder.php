<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Catégories ----------
        $categories = collect([
            ['name' => 'Boissons', 'description' => 'Eaux, jus et boissons diverses'],
            ['name' => 'Épicerie', 'description' => 'Produits alimentaires de base'],
            ['name' => 'Hygiène & Maison', 'description' => 'Nettoyage et hygiène'],
            ['name' => 'Électronique', 'description' => 'Accessoires électroniques'],
            ['name' => 'Papeterie', 'description' => 'Fournitures de bureau'],
            ['name' => 'Congelés', 'description' => 'Produits surgelés et congelés'],
        ])->mapWithKeys(fn ($c) => [$c['name'] => Category::create($c)]);

        // ---------- Fournisseurs ----------
        $suppliers = collect([
            ['name' => 'Distribution Sahel', 'phone' => '+223 20 22 45 67', 'email' => 'contact@distsahel.ml', 'address' => 'ACI 2000, Bamako'],
            ['name' => 'Société Traoré & Frères', 'phone' => '+223 76 45 32 10', 'email' => 'vente@traorefreres.ml', 'address' => 'Marché Dibida, Bamako'],
            ['name' => 'Niamaya Trading', 'phone' => '+223 65 90 12 34', 'email' => 'info@niamayatrading.com', 'address' => 'Kalaban Coura'],
            ['name' => 'Global Import SARL', 'phone' => '+223 20 78 90 12', 'email' => 'sales@globalimport.ml', 'address' => 'Zone industrielle, Kati'],
            ['name' => 'Atlas Négoce', 'phone' => '+223 44 55 66 77', 'email' => 'contact@atlasnegoce.com', 'address' => 'Badalabougou, Bamako'],
        ])->map(fn ($s) => Supplier::create($s));

        // ---------- Produits ----------
        // [name, sku, barcode, catégorie, fournisseur, prix_achat, prix_vente, seuil, force_sous_seuil?]
        $catalog = [
            ['Eau minérale 1,5L', 'EAU-150', '6130001000012', 'Boissons', 150, 250, 24],
            ['Jus de bissap 33cl', 'JUS-BIS33', '6130001000029', 'Boissons', 200, 350, 20],
            ['Soda cola 33cl', 'SOD-COLA33', '6130001000036', 'Boissons', 250, 400, 24],
            ['Riz parfumé 5kg', 'RIZ-5KG', '6130001000043', 'Épicerie', 3500, 4500, 10],
            ['Huile végétale 5L', 'HUI-5L', '6130001000050', 'Épicerie', 6500, 7500, 8],
            ['Sucre blanc 1kg', 'SUC-1KG', '6130001000067', 'Épicerie', 750, 900, 30],
            ['Lait en poudre 400g', 'LAI-400', '6130001000074', 'Épicerie', 2200, 2750, 12],
            ['Savon de Marseille', 'SAV-MAR', '6130001000081', 'Hygiène & Maison', 400, 600, 25],
            ['Détergent poudre 2kg', 'DET-2KG', '6130001000098', 'Hygiène & Maison', 1800, 2400, 12],
            ['Eau de javel 1L', 'JAV-1L', null, 'Hygiène & Maison', 300, 500, 15],
            ['Ampoule LED 12W', 'AMP-LED12', '6130001000104', 'Électronique', 1200, 2000, 10],
            ['Câble USB-C 1m', 'CAB-USBC', '6130001000111', 'Électronique', 800, 1500, 15],
            ['Écouteurs filaires', 'ECO-FIL', null, 'Électronique', 1000, 2500, 8],
            ['Cahier 200 pages', 'CAH-200', '6130001000128', 'Papeterie', 500, 900, 20],
            ['Stylo bille bleu', 'STY-BLEU', null, 'Papeterie', 100, 200, 50],
            ['Poulet congelé 1kg', 'PF-CONG1', '6130001000135', 'Congelés', 2000, 2800, 10],
            ['Poisson fumé 500g', 'POI-FUM500', null, 'Congelés', 1500, 2200, 8],
        ];

        $users = User::all();
        $manager = $users->firstWhere('role', User::ROLE_MANAGER) ?? $users->first();
        $employee = $users->firstWhere('role', User::ROLE_EMPLOYEE) ?? $users->first();

        $products = [];

        foreach ($catalog as [$name, $sku, $barcode, $categoryName, $purchase, $sale, $threshold]) {
            $products[] = Product::create([
                'category_id' => $categories[$categoryName]->id,
                'supplier_id' => $suppliers->random()->id,
                'name' => $name,
                'sku' => $sku,
                'barcode' => $barcode,
                'purchase_price' => $purchase,
                'sale_price' => $sale,
                'quantity' => 0, // recalculé via les mouvements ci-dessous
                'alert_threshold' => $threshold,
            ]);
        }

        // ---------- Mouvements de démo ----------
        foreach ($products as $product) {
            // Livraison initiale il y a 8 à 15 jours
            $initialQty = rand(30, 120);
            $this->movement($product, $manager, 'in', $initialQty, rand(8, 15), 'Livraison initiale');

            $current = $initialQty;

            // 3 à 7 sorties sur la semaine écoulée
            foreach (range(1, rand(3, 7)) as $i) {
                $qty = min(rand(1, 15), $current);
                if ($qty < 1) {
                    break;
                }
                $current -= $qty;
                $this->movement($product, $employee, 'out', $qty, rand(0, 6), 'Vente');
            }

            // Parfois un réassort récent
            if (rand(0, 100) < 30) {
                $restock = rand(10, 40);
                $current += $restock;
                $this->movement($product, $manager, 'in', $restock, rand(0, 4), 'Réapprovisionnement');
            }

            $product->update(['quantity' => $current]);
        }

        // ---------- Forcer quelques alertes de stock bas ----------
        foreach (collect($products)->shuffle()->take(3) as $product) {
            $desired = rand(0, max(0, $product->alert_threshold - 1));
            $delta = $product->quantity - $desired;
            if ($delta > 0) {
                $this->movement($product, $employee, 'out', $delta, 0, 'Vente (démo alerte)');
                $product->update(['quantity' => $desired]);
            }
        }
    }

    /** Crée un mouvement daté d'il y a X jours. */
    private function movement(Product $product, User $user, string $type, int $qty, int $daysAgo, string $reason): void
    {
        $date = now()->subDays($daysAgo)->subHours(rand(0, 8));

        $m = new StockMovement();
        $m->product_id = $product->id;
        $m->user_id = $user->id;
        $m->type = $type;
        $m->quantity = $qty;
        $m->unit_price = $type === 'in' ? $product->purchase_price : $product->sale_price;
        $m->reason = $reason;
        $m->created_at = $date;
        $m->updated_at = $date;
        $m->save();
    }
}
