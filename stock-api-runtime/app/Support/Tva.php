<?php

namespace App\Support;

/**
 * 🧮 v2.9 — Multi-TVA de PRÉSENTATION, zéro migration.
 *
 * La config vit dans le réglage texte `tva_config` (JSON) :
 * {
 *   "enabled": true,
 *   "default_rate": 18,           // % appliqué par défaut (0 = hors TVA)
 *   "categories": { "3": 9 },     // taux par catégorie (id → %)
 *   "products":  { "12": 5 }      // exception par produit (id → %)
 * }
 *
 * Les prix boutique sont TTC : on « dé-ventile » (dont TVA) —
 * base = total / (1 + taux), tva = total − base. Rien n'est figé
 * sur les reçus passés : la ventilation reflète la config du moment
 * (curseur 0-migration assumé, documenté dans les README).
 */
class Tva
{
    /**
     * Config brute, toujours saine.
     * @return array{enabled: bool, default_rate: float, categories: array, products: array}
     */
    public static function config(): array
    {
        $raw = trim((string) Setting::getText('tva_config'));
        $cfg = $raw !== '' ? json_decode($raw, true) : null;
        if (! is_array($cfg)) {
            $cfg = [];
        }

        return [
            'enabled' => (bool) ($cfg['enabled'] ?? false),
            'default_rate' => max(0, min(100, (float) ($cfg['default_rate'] ?? 0))),
            'categories' => is_array($cfg['categories'] ?? null) ? $cfg['categories'] : [],
            'products' => is_array($cfg['products'] ?? null) ? $cfg['products'] : [],
        ];
    }

    /** Config exposée aux clients (via GET /shop) : ventilation locale possible. */
    public static function payload(): array
    {
        return self::config(); // {enabled, default_rate, categories, products}
    }

    /**
     * Résolution du taux (%) pour une ligne : produit → catégorie → défaut.
     * @param array $cfg voir config()
     */
    public static function rateFor(array $cfg, ?int $productId, ?int $categoryId): float
    {
        if ($productId !== null && isset($cfg['products'][(string) $productId])) {
            return max(0, min(100, (float) $cfg['products'][(string) $productId]));
        }
        if ($categoryId !== null && isset($cfg['categories'][(string) $categoryId])) {
            return max(0, min(100, (float) $cfg['categories'][(string) $categoryId]));
        }

        return (float) $cfg['default_rate'];
    }

    /**
     * Ventilation d'un ensemble de lignes vendues (prix TTC).
     * @param iterable $items objets ->product_id, ->product?->category_id, ->subtotal (net de la ligne)
     * @return array{enabled: bool, total_tva: int, total_ht: int, by_rate: array<int, array{rate: float, amount: int}>}
     */
    public static function breakdown(iterable $items): array
    {
        $cfg = self::config();
        $empty = ['enabled' => false, 'total_tva' => 0, 'total_ht' => 0, 'by_rate' => []];
        if (! $cfg['enabled']) {
            return $empty;
        }

        $perRate = []; // rate (arrondi 2) → montant TVA cumulé
        $totalTva = 0;
        $totalTtc = 0;
        foreach ($items as $it) {
            $ttc = (int) round((float) ($it->subtotal ?? 0));
            if ($ttc === 0) {
                continue;
            }
            $rate = self::rateFor($cfg, isset($it->product_id) ? (int) $it->product_id : null,
                isset($it->product->category_id) ? (int) $it->product->category_id : null);
            $tva = $rate > 0 ? (int) round($ttc - $ttc / (1 + $rate / 100)) : 0;
            $totalTtc += $ttc;
            $totalTva += $tva;
            if ($tva > 0) {
                $key = (string) round($rate, 2);
                $perRate[$key] = ($perRate[$key] ?? 0) + $tva;
            }
        }

        if ($totalTva === 0) {
            return $empty + ['total_ht' => $totalTtc]; // activée mais tout est hors taxe → pas de bloc
        }

        $byRate = [];
        foreach ($perRate as $rate => $amount) { // taux croissants = lecture comptable
            $byRate[] = ['rate' => (float) $rate, 'amount' => $amount];
        }
        usort($byRate, fn ($a, $b) => $a['rate'] <=> $b['rate']);

        return [
            'enabled' => true,
            'total_tva' => $totalTva,
            'total_ht' => $totalTtc - $totalTva,
            'by_rate' => $byRate,
        ];
    }
}
