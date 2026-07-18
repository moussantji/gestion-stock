// ============================================================
// 🛡 QA-RÉGRESSION StockFlow PC — v1.0 → v2.1 (historique)
// Batterie CONSOLIDÉE et PÉRENNE (vit dans le repo, contrairement
// aux batteries /tmp perdues aux purges). Couvre les fonctionnalités
// livrées avant v2.2 — le NEUF est testé par tools/qa-smoke.js +
// la batterie dédiée de la version en cours.
// Lancement : node tools/qa-regression.js   (depuis stock-pc/)
// Règle zéro-régression : ce fichier ne fait que GROSSIR. Ne jamais
// retirer un contrôle ; si le code change volontairement, adapter le
// contrôle en gardant l'intention d'origine.
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, '..', 'stock-api');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readApi = (p) => fs.readFileSync(path.join(API, p), 'utf8');
const run = (src, name) => vm.runInThisContext(src, { filename: name });

// ---------- DOM minimal ----------
function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, select() {}, click() {}, value: '', textContent: '', className: '', isConnected: true };
  Object.defineProperty(e, 'innerHTML', { get() { return ''; }, set(v) { if (v === '') e.children = []; } });
  return e;
}
global.window = globalThis;
global.document = { createElement: el, createElementNS: () => el('svg'),
  createTextNode: (t) => ({ nodeType: 3, text: String(t) }),
  getElementById: () => el('div'), querySelector: () => null, querySelectorAll: () => [], body: el('body') };
const store = new Map();
global.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
global.location = { hash: '' };

// ---------- Réseau / Electron simulés ----------
const netCalls = [];
const pdfCalls = [];
const fileCalls = [];
const posts = []; // {url, body}
let netThrows = false;
let receiptsPage = { data: [], last_page: 1 };
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (netThrows) throw new Error('ECONNREFUSED'); // serveur injoignable
  if (opts.method === 'POST') {
    const body = opts.body ? JSON.parse(String(opts.body)) : {};
    posts.push({ url: u, body });
    if (u.includes('/receipts') && !u.includes('/payments')) return ok({ data: { id: 777 + posts.length, ...body } });
    return ok({ data: { applied: 0, duplicate: true } });
  }
  if (u.includes('/stocks')) return ok({ data: [] });
  if (u.includes('/accounting/summary')) return ok({ data: { month: '2026-06', receipts: { count: 3, total: 90000, paid: 90000, points_discount: 0, refunds_total: 0 }, cash: { in: 0, out: 0, ops: 0 }, closings: { count: 2, sales: 88000, end_balance: 50000, days: [] } } });
  if (u.includes('/receipts')) return ok(receiptsPage);
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [],
    printNet: async (o) => { netCalls.push(o); return true; },
    printSilent: async () => true },
  pdf: { save: async (o) => { pdfCalls.push(o); return { saved: true, path: '/Rapports/' + o.defaultName, data64: 'QUJD' }; } },
  file: { save: async (o) => { fileCalls.push(o); return { saved: true, path: '/Rapports/' + o.name }; } },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js', 'src/js/ui.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', 'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
const toasts = [];
UI.toast = (msg, color, ms) => { toasts.push({ msg: String(msg ?? ''), color, ms }); };

let pass = 0; let ko = 0;
const check = (label, cond) => { if (cond) { pass++; console.log('  OK  ' + label); } else { ko++; console.log('  KO  ' + label); } };
const norm = (s) => String(s ?? '').replace(/[\u00A0\u202F ]/g, ' ');
const hasBytes = (arr, seq) => arr.join(',').includes(seq.join(','));
const asStr = (arr) => arr.map((c) => String.fromCharCode(c)).join('');

const RECEIPT = { id: 42, number: 'R-2026-0001', created_at: '2026-07-10T14:35:00Z', total: 15000, amount_paid: 10000, points_discount: 0, remaining: 5000, points_earned: 0,
  user: { name: 'Awa' }, customer: { name: 'Mme Traoré' },
  items: [{ product_name: 'Riz parfumé 5kg', quantity: 2, unit_price: 5000 }, { product_name: 'Huile 1L', quantity: 1, unit_price: 5000 }] };
const SHOP = { name: 'Épicerie Marième', address: 'ACI 2000', phone: '+223 70 00 00 00' };
const CLOSING = { id: 7, closing_date: '2026-07-10', sales_collected: 88000, total_in: 5000, total_out: 3000, balance: 212000, notes: 'RAS', user: { name: 'Awa' } };

