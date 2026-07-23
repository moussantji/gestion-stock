// ============================================================
// 🏷️📦🔔 v22 (v2.11) — utilitaires purs (zéro dépendance)
// Miroir du module PC promo.js :
//  · Prix promo datés : prix effectif, badge actif
//  · Inventaire tournant : rotation déterministe du jour
//  · Relance crédit : téléphone international + lien wa.me
// ============================================================

// ---------- 🏷️ Prix promo datés ----------
// Clés serveur ADDITIVES : p.promo_price (int|null), p.promo_until (AAAA-MM-JJ|null).
// null/absent → prix normal (vieux serveur = exactement comme avant).
export const promoActive = (p) => p != null && p.promo_price != null && Number(p.promo_price) > 0;

// Prix effectif : le prix de GROS n'est JAMAIS remplacé par une promo (règle serveur miroir).
export function effectivePrice(p, wholesale) {
  if (wholesale && p?.wholesale_price != null) return Math.round(Number(p.wholesale_price));
  if (promoActive(p)) return Math.round(Number(p.promo_price));
  return Math.round(Number(p?.sale_price ?? 0));
}

// ---------- 📦 Inventaire tournant ----------
// Tranche du jour : rotation DÉTERMINISTE (tri par id — identique sur tous les appareils),
// start = (jourEpoch × n) mod total — couvre le catalogue en ⌈total/n⌉ jours puis reboucle.
export function cycleList(products, n, date = new Date()) {
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
// Normalise un numéro : chiffres seuls ; 8 chiffres (Mali) → préfixe 223.
export function waPhoneIntl(phone) {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00223')) d = d.slice(2);
  if (d.length === 8) d = '223' + d;
  return d;
}

// Lien wa.me avec message pré-rempli (ouvre WhatsApp prêt à envoyer).
export function waLink(phone, text) {
  return `https://wa.me/${waPhoneIntl(phone)}?text=${encodeURIComponent(text ?? '')}`;
}
