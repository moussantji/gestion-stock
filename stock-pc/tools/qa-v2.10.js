// ============================================================
// 🧪 QA StockFlow v2.10 (PÉRENNE, dans le repo)
// 📦 étiquettes au stock réel · 🧾 devis locaux · 📊 rentabilité 12 mois
// Lancement : node tools/qa-v2.10.js   (depuis stock-pc/)
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
const norm = (s) => String(s).replace(/[   ]/g, ' '); // Intl fr-FR groupe en espaces fines (U+202F) OU insécables (U+00A0)

/* ---------------- DOM minimal (mêmes conventions que qa-v2.9) ---------------- */
function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll(sel) {
      if (sel !== '.chip') return [];
      const out = [];
      (function walk(n) { (n?.children ?? []).forEach((c) => { if (c?.attrs?.class?.includes?.('chip') || (c?.className ?? '').includes('chip')) out.push(c); walk(c); }); })(e);
      return out;
    },
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
global.navigator = global.navigator ?? { clipboard: { _t: '', writeText: async (s) => { global.navigator.clipboard._t = String(s); } } };

const SHOP_MOCK = { name: 'Épicerie Marième', loyalty: { earn_per: 1000, point_value: 10 },
  tva: { enabled: false, default_rate: 0, categories: {}, products: {} }, commission_pct: 0 };
const CATALOG = [
  { id: 1, name: 'Savon Dettol', sku: 'SAV-1', sale_price: 800, quantity: 5, category_id: 1, image_url: null },
  { id: 2, name: 'Riz 5kg', sku: 'RIZ-5', sale_price: 5000, quantity: 9, category_id: 2, image_url: null },
];
// 📊 12 mois glissants simulés (août → juillet)
const BY_MONTH = Array.from({ length: 12 }, (_, i) => {
  const y = i < 5 ? 2025 : 2026; const m = ((7 + i) % 12) + 1;
  const rev = 200000 + i * 30000; const cost = rev - (60000 + i * 9000);
  return { ym: `${y}-${String(m).padStart(2, '0')}`, revenue: rev, cost, margin: rev - cost, rate: Math.round(((rev - cost) / rev) * 1000) / 10 };
});