(async () => {
  console.log('\n— 🖨 v1.0/1.6 : ticket de caisse ESC/POS —');
  const b = Thermal.buildBytes(RECEIPT, SHOP);
  const bs = asStr(b);
  check('init ESC@ + coupe partielle en fin', hasBytes(b.slice(0, 2), [0x1B, 0x40]) && hasBytes(b.slice(-4), [0x1D, 0x56, 0x41, 0x05]));
  check('centre + double taille + gras (en-tête boutique)', hasBytes(b, [0x1B, 0x61, 0x01]) && hasBytes(b, [0x1D, 0x21, 0x11]) && hasBytes(b, [0x1B, 0x45, 0x01]));
  check('accents neutralisés (pas d octet > 127)', b.every((x) => x <= 0x7F) && !bs.includes('é'));
  check('articles + TOTAL + Payé + RESTE A PAYER + client + vendeur', bs.includes('Riz parfume') && bs.includes('TOTAL') && bs.includes('Paye') && bs.includes('RESTE A PAYER') && bs.includes('Mme Traore') && bs.includes('Awa'));
  check('Merci + nom boutique ASCII', bs.includes('Merci de votre visite !') && bs.includes('Epicerie Marieme'));
  const bLogo = Thermal.buildBytes(RECEIPT, SHOP, [0x1D, 0x76, 0x30, 0x00, 1, 0, 1, 0, 0xFF]);
  check('logo raster inséré après init+centré (v1.6)', bLogo.slice(0, 5).join(',') === '27,64,27,97,1' && bLogo.slice(5, 8).join(',') === '29,118,48');
  const th = Thermal.buildTicketHtml(RECEIPT, SHOP);
  check('HTML 72mm : total + articles', th.includes('72mm') && th.includes('15 000') && th.includes('Riz parfumé'));

  console.log('\n— 🧾 v1.1/1.5 : Z de caisse —');
  const zb = Thermal.buildZBytes(CLOSING, SHOP, 'Boutique Sotuba');
  const zs = asStr(zb);
  check('Z : titre + caissier + point de vente', zs.includes('Z DE CAISSE') && zs.includes('Awa') && zs.includes('Boutique Sotuba'));
  check('Z : encaissé/apports/dépenses + SOLDE gras + signature', zs.includes('88 000') && zs.includes('+5 000') && zs.includes('-3 000') && hasBytes(zb, [0x1B, 0x45, 0x01]) && zs.includes('Signature'));
  check('Z : note RAS + coupe', zs.includes('RAS') && hasBytes(zb.slice(-4), [0x1D, 0x56, 0x41, 0x05]));
  check('Z HTML 72mm', Thermal.buildZHtml(CLOSING, SHOP).includes('Z DE CAISSE'));

  console.log('\n— 🏷 v1.9/2.0 : étiquette produit + CODE128 —');
  check('labelNameLines : 2 lignes max + tronqué « … »', (() => { const l = Thermal.labelNameLines('Sucre raffiné premium en morceaux 1kg', 20, 2); return l.length <= 2 && l.join(' ').length <= 45 && l.some((x) => x.endsWith('…')); })());
  check('barcodeSafe : accepte ASCII ≤30, refuse vide/accents', Thermal.buildLabelBytes({ name: 'A', sale_price: 1, barcode: ''.padEnd(31, 'x') }, {}).join(',').includes('29,107,73') === false);
  const lb = Thermal.buildLabelBytes({ name: 'Riz 5kg', sale_price: 5000, barcode: 'ART-001' }, SHOP);
  check('étiquette : init + prix + vrai CODE128 (GS k 73 {B) + coupe', hasBytes(lb.slice(0, 2), [0x1B, 0x40]) && lb.join(',').includes('29,107,73,9,123,66') && asStr(lb).includes('{BART-001') && hasBytes(lb.slice(-4), [0x1D, 0x56, 0x41, 0x05]));
  const lbNoBc = Thermal.buildLabelBytes({ name: 'Sans code', sale_price: 100 }, {});
  check('sans code-barres → aucune séquence GS k', !lbNoBc.join(',').includes('29,107,73'));
  const lh = Thermal.buildLabelHtml({ name: 'Riz 5kg©', sale_price: 5000, barcode: 'ART-001' }, {});
  check('étiquette HTML : nom + code affiché', lh.includes('ART-001') && lh.includes('Riz 5kg'));

  console.log('\n— 🖼 v1.6 : raster ESC/POS (logo) —');
  const px = new Uint8ClampedArray(8 * 8 * 4); // 8x8 opaque noir
  for (let i = 0; i < px.length; i += 4) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 255; }
  const ras = Thermal.rasterEscpos(px, 8, 8); // (data, width, height)
  check('GS v 0 + dimensions m=0 xL/yL + 8 octets de pixels', ras.slice(0, 8).join(',') === '29,118,48,0,1,0,8,0' && ras.length === 16);

  console.log('\n— 📡 v1.2 : ventes hors ligne (file + synchro idempotente) —');
  OfflineSales.clear();
  OfflineSales.enqueue({ client_uuid: 'uuid-A', total: 5000, items: [] }, { client: 'X', total: 5000 });
  OfflineSales.enqueue({ client_uuid: 'uuid-B', total: 7000, items: [] }, { client: 'Y', total: 7000 });
  check('enqueue → file de 2, meta conservée', OfflineSales.queueCount() === 2 && OfflineSales.queue()[0].meta.total === 5000);
  OfflineSales.saveCatalog([{ id: 1, name: 'P' }], [{ id: 2, name: 'C' }]);
  OfflineSales.saveCatalog([], []); // ne doit PAS écraser par du vide
  check('catalogue cache : jamais écrasé par du vide', OfflineSales.readCatalog().products.length === 1);
  posts.length = 0;
  const rSync = await OfflineSales.sync({ silent: true });
  check('sync : 2 ventes envoyées (client_uuid dans le corps), file vide', rSync.sent === 2 && OfflineSales.queueCount() === 0 && posts.filter((p) => p.url.includes('/receipts')).every((p) => p.body.client_uuid));

  console.log('\n— 🔁 v2.1 : versements crédit hors ligne (2 passes) —');
  OfflineSales.clear(); posts.length = 0;
  OfflineSales.enqueue({ client_uuid: 'uuid-C', total: 20000, items: [] }, { client: 'Z', total: 20000 });
  OfflineSales.enqueuePayment({ saleUuid: 'uuid-C' }, 12000, { client: 'Z' });
  OfflineSales.enqueuePayment({ receiptId: 99 }, 3000, { client: 'W' });
  OfflineSales.enqueuePayment({}, 500, { client: '?' }); // orphelin volontaire
  check('queueByKind : 1 vente / 3 versements', (() => { const k = OfflineSales.queueByKind(); return k.sales === 1 && k.payments === 3; })());
  check('enqueuePayment : montant min 1, kind payment', OfflineSales.queue().filter((x) => x.kind === 'payment').every((x) => x.payload.amount >= 1));
  const rP = await OfflineSales.sync({ silent: true });
  const payPosts = posts.filter((p) => p.url.includes('/payments'));
  check('passe 2 : uuid résolu par la carte (vente synchronisée) → /receipts/{id}/payments', payPosts.some((p) => !p.url.includes('by-uuid') && p.body.amount === 12000));
  check('passe 2 : id connu direct → /receipts/99/payments', payPosts.some((p) => p.url.includes('/receipts/99/payments')));
  check('orphelin (ni id ni uuid) → conservé avec erreur visible', OfflineSales.queueCount() === 1 && OfflineSales.queue()[0].error != null && rP.sent === 3);
  OfflineSales.clear();

  console.log('\n— 🤖 v1.4/1.5 : automatisations vente & clôture —');
  window.Auto.set({ ticket: false, report: false, zticket: false });
  check('afterSale désactivé → off', (await window.Auto.afterSale(RECEIPT)) === 'off');
  window.Auto.set({ ticket: true });
  check('afterSale sans receipt.id → no-receipt', (await window.Auto.afterSale({})) === 'no-receipt');
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'off' }));
  toasts.length = 0;
  check('afterSale sans thermique → no-printer + warning', (await window.Auto.afterSale(RECEIPT)) === 'no-printer' && toasts.at(-1).color === 'var(--warning)');
  check('afterClose désactivé → off', (await window.Auto.afterClose()) === 'off');
  check('afterCloseZ désactivé → off', (await window.Auto.afterCloseZ(CLOSING)) === 'off');
  window.Auto.set({ zticket: true });
  check('afterCloseZ sans closing.id → no-closing', (await window.Auto.afterCloseZ({})) === 'no-closing');
  window.Auto.set({ ticket: false, zticket: false, report: true });
  pdfCalls.length = 0; toasts.length = 0;
  check('afterClose rapport → saved (mode auto, zéro dialogue)', (await window.Auto.afterClose('30d')) === 'saved' && pdfCalls.some((c) => c.auto === true));
  window.Auto.set({ report: false });

  console.log('\n— 📅 v1.8 : récap mensuel auto —');
  window.Auto.set({ monthly: true });
  localStorage.removeItem('sfpc.auto_monthly.v1');
  check('1er appel = amorçage silencieux (seed)', (await window.Auto.maybeAutoMonthly('2026-07-02')) === 'seed');
  check('même mois → same', (await window.Auto.maybeAutoMonthly('2026-07-20')) === 'same');
  pdfCalls.length = 0;
  const rM = await window.Auto.maybeAutoMonthly('2026-08-01');
  check('changement de mois → saved PDF du MOIS PRÉCÉDENT (2026-07)', rM === 'saved' && pdfCalls.some((c) => String(c.defaultName).includes('2026-07')));
  window.Auto.set({ monthly: false });

  console.log('\n— 📦 v1.9 + 📤 2.0 : pack du jour (PDF + CSV) —');
  const closing = { ...CLOSING, closing_date: '2026-07-10' };
  const summary = { sales_collected_today: 88000, sales_count_today: 5, sales_yesterday: 80000, sales_by_user_today: [{ name: 'Awa', count: 5, total: 88000 }] };
  const pk = norm(StatReport.buildDayPackHtml({ closing, summary, shop: SHOP, user: null, placeName: 'Sotuba' }));
  check('pack jour : KPIs CA + comparaison « vs hier » + vendeurs + bloc Z + point de vente', pk.includes('88 000') && pk.includes('vs hier') && pk.includes('Awa') && pk.includes('Solde caisse') && pk.includes('Sotuba'));
  check('pack jour : clés serveur absentes → pas de crash (repli gracieux)', (() => { try { StatReport.buildDayPackHtml({ closing, summary: {}, shop: {}, user: null, placeName: null }); return true; } catch { return false; } })());
  const csv = StatReport.buildDayCsv([
    { number: 'R1', created_at: '2026-07-10T10:00:00Z', total: 10000, amount_paid: 6000, points_discount: 1000, user: { name: 'Awa' }, customer: { name: 'Dia;wara' } },
    { number: 'R2', created_at: '2026-07-09T10:00:00Z', total: 9999, amount_paid: 9999 }, // autre jour → exclu
  ], '2026-07-10');
  const csvLines = csv.split('\r\n');
  check('CSV : BOM UTF-8 + séparateur « ; » + filtre sur le jour (2 lignes + total)', csv.charCodeAt(0) === 0xFEFF && csvLines.length === 3 && !csv.includes('9 999') && !csv.includes('9999;'));
  check('CSV : reste = total - payé - points ; montants entiers ; « ; » échappé par guillemets', csv.split('\r\n')[1].endsWith(';3000') && csv.includes('"Dia;wara"'));
  window.Auto.set({ daypack: true, emailpack: false });
  receiptsPage = { data: [{ number: 'R1', created_at: '2026-07-10T10:00:00Z', total: 1000, amount_paid: 1000 }], last_page: 1 };
  pdfCalls.length = 0; fileCalls.length = 0;
  check('afterClosePack → saved + CSV bonus enregistré', (await window.Auto.afterClosePack(closing)) === 'saved' && pdfCalls.length === 1 && fileCalls.some((c) => c.name.includes('ventes-jour-2026-07-10')));

  console.log('\n— 📧 v2.1 : envoi email du pack au patron —');
  window.Auto.set({ daypack: false, emailpack: true });
  posts.length = 0; toasts.length = 0;
  check('emailPack sans data64 → no-data + warning', (await window.Auto.emailPack(closing, { saved: true }, null)) === 'no-data' && toasts.at(-1).color === 'var(--warning)');
  posts.length = 0;
  const rE = await window.Auto.emailPack(closing, { saved: true, data64: 'QUJD' }, { content: 'csv', name: 'v.csv' });
  check('emailPack → POST /accounting/email-pack (date + pdf base64 + csv)', rE === 'sent' && posts.some((p) => p.url.includes('/accounting/email-pack') && p.body.date === '2026-07-10' && p.body.pdf === 'QUJD' && p.body.csv_name === 'v.csv'));
  window.Auto.set({ emailpack: false });

  console.log('\n— 🧮 v2.1 : bilan hebdo auto (semaine ISO, lundi) —');
  const wk1 = window.Auto.weekKeyOf('2026-07-17'); // vendredi
  const wk2 = window.Auto.weekKeyOf('2026-07-13'); // lundi-même
  const wk3 = window.Auto.weekKeyOf('2024-12-30'); // lundi → année ISO 2025
  check('weekKeyOf : ven 17/07/2026 → 2026-W29 lundi 13/07', wk1.key === '2026-W29' && wk1.monday.getDay() === 1 && wk1.monday.getDate() === 13);
  check('weekKeyOf : lundi inchangé ; bascule ISO 30/12/2024 → 2025-W01', wk2.key === wk1.key && wk3.key === '2025-W01');
  window.Auto.set({ weekly: true, weeklyprint: false });
  localStorage.removeItem('sfpc.auto_weekly.v1');
  check('hebdo : 1er appel = seed', (await window.Auto.maybeAutoWeekly('2026-07-14')) === 'seed');
  check('hebdo : même semaine → same', (await window.Auto.maybeAutoWeekly('2026-07-19')) === 'same');
  pdfCalls.length = 0;
  const rW = await window.Auto.maybeAutoWeekly('2026-07-20'); // lun. semaine suivante → bilan du 06→12/07
  check('hebdo : nouvelle semaine → saved (PDF semaine écoulée)', rW === 'saved' && pdfCalls.length === 1);
  const wh = StatReport.buildWeeklyHtml({ from: '2026-07-06', to: '2026-07-12', recap: { receipts: { count: 2, total: 50000, paid: 50000, points_discount: 0, refunds_total: 0 }, cash: { in: 0, out: 0, ops: 0 }, closings: { count: 1, end_balance: 40000, days: [] } }, shop: SHOP, user: null, placeName: null });
  check('buildWeeklyHtml : plage lun→dim + total semaine', norm(wh).includes('lundi 6 juillet 2026') && norm(wh).includes('dimanche 12 juillet 2026') && norm(wh).includes('50 000'));
  window.Auto.set({ weekly: false });

  console.log('\n— 🏬 v1.3 + API : boutique rattachée & robustesse —');
  Api.setPickedShop({ shop_id: 3, name: 'Sotuba' });
  const seenHeaders = [];
  const realFetch = global.fetch;
  global.fetch = async (u, o = {}) => { seenHeaders.push(o.headers ?? {}); return realFetch(u, o); };
  await Api.get('/stocks');
  check('X-Shop-Id envoyé quand boutique choisie', seenHeaders.at(-1)['X-Shop-Id'] === '3');
  Api.clearPickedShop();
  await Api.get('/stocks');
  check('sans boutique → pas d en-tête X-Shop-Id', seenHeaders.at(-1)['X-Shop-Id'] === undefined);
  global.fetch = realFetch;
  global.fetch = async () => ({ ok: false, status: 422, json: async () => ({ message: 'Invalid', errors: { amount: ['Le montant est requis.'] } }) });
  let e422 = null;
  try { await Api.get('/x'); } catch (e) { e422 = e.message; }
  check('enveloppe Laravel 422 → 1er message de validation', e422 === 'Le montant est requis.');
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  try { await Api.get('/x'); } catch { /* attendu */ }
  check('401 → session effacée + retour login', !Api.token() && location.hash === '#/login');
  global.fetch = realFetch;
  store.set('sfpc.token', 'tok');

  console.log('\n— 🌍 i18n & config & coquilles Electron/serveur (contrats historiques) —');
  const ver = read('src/js/config.js').match(/APP_VERSION:\s*'([^']+)'/)[1];
  check('version format « StockFlow PC vN »', /StockFlow PC v\d/.test(ver));
  check('i18n : t(version) = APP_VERSION ; clé inconnue → la clé', I18n.t('version') === ver && I18n.t('__cle_absente__') === '__cle_absente__');
  const main = read('electron/main.js');
  check('main.js : sf:pdf-save (auto + data64), sf:file-save, ESC/POS, print-silent', ['sf:pdf-save', 'sf:file-save', 'sf:print-escpos', 'sf:print-silent'].every((x) => main.includes(x)) && main.includes('data64'));
  const pre = read('electron/preload.js');
  check('preload : ponts thermal/pdf/file exposés', pre.includes('thermal') && pre.includes('pdf') && pre.includes('file'));
  const rc = readApi('app/Http/Controllers/Api/ReceiptController.php');
  check('API : paiement by-uuid + anti-double 120s + client_uuid idempotent', (rc.includes('by-uuid') || rc.includes('addPaymentByUuid')) && rc.includes('duplicate') && rc.includes('client_uuid'));
  const ac = readApi('app/Http/Controllers/Api/AccountingExportController.php');
  check('API : export CSV + summary (mois ET plage from/to) + emailPack', ac.includes('emailPack') && ac.includes("'range'") && ac.includes('whereBetween'));
  const routes = readApi('routes/api.php');
  check('routes API : accounting/export + summary + email-pack + by-uuid payments', ['accounting/export', 'accounting/summary', 'email-pack', 'by-uuid'].every((x) => routes.includes(x)));

  console.log('\nRÉSULTAT RÉGRESSION v1.0→v2.1 : ' + pass + ' OK / ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
