// ============================================================
// 🏷️📦🔔 v2.11 — promo.js : utilitaire pur (zéro dépendance)
//  · Prix promo datés : prix effectif, badge actif
//  · Inventaire tournant : rotation déterministe du jour
//  · Relance crédit : téléphone international + lien wa.me
// Testable headless (pas de DOM requis).
// ============================================================
window.Promo = (() => {

  // ---------- 🏷️ Prix promo datés ----------
  // Clés serveur ADDITIVES : p.promo_price (int|null), p.promo_until (AAAA-MM-JJ|null).
  // null/absent → prix normal (vieux serveur = exactement comme avant).
  const promoActive = (p) => p != null && p.promo_price != null && Number(p.promo_price) > 0;

  /**
   * Prix effectif d'un article du catalogue.
   * Règle serveur miroir : le prix de GROS n'est JAMAIS remplacé par une promo.
   */
  function effectivePrice(p, wholesale) {
    if (wholesale && p?.wholesale_price != null) return Math.round(Number(p.wholesale_price));
    if (promoActive(p)) return Math.round(Number(p.promo_price));
    return Math.round(Number(p?.sale_price ?? 0));
  }

  // ---------- 📦 Inventaire tournant ----------
  /**
   * Tranche du jour pour le comptage tournant : rotation DÉTERMINISTE
   * (tri par id — la même sur tous les postes), start = (jourEpoch × n) mod total.
   * Couvre tout le catalogue en ⌈total/n⌉ jours, puis reboucle.
   */
  function cycleList(products, n, date = new Date()) {
    const list = (products ?? []).slice().sort((a, b) => Number(a.id) - Number(b.id));
    const total = list.length;
    n = Math.max(0, parseInt(n, 10) || 0);
    if (!total || !n) return [];
    const take = Math.min(n, total);
    const ms = date instanceof Date ? date.getTime() : Number(date);
    const dayIdx = Math.floor(ms / 86400000);
    const start = (((dayIdx * take) % total) + total) % total;
    const out = [];
    for (let i = 0; i < take; i++) out.push(list[(start + i) % total]);
    return out;
  }

  // ---------- 🔔 Relance crédit WhatsApp ----------
  /** Normalise un numéro : chiffres seuls ; 8 chiffres (Mali) → préfixe 223. */
  function waPhoneIntl(phone) {
    let d = String(phone ?? '').replace(/\D/g, '');
    if (d.startsWith('00223')) d = d.slice(2);
    if (d.length === 8) d = '223' + d;
    return d;
  }

  /** Lien wa.me avec message pré-rempli (ouvre WhatsApp avec le texte prêt). */
  function waLink(phone, text) {
    return `https://wa.me/${waPhoneIntl(phone)}?text=${encodeURIComponent(text ?? '')}`;
  }

  return { promoActive, effectivePrice, cycleList, waPhoneIntl, waLink };
})();