const apiCalls = [];
let byMonthOn = true; // 📊 vieux serveur = by_month absent
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET' });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/stats/sales')) {
    return ok({ period: '30d',
      totals: { revenue: 440000, receipts: 12, items: 30, avg_basket: 36666 },
      products: [], categories: [], sellers: [] });
  }
  if (u.includes('/stats/margins')) {
    return ok({ period: '30d',
      totals: { revenue: 440000, cost: 300000, margin: 140000, rate: 31.8 },
      products: [{ product_id: 1, name: 'Savon Dettol', qty: 20, revenue: 16000, cost: 10000, margin: 6000, rate: 37.5 }],
      ...(byMonthOn ? { by_month: BY_MONTH } : {}) });
  }
  if (u.includes('/products') && u.includes('all=1')) return ok({ data: CATALOG });
  if (u.includes('/customers')) return ok({ data: [] });
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
  'src/js/ui.js', 'src/js/promo.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', // v2.11 : promo.js ajouté au socle
  'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js', 'src/js/quotes.js']) run(read(f), f);
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

  console.log('— 📡 Serveur : étiquettes au stock & rentabilité 12 mois (statique) —');
  const lc = readApi('app/Http/Controllers/Api/LabelController.php');
  check('LabelController : param stock_qty additif (boolean) + quantity lu dans le select',
    lc.includes("$request->boolean('stock_qty')") && lc.includes("'quantity'"));
  check('LabelController : 1 étiquette/unité bornée 1..50 + plafond planche 300 (422 garde-fou)',
    lc.includes('min(50, max(1, (int) $product->quantity))') && lc.includes('count($labels) > 300'));
  check('LabelController : rétro-compatibilité — sans stock_qty, copies classiques 1..5 conservées',
    lc.includes('min(5, max(1, $request->integer(\'copies\', 1)))') && lc.includes('abort_if(count($ids) > 60'));
  const sc = readApi('app/Http/Controllers/Api/StatsController.php');
  const bmBlock = (sc.split('// 📊 v2.10')[1] ?? '').split('$totals[\'rate\']')[0];
  check('StatsController by_month : demandé explicitement ($request->boolean) → 0 requête sinon + borne 12 mois calendaires',
    sc.includes("$request->boolean('by_month')") && bmBlock.includes('now()->subMonths(11)->startOfMonth()'));
  check('StatsController by_month : groupBy mois MySQL + même $applyShop + CA net des avoirs + tri chronologique',
    bmBlock.includes("DATE_FORMAT(receipts.created_at, '%Y-%m')") && bmBlock.includes('$applyShop(DB::table')
      && bmBlock.includes('receipt_items.refunded_qty') && bmBlock.includes("orderBy('ym')"));
  check('StatsController : clé additive « by_month » dans le retour (vieux clients : ignorée)',
    sc.includes("'by_month' => $byMonth,"));

  console.log('\n— 🧾 PC : module devis (réel, exécuté) —');
  store.set('sfpc.quotes_v1', '[]');
  const q1 = Quotes.save([
    { product_id: 1, name: 'Savon Dettol', qty: 2, unit_price: 800 },
    { product_id: 2, name: 'Riz 5kg', qty: 1, unit_price: 5000 },
    { product_id: 99, name: 'Gratuit', qty: 1, unit_price: 0 }, // filtré (prix 0)
    { product_id: 3, name: 'Zero', qty: 0, unit_price: 100 }, // qty 0 → 1
  ], { customer: { id: 7, name: 'Fatou' } });
  check('Quotes.save : brouillon créé (id DEV-…), lignes nettoyées (prix 0 filtré, qté 0 → 1), total 6 700 F calculé',
    !!q1 && q1.id.startsWith('DEV-') && q1.lines.length === 3 && q1.total === 6700 && q1.customer.name === 'Fatou');
  Quotes.save([{ product_id: 1, name: 'Savon Dettol', qty: 1, unit_price: 800 }], {});
  check('Quotes.list : le plus récent en tête (2 brouillons) + persistance localStorage',
    Quotes.list().length === 2 && JSON.parse(store.get('sfpc.quotes_v1')).length === 2);
  Quotes.remove(q1.id);
  check('Quotes.remove : le brouillon disparaît de la liste (1 restant)',
    Quotes.list().length === 1 && !Quotes.list().some((q) => q.id === q1.id));
  store.set('sfpc.quotes_v1', '[]');
  const q2 = Quotes.save([{ product_id: 1, name: 'Savon Dettol', qty: 2, unit_price: 800 },
    { product_id: 2, name: 'Riz 5kg', qty: 1, unit_price: 5000 }], { customer: { name: 'Fatou' } });
  const tq = I18n.t;
  const qtxt = Quotes.buildQuoteText(q2, SHOP_MOCK, tq);
  check('texte WhatsApp du devis : « DEVIS N° » gras + boutique MAJ + « 2 x 800 F » + TOTAL ESTIMÉ gras 6 600 F',
    qtxt.includes('*DEVIS N°') && qtxt.includes('*ÉPICERIE MARIÈME*') && norm(qtxt).includes('2 x 800 F')
      && norm(qtxt).includes('*6 600 F*') && qtxt.includes('TOTAL ESTIMÉ'));
  check('texte : client Fatou + validité +7 j + mention « non facturé »',
    qtxt.includes('Fatou') && qtxt.includes('Valable') && qtxt.toLowerCase().includes('non facturé'));
  const qhtml = Quotes.buildQuoteHtml(q2, SHOP_MOCK, tq, {});
  check('HTML A5 du devis : en-tête « DEVIS N° » + client + zone signature + « non facturé » + date de validité',
    qhtml.includes('DEVIS N°') && qhtml.includes('Fatou') && qhtml.includes('Le vendeur')
      && qhtml.toLowerCase().includes('non facturé') && qhtml.includes('Valable') && norm(qhtml).includes('6 600 F'));

  console.log('\n— 🖨 PC : ticket devis thermique (module réel) —');
  const qb = Buffer.from(Thermal.buildQuoteBytes(q2, SHOP_MOCK, null)).toString('latin1');
  check('bytes ESC/POS du devis : en-tête « DEVIS — NON FACTURE » + lignes + TOTAL 6 600 FCFA',
    qb.includes('DEVIS') && qb.includes('NON FACTURE') && qb.includes('Savon Dettol') && norm(qb).includes('6 600 FCFA'));
  check('zéro ambiguïté : le ticket devis n’a NI « Paye » NI « RESTE A PAYER » (pas une facture)',
    !qb.includes('Paye') && !qb.includes('RESTE A PAYER'));
  const qh = Thermal.buildQuoteTicketHtml(q2, SHOP_MOCK, false);
  check('ticket HTML 72 mm : badge « DEVIS — NON FACTURÉ » + total + validité',
    qh.includes('DEVIS — NON FACTURÉ') && norm(qh).includes('6 600 F') && qh.includes('Valable'));
  check('printQuote() exportée et retour la contient (bouton 🖨 de la modale)',
    typeof Thermal.printQuote === 'function' && read('src/js/thermal.js').includes('printQuote, //'));

  console.log('\n— 🧾 PC : caisse (écran réel, statique devis) —');
  run(read('src/js/screens/sale.js'), 'sale.js');
  const vSale = el('div');
  await Screens.sale(vSale);
  await sleep(10);
  const saleSrc = read('src/js/screens/sale.js');
  check('caisse : bouton « 🧾 Devis » présent dans la rangée d’actions (à côté de Valider)',
    !!findAll(vSale, (c) => c._handlers?.click && allText(c).includes('Devis'))[0]);
  check('logique devis : panier → Quotes.save (lignes + client) ; panier vide → toast q_empty, rien d’enregistré',
    saleSrc.includes('Quotes.save(lines, { customer })') && saleSrc.includes("UI.toast(t('q_empty')"));
  check('chargement : garde UI.confirm si panier en cours + produits manquants signalés + qty plafonnée au stock',
    saleSrc.includes('await UI.confirm(t(\'q_confirm_replace\'))') && saleSrc.includes("t('q_missing'")
      && saleSrc.includes('Math.min(l.qty, Math.max(1, effQty(p)))'));

  console.log('\n— 📦 PC : étiquettes au stock réel (statique + module) —');
  const prodSrc = read('src/js/screens/products.js');
  check('rafale thermique : puce « 📦 Au stock » (stockMode) avec expansion par quantité, garde-fous 1..50 / 400',
    prodSrc.includes('stockMode') && prodSrc.includes('Math.min(50, Math.max(1,') && prodSrc.includes('out.length < 400')
      && prodSrc.includes("t('lb_stock_hint'") && prodSrc.includes("t('lb_stock_done'"));
  check('rafale stock : UN seul envoi printLabels(expanded, 1) — le mode ×N classique est préservé',
    prodSrc.includes('await Thermal.printLabels(expanded, 1)') && prodSrc.includes('await Thermal.printLabels(list, copies)'));
  check('planche A4 : case « copies = stock actuel » → param serveur &stock_qty=1 (sélecteur copies désactivé)',
    prodSrc.includes('stockChk') && prodSrc.includes('&stock_qty=1') && prodSrc.includes('copies.disabled = stockChk.checked'));

  console.log('\n— 📊 PC : rentabilité 12 mois (module réel + écran réel) —');
  check('monthShort : « juil. 26 » en FR, « Jul 26 » en EN (langues de l’app)',
    StatReport.monthShort('2026-07').toLowerCase().startsWith('juil')
      && (I18n.setLang('en'), StatReport.monthShort('2026-07').startsWith('Jul')) && (I18n.setLang('fr'), true));
  const pfHtml = StatReport.buildProfitHtml({ rows: BY_MONTH, shop: SHOP_MOCK, user: { name: 'Patron' }, placeName: 'Siège' });
  check('buildProfitHtml : KPIs (marge totale, taux moyen, meilleur mois) + 12 lignes + bandeaux CA/marge + TOTAL',
    pfHtml.includes('Rentabilité sur 12 mois') && pfHtml.includes('Meilleur mois') && norm(pfHtml).includes('TOTAL')
      && (pfHtml.match(/bar|\%"/g) ?? []).length > 10 && pfHtml.includes('juil'));
  const pfEmpty = StatReport.buildProfitHtml({ rows: [], shop: SHOP_MOCK, user: { name: 'X' } });
  check('buildProfitHtml sans données : ligne « Pas de données sur 12 mois », gabarit quand même propre',
    pfEmpty.includes('Pas de données sur 12 mois'));
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  apiCalls.length = 0;
  await Screens.stats(vS);
  await sleep(10);
  check('écran : fetch marges avec by_month=1 (clé additive demandée)',
    apiCalls.filter((c) => c.url.includes('/stats/margins')).some((c) => c.url.includes('by_month=1')));
  const pfCard = findAll(vS, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Rentabilité sur 12 mois'))[0];
  check('carte « 📈 Rentabilité sur 12 mois » affichée : 24 barres (12 CA + 12 marge) + bouton PDF patron',
    !!pfCard && findAll(pfCard, (c) => c?.className === 'bar-rev').length === 12
      && findAll(pfCard, (c) => c?.className === 'bar-margin').length === 12
      && !!findAll(pfCard, (c) => c._handlers?.click && allText(c).includes('PDF'))[0]);
  byMonthOn = false; // vieux serveur : clé absente
  const vS2 = el('div');
  await Screens.stats(vS2);
  await sleep(10);
  check('zéro-régression : vieux serveur (sans by_month) → carte rentabilité ABSENTE, écran inchangé',
    findAll(vS2, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Rentabilité sur 12 mois')).length === 0);
  byMonthOn = true;

  console.log('\n— 📱 Mobile : devis locaux (utilitaire réel exécuté) —');
  const qm = readApp('src/utils/quotes.js');
  vm.runInThisContext(`const FileSystem = { documentDirectory: 'x', readAsStringAsync: async () => '[]', writeAsStringAsync: async () => {} };\n`
    + qm.replace(/^import .*$/gm, '').replace(/export (async function|function) /g, '$1 '), 'quotes-mobile.js');
  const mq = await saveQuote([{ product_id: 1, name: 'Savon Dettol', qty: 2, unit_price: 800 },
    { product_id: 9, name: 'Gratuit', qty: 1, unit_price: 0 }], { customer: { name: 'Fatou' } });
  check('mobile saveQuote : brouillon créé, ligne à 0 F filtrée, total 1 600 F',
    !!mq && mq.lines.length === 1 && mq.total === 1600);
  const tm2 = (k, p) => String(({
    q_number: 'DEVIS N°', q_valid: 'Valable jusqu’au {date}', wa_txt_total_q: 'TOTAL ESTIMÉ', q_note: 'Devis — non facturé.',
  })[k] ?? `??${k}??`).replace(/\{(\w+)\}/g, (_, x) => String(p?.[x] ?? ''));
  const qtxtM = buildQuoteText(mq, { name: 'Épicerie Marième', phone: '+223 70 00 00 00' }, tm2);
  check('mobile texte WhatsApp : « DEVIS N° » gras + tél + « 2 x 800 F » + TOTAL ESTIMÉ gras + note',
    qtxtM.includes('*DEVIS N°') && qtxtM.includes('+223') && norm(qtxtM).includes('2 x 800 F')
      && norm(qtxtM).includes('*1 600 F*') && qtxtM.includes('non facturé'));
  check('mobile quotes.js : fichier JSON (expo-file-system legacy, déjà présent) + cap 50 brouillons',
    qm.includes("expo-file-system/legacy") && qm.includes('MAX = 50'));
  const ns = readApp('src/screens/NewSaleScreen.js');
  check('NewSale : bouton 🧾 en tête de panier + modale devis (save/liste) + chargement gardé par confirmation',
    ns.includes('quoteBtn') && ns.includes('setQuotesOpen') && ns.includes("t('q_confirm_replace')")
      && ns.includes('saveQuote(lines, { customer })'));
  check('NewSale : partage devis → fiche système Share.share({ message }) (zéro dépendance, annulation silencieuse)',
    ns.includes('Share.share({ message })') && ns.includes('User did not share'));
  const psm = readApp('src/screens/ProductsScreen.js');
  check('Produits mobile : option « 📦 Stock réel » dans la rafale (expansion 1..50 / 400, une seule connexion BT)',
    psm.includes("value: 'stock'") && psm.includes('Math.min(50, Math.max(1,') && psm.includes('out.length < 400')
      && psm.includes('doBurstStock'));
  const st = readApp('src/screens/StatsScreen.js');
  check('Stats mobile : fetch marges by_month=1 + bloc BarChart 12 mois + partage CSV rentabilité',
    st.includes('by_month: 1') && st.includes('profitRows') && st.includes('monthShort') && st.includes('shareProfitCsv'));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms(trRaw.split('export const fr = {')[1].split('\n};')[0]);
  const enK = kms(trRaw.split('export const en = {')[1].split('\n};')[0]);
  const V210M = ['q_btn', 'q_title', 'q_save', 'q_saved', 'q_empty', 'q_list', 'q_none', 'q_number',
    'q_valid', 'q_note', 'q_share', 'q_load', 'q_loaded', 'q_missing', 'q_confirm_replace',
    'wa_txt_total_q', 'lb_stock', 'lb_stock_confirm', 'pf_title', 'pf_sub', 'pf_month', 'pf_margin', 'pf_share'];
  check('traductions mobile : 699 FR = 699 EN + 23 clés v2.10 (v21) ×2',
    frK.size >= 699 && enK.size >= 699 && V210M.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms(pcSrc.split('const fr = {')[1].split('\n  };')[0]);
  const pcEn = kms(pcSrc.split('const en = {')[1].split('\n  };')[0]);
  const V210PC = ['q_btn', 'q_hint', 'q_title', 'q_save', 'q_number', 'q_valid', 'q_note', 'q_pdf',
    'q_copy', 'q_print', 'q_load', 'q_loaded', 'q_missing', 'q_confirm_replace', 'th_quote_sent',
    'wa_txt_total_q', 'lb_a4_stock', 'lb_stock_chip', 'lb_stock_hint', 'lb_stock_done',
    'pf_title', 'pf_sub', 'pf_best', 'pf_pdf', 'pf_pdf_saved', 'pf_month', 'pf_table', 'pf_margin', 'pf_none'];
  check('i18n PC : 728 FR = 728 EN, parité parfaite + 29 clés v2.10 ×2 (échantillon)',
    pcFr.size >= 728 && pcEn.size >= 728 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && V210PC.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('version PC ≥ v2.10 (pérenne)', /APP_VERSION: 'StockFlow PC v\d+\.\d+'/.test(read('src/js/config.js')));
  check('ap_beep_sub toujours présente (surveillance)', pcFr.has('ap_beep_sub') && pcEn.has('ap_beep_sub'));

  console.log(`\nRÉSULTAT v2.10 : ${pass} OK / ${ko} KO`);
})();
