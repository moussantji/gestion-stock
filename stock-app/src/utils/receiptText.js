// ============================================================
// 🧾 v2.8 (mobile v19) — Reçu en TEXTE mis en forme, prêt pour
// WhatsApp (partage fiche système, accents conservés).
// Zéro dépendance : pur formatage de chaînes.
// ============================================================

const money = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))} F`;
const SEP = '--------------------------------';
const SEP2 = '================================';

/** Colonne droite alignée à 42 caractères (largeur ticket). */
const col = (left, right) => {
  const room = 42 - String(right).length;
  const l = String(left).length > room ? `${String(left).slice(0, Math.max(1, room - 1))}…` : String(left);
  return l.padEnd(Math.max(l.length + 1, room), ' ') + right;
};

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(iso ?? ''); }
};

/**
 * Construit le texte du reçu.
 * @param receipt reçu DÉTAILLÉ (items inclus) — GET /receipts/{id}
 * @param shop    boutique ({ name, address, phone })
 * @param t       traducteur i18n (clés wa_txt_*)
 * @param tva     🧮 v2.9 : ventilation « dont TVA » du serveur (null = inchangé)
 */
export function buildReceiptText(receipt, shop, t, tva = null) {
  const items = receipt?.items ?? [];
  const paid = Number(receipt?.amount_paid ?? receipt?.total ?? 0);
  const remaining = Number(receipt?.remaining ?? Math.max(0, Number(receipt?.total ?? 0) - paid));
  const refundedAmt = items.reduce((s, it) => s + Number(it.refunded_qty ?? 0) * Number(it.unit_price ?? 0), 0); // 🧾 v23 (v2.12)
  const out = [];

  out.push(`🧾 *${String(shop?.name ?? 'StockFlow').toUpperCase()}*`);
  if (shop?.address) out.push(String(shop.address));
  if (shop?.phone) out.push(`Tél : ${shop.phone}`);
  out.push(SEP);
  out.push(col(String(receipt?.number ?? ''), fmtDate(receipt?.created_at)));
  if (receipt?.client_name) out.push(col('Client :', String(receipt.client_name)));
  if (receipt?.user?.name) out.push(col('Vendeur :', String(receipt.user.name)));
  out.push(SEP);
  items.forEach((it) => {
    out.push(String(it.product_name ?? '—') + (it.promo ? ` 🏷️ ${t('pr_badge')}` : '')); // 🏷️ v22
    out.push(col(`  ${it.quantity} x ${money(it.unit_price)}`, money(it.subtotal)));
    const rq = Number(it.refunded_qty ?? 0); // 🧾 v23 : avoir partiel sur la ligne (additif)
    if (rq > 0) out.push(col(`  ↩ ${rq}`, t('rt_refunded')));
  });
  out.push(SEP2);
  out.push(col(`${t('wa_txt_total')} :`, `*${money(receipt?.total)}*`));
  // 🧮 v2.9 : ventilation « dont TVA » (additif — absent = texte identique à la v19)
  if (tva?.enabled && (tva?.by_rate ?? []).length) {
    out.push(col(`${t('wa_txt_ht')} :`, money(tva.total_ht ?? 0)));
    (tva.by_rate ?? []).forEach((row) => out.push(col(t('wa_txt_vat', { rate: row.rate }), money(row.amount ?? 0))));
  }
  if (refundedAmt > 0) { // 🧾 v23 : récap avoirs (absent sans retour — indépendant du reste à payer)
    out.push(col(`${t('rt_avoir')} :`, `- ${money(refundedAmt)}`));
    out.push(col(`${t('rt_net')} :`, money(Math.max(0, Number(receipt?.total ?? 0) - refundedAmt))));
  }
  if (remaining > 0) {
    out.push(col(`${t('wa_txt_paid')} :`, money(paid)));
    out.push(col(`${t('wa_txt_due')} :`, `*${money(remaining)}*`));
  }
  out.push(SEP);
  out.push(`${items.length} article(s) — ${remaining > 0 ? `⚠️ ${t('wa_txt_due')}` : '✅'}`);
  out.push(t('wa_txt_thanks'));
  return out.join('\n');
}
