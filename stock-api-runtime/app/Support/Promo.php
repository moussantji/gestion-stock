<?php

namespace App\Support;

/**
 * 🏷️ v2.11 — Prix promo DATÉS, zéro migration.
 *
 * La config vit dans le réglage texte `promo_config` (JSON, édité côté PC
 * dans 🎯 Seuils → carte « 🏷️ Promos ») :
 * {
 *   "12": { "price": 3500, "from": "2026-07-15", "to": "2026-07-31" },
 *   "34": { "price":  900, "from": "2026-08-01", "to": "2026-08-15" }
 * }
 *
 * Une promo est ACTIVE si aujourd'hui ∈ [from, to] (bornes incluses,
 * dates AAAA-MM-JJ comparées lexicographiquement). Hors période → ignorée
 * partout : le prix normal revient TOUT SEUL (retour automatique).
 *
 * Règles métier :
 *  - la promo ne remplace JAMAIS le prix de gros (clients « gros ») ;
 *  - prix de PRÉSENTATION appliqué quand le client n'envoie pas de unit_price ;
 *  - le drapeau `promo` des lignes de reçu est une mention du MOMENT (pas un
 *    snapshot historique) : il compare le prix facturé au promo actuellement
 *    actif — curseur 0-migration assumé, documenté dans les README.
 */
class Promo
{
    /** Cache de la config saine pour la requête courante. */
    private static ?array $cache = null;

    /**
     * Config normalisée : product_id → ['price' => int, 'from' => 'AAAA-MM-JJ', 'to' => 'AAAA-MM-JJ']
     * Lignes invalides (prix ≤ 0, dates malformées, from > to) silencieusement ignorées.
     *
     * @return array<int, array{price: int, from: string, to: string}>
     */
    public static function config(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $raw = trim((string) Setting::getText('promo_config'));
        $cfg = $raw !== '' ? json_decode($raw, true) : null;
        $out = [];
        if (is_array($cfg)) {
            foreach ($cfg as $pid => $row) {
                $pid = (int) $pid;
                if ($pid <= 0 || ! is_array($row)) {
                    continue;
                }
                $price = (int) ($row['price'] ?? 0);
                $from = self::date($row['from'] ?? null);
                $to = self::date($row['to'] ?? null);
                if ($price <= 0 || $from === null || $to === null || $from > $to) {
                    continue;
                }
                $out[$pid] = ['price' => $price, 'from' => $from, 'to' => $to];
            }
        }

        return self::$cache = $out;
    }

    /** Promo ACTIVE aujourd'hui (ou à la date $today AAAA-MM-JJ) — null sinon. */
    public static function activeFor(int $productId, ?string $today = null): ?array
    {
        $row = self::config()[$productId] ?? null;
        if ($row === null) {
            return null;
        }
        $today ??= now()->toDateString();

        return ($row['from'] <= $today && $today <= $row['to']) ? $row : null;
    }

    /** Prix promo actif du produit — null sinon (prix normal conservé). */
    public static function priceFor(mixed $product, ?string $today = null): ?int
    {
        $id = (int) (is_object($product) ? ($product->id ?? 0) : $product);
        $active = $id > 0 ? self::activeFor($id, $today) : null;

        return $active ? (int) $active['price'] : null;
    }

    /** La ligne facturée correspond-elle exactement au promo ACTIF du produit ? */
    public static function matchesLine(int $productId, int $unitPrice, ?string $today = null): bool
    {
        $active = self::activeFor($productId, $today);

        return $active !== null && (int) $active['price'] === $unitPrice;
    }

    /**
     * Décore les lignes d'un reçu (additif) : $item->promo = true quand la ligne
     * est au prix promo actif. Reçoit un modèle Receipt avec `items` chargées.
     */
    public static function flagReceiptItems($receipt): void
    {
        foreach (($receipt->items ?? []) as $item) {
            $item->promo = self::matchesLine((int) ($item->product_id ?? 0), (int) ($item->unit_price ?? 0));
        }
    }

    /** Garde-fou de date : AAAA-MM-JJ strict, sinon null. */
    private static function date(mixed $value): ?string
    {
        $value = trim((string) $value);

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : null;
    }
}
