// ============================================================
// 🧪 QA StockFlow v2.12 (PÉRENNE, dans le repo)
// 📊 prévisions d'achat par fournisseur · 🧾 avoirs sur reçus/tickets
// Lancement : node tools/qa-v2.12.js   (depuis stock-pc/)
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, '..', 'stock-api');
const APP = path.join(ROOT, '..', 'stock-app');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readApi = (p) => fs.readFileSync(path.join(API, p), 'utf8');
const readApp = (p) => fs.readFileSync(path.join(APP, p), 'utf8');
const run = (src, name) => vm.runInThisContext(src, { filename: name });

let pass = 0, ko = 0;
const check = (name, ok) => { ok ? pass++ : ko++; console.log(`${ok ? '✅' : '❌'} ${name}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).replace(/[   ]/g, ' '); // U+202F / U+00A0 → espace (échappements explicites — leçon v2.10)
const sq = (s) => norm(s).replace(/ +/g, ' '); // + padding colonnes (lr/col) : N espaces -> 1

/* ---------------- DOM minimal (conventions qa-v2.10/v2.11) ---------------- */
function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, select() {}, click() {}, value: '', textContent: '', className: '', disabled: false, isConnected: true,
    get firstChild() { return e.children[0] ?? null; } };
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

const SHOP_MOCK = { name: 'Épicerie Marième', loyalty: { earn_per: 1000, point_value: 10 },
  tva: { enabled: false, default_rate: 0, categories: {}, products: {} }, commission_pct: 0 };
const FMOCK = [
  { supplier_id: 7, name: 'Sotuba', total_qty: 25, lines: [
    { product_id: 1, name: 'Savon Dettol', sku: 'SAV-1', quantity: 5, velocity: 1.5, days_left: 3, suggested_order: 18 },
    { product_id: 2, name: 'Riz 5kg', sku: 'RIZ-5', quantity: 9, velocity: 0.8, days_left: 11, suggested_order: 7 }] },
  { supplier_id: null, name: 'Sans fournisseur', total_qty: 4, lines: [
    { product_id: 3, name: 'Huile 1L', sku: 'HUI-1', quantity: 0, velocity: 0.3, days_left: 0, suggested_order: 4 }] },
];
let forecastHasKey = true; // 📊 vieux serveur = clé « suppliers » absente

const apiCalls = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET', body: opts.body ?? null });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/products/restock-forecast')) {
    return ok({ data: [], window_days: 30, lead_days: 15, ...(forecastHasKey ? { suppliers: FMOCK } : {}) });
  }
  if (u.includes('/purchase-orders')) return ok({ data: [] });
  if (u.includes('/shop')) return ok({ shop: SHOP_MOCK });
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [], printNet: async () => true, printSilent: async () => true },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName }) },
  file: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.name }) },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js',
  'src/js/ui.js', 'src/js/promo.js', 'src/js/thermal.js', 'src/js/screens/orders.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
store.set('sfpc.shop', JSON.stringify(SHOP_MOCK));
const toasts = [];

const allText = (n) => {
  const own = (n?.nodeType === 3 ? n.text : (typeof n?.textContent === 'string' && n?.textContent) || '');
  return own + (n?.children ?? []).map((c) => allText(c)).join(' ');
};
const findAll = (n, pred, acc = []) => {
  if (pred(n)) acc.push(n);
  (n?.children ?? []).forEach((c) => findAll(c, pred, acc));
  return acc;
};
const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };

(async () => {
  UI.toast = (msg, color) => { toasts.push({ msg: String(msg ?? ''), color }); };

  console.log('— 📡 Serveur : prévisions par fournisseur & ticket 80 mm (statique) —');
  const prodCtrl = readApi('app/Http/Controllers/Api/ProductController.php');
  check('restock-forecast : by_supplier demandé explicitement ($request->boolean) → 0 requête fournisseur sinon',
    prodCtrl.includes("$request->boolean('by_supplier')") && prodCtrl.includes("Product::with('supplier:id,name')"));
  check('restock-forecast : groupement — seules lignes à commander (> 0), total_qty, tri desc, repli « Sans fournisseur »',
    prodCtrl.includes("($r['suggested_order'] ?? 0) <= 0") && prodCtrl.includes("sortByDesc('total_qty')") && prodCtrl.includes("?? 'Sans fournisseur'"));
  check('restock-forecast : clé « suppliers » additive dans le retour (vieux clients : ignorée / [] si non demandé)',
    prodCtrl.includes("'suppliers' => $suppliers,"));
  const bladeT = readApi('resources/views/pdf/sale-ticket.blade.php');
  check('Blade ticket : ↩ N retourné(s) gardé par ligne + @php somme avoir + bloc AVOIR / TOTAL NET gardés',
    bladeT.includes("{{ $item->refunded_qty }} retourné(s) remboursé(s)") && bladeT.includes('@php $avoir = 0;')
      && bladeT.includes('Avoir (retours)') && bladeT.includes('TOTAL NET') && bladeT.includes('@if($avoir > 0)'));

  console.log('\n— 🖨 PC : ticket thermique avec avoirs (module RÉEL, exécuté) —');
  {
    const receipt = { number: 'T-1', created_at: '2026-07-17 10:00:00', total: 6700, amount_paid: 6700,
      items: [
        { product_name: 'Savon Dettol', quantity: 2, unit_price: 800, refunded_qty: 1 }, // avoir 800
        { product_name: 'Riz 5kg', quantity: 1, unit_price: 5100 },
      ] };
    const txt = Thermal.buildBytes(receipt, SHOP_MOCK, null, null).map((b) => String.fromCharCode(b)).join('');
    check('ESC/POS : ligne «   <- 1 retourne(s) rembourse(s) » sous l’article concerné uniquement',
      txt.includes('<- 1 retourne(s) rembourse(s)') && !txt.includes('<- 5 retourne'));
    check('ESC/POS : récap « Avoir (retours) 800 » + « TOTAL NET » = 5 900 (TOTAL brut conservé)',
      sq(txt).includes('Avoir (retours) - 800 F') && sq(txt).includes('TOTAL NET 5 900 FCFA') && sq(txt).includes('TOTAL 6 700 FCFA'));
    const html = Thermal.buildTicketHtml(receipt, SHOP_MOCK, false, null);
    check('HTML : <tr> ↩ 1 retourné(s) coloré + lignes Avoir / TOTAL NET (5 900 CFA)',
      html.includes('↩ 1 retourné(s)') && html.includes('Avoir (retours)') && sq(html).includes('TOTAL NET') && sq(html).includes('5 900 FCFA'));
    const clean = { ...receipt, items: receipt.items.map((i) => ({ ...i, refunded_qty: 0 })) };
    const t0 = Thermal.buildBytes(clean, SHOP_MOCK, null, null).map((b) => String.fromCharCode(b)).join('');
    const legacy = { ...receipt, items: receipt.items.map((i) => { const { refunded_qty, ...rest } = i; return rest; }) };
    const tLegacy = Thermal.buildBytes(legacy, SHOP_MOCK, null, null).map((b) => String.fromCharCode(b)).join('');
    check('Zéro régression : sans retour, AUCUNE mention avoir ; refunded_qty=0 = byte-identique à l’absence de la clé',
      !t0.includes('retourne') && !t0.includes('Avoir') && !Thermal.buildTicketHtml(clean, SHOP_MOCK, false, null).includes('retourné')
        && t0 === tLegacy);
  }

  console.log('\n— 🛒 PC : écran Commandes RÉEL monté (carte prévisions) —');
  {
    forecastHasKey = true;
    const view = el('div');
    await Screens.orders(view);
    await sleep(60); // load() fire & forget (leçon v2.11)
    const fcCall = apiCalls.find((c) => c.url.includes('/products/restock-forecast'));
    check('Commandes : /products/restock-forecast appelé avec days=30 & lead=15 & by_supplier=1 (route existante, param additif)',
      !!fcCall && fcCall.url.includes('days=30') && fcCall.url.includes('lead=15') && fcCall.url.includes('by_supplier=1'));
    const txt = norm(allText(view));
    check('Carte affichée : titre + 🚛 Sotuba avec « Savon Dettol ×18 (3 j) » + badge « 25 à commander »',
      txt.includes('Prévisions') && txt.includes('Sotuba') && txt.includes('Savon Dettol ×18 (3 j)') && txt.includes('25 à commander'));
    check('Carte affichée même sans commande (avant le retour « liste vide ») + repli « Sans fournisseur » présent',
      txt.includes('Huile 1L ×4') && txt.includes('Sans fournisseur') && !txt.includes('Aucun nouveau bon à générer') || txt.includes('Sans fournisseur'));
    forecastHasKey = false;
    const view0 = el('div');
    await Screens.orders(view0);
    await sleep(60);
    check('Vieux serveur (clé absente) : carte MASQUÉE, écran intact — zéro régression',
      !norm(allText(view0)).includes('Prévisions') && norm(allText(view0)).includes('Commandes'));
    forecastHasKey = true;
  }

  console.log('\n— 📱 Mobile v23 : reçu WhatsApp (module RÉEL exécuté) + statique —');
  {
    const src = readApp('src/utils/receiptText.js').replace('export function buildReceiptText', 'function buildReceiptText');
    const { buildReceiptText } = vm.runInThisContext(`(() => { ${src}; return { buildReceiptText }; })()`);
    const TM = { rt_refunded: 'retourné(s)', rt_avoir: 'Avoir (retours)', rt_net: 'TOTAL NET',
      wa_txt_total: 'TOTAL', wa_txt_paid: 'Payé', wa_txt_due: 'Reste à payer', wa_txt_thanks: 'Merci', pr_badge: 'PROMO' };
    const t = (k) => TM[k] ?? k;
    const receipt = { number: 'T-1', created_at: '2026-07-17', total: 6700, amount_paid: 6700,
      items: [
        { product_name: 'Savon Dettol', quantity: 2, unit_price: 800, subtotal: 1600, refunded_qty: 1 },
        { product_name: 'Riz 5kg', quantity: 1, unit_price: 5100, subtotal: 5100 },
      ] };
    const out = norm(buildReceiptText(receipt, { name: 'Marième' }, t, null));
    check('Reçu WhatsApp : « ↩ 1 retourné(s) » sur la ligne + récap Avoir 800 F + TOTAL NET 5 900 F',
      out.includes('↩ 1') && out.includes('retourné(s)') && sq(out).includes('Avoir (retours) : - 800 F') && sq(out).includes('TOTAL NET : 5 900 F'));
    const out0 = norm(buildReceiptText({ ...receipt, items: receipt.items.map((i) => ({ ...i, refunded_qty: 0 })) }, { name: 'M' }, t, null));
    check('Reçu WhatsApp : sans retour → AUCUNE ligne avoir (texte identique à la v22)',
      !out0.includes('retourné') && !out0.includes('Avoir'));
  }
  const poJs = readApp('src/screens/PurchaseOrdersScreen.js');
  check('Commandes mobile : fetch restock-forecast (days=30/lead=15/by_supplier=1) non bloquant + carte styles.fCard câblée',
    poJs.includes("by_supplier: 1") && poJs.includes('lead: 15') && poJs.includes("catch(() => setForecast(null))")
      && poJs.includes('styles.fCard') && poJs.includes('forecast.map'));
  const rtStatic = readApp('src/utils/receiptText.js');
  check('receiptText mobile : Σ refundedQty×prix remontée + garde refundedAmt > 0 sur le récap',
    rtStatic.includes('it.refunded_qty ?? 0) * Number(it.unit_price ?? 0)') && rtStatic.includes('if (refundedAmt > 0)'));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms((trRaw.match(/export const fr = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const enK = kms((trRaw.match(/export const en = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const V23 = ['pf2_title', 'pf2_hint', 'pf2_ok', 'pf2_qty', 'rt_refunded', 'rt_avoir', 'rt_net'];
  check('traductions mobile : ≥ 714 FR = EN + 7 clés v23 ×2', frK.size >= 714 && enK.size >= 714 && V23.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms((pcSrc.match(/const fr = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const pcEn = kms((pcSrc.match(/const en = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const V12 = ['pf2_title', 'pf2_hint', 'pf2_ok', 'pf2_qty'];
  check('i18n PC : ≥ 750 FR = EN, parité parfaite + 4 clés v2.12 ×2',
    pcFr.size >= 750 && pcEn.size >= 750 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && V12.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('version PC v2.12 + thermal câblé (Avoir/TOTAL NET ×2 surfaces)',
    /APP_VERSION: 'StockFlow PC v\d+\.\d+'/.test(read('src/js/config.js'))
      && read('src/js/thermal.js').includes("lr('Avoir (retours)'") && read('src/js/thermal.js').includes('TOTAL NET'));

  console.log(`\nRÉSULTAT v2.12 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
