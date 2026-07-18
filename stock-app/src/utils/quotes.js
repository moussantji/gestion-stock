// ============================================================
// 🧾 v21 (v2.10) — Devis / proforma LOCAUX (brouillons sur le
// téléphone). Zéro serveur : créés depuis le panier, partagés en
// texte WhatsApp, rechargés en 1 tap quand le client se décide.
// Stockage : fichier JSON (expo-file-system legacy, déjà présent).
// ============================================================
import * as FileSystem from 'expo-file-system/legacy';

const FILE = `${FileSystem.documentDirectory}sf-quotes.json`;
const MAX = 50;
const VALID_DAYS = 7; // validité affichée (jours)

const money = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))} F`;

/** Liste des brouillons (les plus récents d'abord). Jamais d'exception. */
export async function listQuotes() {
  try {
    const raw = await FileSystem.readAsStringAsync(FILE);
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; } // fichier absent / corrompu → liste vide
}

async function persist(arr) {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(arr.slice(0, MAX)));
}

/**
 * Enregistre un brouillon depuis le panier.
 * @param lines [{product_id, name, qty, unit_price}]
 * @param meta  { customer?: {id?, name?} }
 */
export async function saveQuote(lines, meta = {}) {
  const clean = (Array.isArray(lines) ? lines : [])
    .map((l) => ({ product_id: l.product_id, name: String(l.name ?? ''), qty: Math.max(1, parseInt(l.qty, 10) || 1), unit_price: Math.max(0, Math.round(Number(l.unit_price) || 0)) }))
    .filter((l) => l.product_id != null && l.unit_price > 0);
  if (!clean.length) return null;
  const now = new Date();
  const quote = {
    id: `DEV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`,
    created_at: now.toISOString(),
    customer: meta.customer ? { id: meta.customer.id ?? null, name: String(meta.customer.name ?? '') } : null,
    lines: clean,
    total: clean.reduce((s, l) => s + l.unit_price * l.qty, 0),
  };
  await persist([quote, ...(await listQuotes())]);
  return quote;
}

export async function removeQuote(id) {
  await persist((await listQuotes()).filter((q) => q.id !== id));
}

/** Date de validité = création + VALID_DAYS. */
export function validUntil(q) {
  const d = new Date(q.created_at);
  d.setDate(d.getDate() + VALID_DAYS);
  return d;
}

/** Texte 42 colonnes prêt pour WhatsApp (mêmes conventions que le reçu v19). */
export function buildQuoteText(q, shop, t) {
  const col = (left, right) => {
    const room = 42 - String(right).length;
    const l = String(left).length > room ? `${String(left).slice(0, Math.max(1, room - 1))}…` : String(left);
    return l.padEnd(Math.max(l.length + 1, room), ' ') + right;
  };
  const SEP = '--------------------------------';
  const SEP2 = '================================';
  const out = [];
  out.push(`📋 *${t('q_number')} ${q.id}*`);
  out.push(`*${String(shop?.name ?? 'StockFlow').toUpperCase()}*`);
  if (shop?.address) out.push(String(shop.address));
  if (shop?.phone) out.push(`Tél : ${shop.phone}`);
  out.push(SEP);
  out.push(col(new Date(q.created_at).toLocaleDateString('fr-FR'), t('q_valid', { date: new Date(validUntil(q)).toLocaleDateString('fr-FR') })));
  if (q.customer?.name) out.push(col('Client :', q.customer.name));
  out.push(SEP);
  (q.lines ?? []).forEach((l) => {
    out.push(String(l.name ?? '—'));
    out.push(col(`  ${l.qty} x ${money(l.unit_price)}`, money(l.unit_price * l.qty)));
  });
  out.push(SEP2);
  out.push(col(`${t('wa_txt_total_q')} :`, `*${money(q.total)}*`));
  out.push(SEP);
  out.push(t('q_note'));
  return out.join('\n');
}
