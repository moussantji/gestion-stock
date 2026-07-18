// ============================================================
// 🧪 QA StockFlow v2.5 (PÉRENNE, dans le repo)
// 🖨️ Z thermique mobile · 🏷️ rafale avec quantités · 🏬 comparatif boutiques
// Lancement : node tools/qa-v2.5.js   (depuis stock-pc/)
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

/* ---------------- DOM minimal (mêmes conventions que qa-v2.4) ---------------- */
function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, select() {}, click() {}, value: '', textContent: '', className: '', disabled: false, isConnected: true };
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

const netCalls = [];
const silentCalls = [];
const fileSaves = [];
let includeShops = true; // 🏬 bascule zéro-régression
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (u.includes('/stats/sales')) {
    const resp = { period: '30d',
      totals: { revenue: 500000, receipts: 12, items: 30, avg_basket: 41666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
      ] };
    if (includeShops) {
      resp.by_shop = [
        { shop_id: null, name: 'Siège', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
        { shop_id: 2, name: 'Sotuba', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
      ];
    }
    return ok(resp);
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [],
    printNet: async (o) => { netCalls.push(o); return true; },
    printSilent: async (o) => { silentCalls.push(o); return true; } },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName, data64: 'QUJD' }) },
  file: { save: async (o) => { fileSaves.push(o); return { saved: true, path: '/Rapports/' + o.name }; } },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js',
  'src/js/ui.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js',
  'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
const toasts = [];
const realToast = UI.toast; // UI = const lexicale globale (comme qa-v2.4)

const allText = (n) => (n?.children ?? [])
  .map((c) => (c?.nodeType === 3 ? c.text : allText(c))).join(' ');
const findButtons = (n, acc = []) => {
  (n?.children ?? []).forEach((c) => { if (c?.tagName === 'button') acc.push(c); findButtons(c, acc); });
  return acc;
};

(async () => {
  UI.toast = (msg, color) => { toasts.push({ msg: String(msg ?? ''), color }); };

  console.log('— 🏷️ Rafale avec quantités (PC, module thermal réel) —');
  const T = window.Thermal;
  const P = [
    { name: 'Riz parfumé 5kg', sale_price: 12000, barcode: '6130001' },
    { name: 'Huile Friol 1L', sale_price: 3500, barcode: null },
  ];
  const unit = T.buildLabelsBytes(P, {});
  check('binaire : copies=2 → exactement 2× les octets (init+coupe conservés par étiquette)',
    T.buildLabelsBytes(P, {}, null, 2).length === unit.length * 2
    && T.buildLabelsBytes(P).length === unit.length); // repli copies=1 inchangé
  const html3 = T.buildLabelsHtml(P, {}, false, 3);
  const breaks = (html3.match(/page-break-before/g) ?? []).length;
  check('HTML : 2 produits × 3 copies → 5 sauts de page (6 étiquettes)',
    breaks === P.length * 3 - 1 && (html3.match(/Riz parf/g) ?? []).length === 3);
  check('bornes : copies plafonnées 1..20 (flatMap n exemplaires)',
    read('src/js/thermal.js').includes('Math.min(20, parseInt(copies, 10) || 1)'));
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'net', ip: '192.168.1.60' }));
  netCalls.length = 0;
  await T.printLabels(P, 2); // 🏷️ UN seul envoi réseau pour la rafale ×2
  const unitNet = T.buildLabelsBytes(P, { name: 'Épicerie Marième' }); // /shop dans printLabels
  check('printLabels(P, 2) : UN paquet réseau de 2× la taille unitaire',
    netCalls.length === 1 && netCalls[0].payload.length === unitNet.length * 2);

  console.log('\n— 🏷️ Modale quantité (PC produits.js, statique) —');
  const prodSrc = read('src/js/screens/products.js');
  check('openBurstQty : stepper −n＋ + raccourcis ×1 ×2 ×3 ×5 ×10 + bornes 1..20',
    prodSrc.includes('function openBurstQty') && prodSrc.includes('[1, 2, 3, 5, 10]')
    && prodSrc.includes('step(-1)') && prodSrc.includes('Math.min(20, copies'));
  check('textes traduits utilisés (lb_qty_title/hint/go) + total produits × copies',
    ['lb_qty_title', 'lb_qty_hint', 'lb_qty_go'].every((k) => prodSrc.includes(`t('${k}'`))
    && prodSrc.includes('list.length * copies'));
  check('impression rafale reçoit la quantité choisie',
    prodSrc.includes('Thermal.printLabels(list, copies)'));

  console.log('\n— 🏬 Comparatif boutiques (PC stats.js, écran réel) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await sleep(10);
  check('carte 🏬 Comparatif boutiques affichée (≥ 2 boutiques)',
    allText(vS).includes('Comparatif boutiques'));
  const exportBtns = findButtons(vS).filter((b) => allText(b).startsWith('📤 Exporter')) // pérennisé : les boutons XLSX (sans 📤) ne comptent pas
    .filter((b) => allText(b).includes('Exporter (Excel)') || allText(b) === '📤 Exporter');
  check('deux boutons 📤 Exporter : vendeurs (v2.4) + boutiques (v2.5)', exportBtns.length === 2);
  fileSaves.length = 0; toasts.length = 0;
  for (const b of exportBtns) { await b._handlers.click(); } // eslint-disable-line no-await-in-loop
  const svShops = fileSaves.find((s) => s.name.startsWith('comparatif-boutiques-'));
  check('sf:file-save dialogue (auto:false) + nom comparatif-boutiques-30d-*.csv',
    !!svShops && svShops.auto === false && /^comparatif-boutiques-30d-\d{8}\.csv$/.test(svShops.name));
  const csv = svShops?.content ?? '';
  const csvLines = csv.split('\r\n');
  check('CSV : BOM + 3 lignes + entêtes traduits + ligne Siège exacte',
    csv.charCodeAt(0) === 0xFEFF && csvLines.length === 3
    && csvLines[0].includes('Boutiques') && csvLines[1] === '1;Siège;7;18;50000;350000;70');
  check('toast de confirmation', toasts.some((x) => x.color === 'var(--success)'));
  // 🛡 zéro-régression : serveur v2.4 (sans by_shop) → pas de carte
  includeShops = false;
  const vS2 = el('div');
  await Screens.stats(vS2);
  await sleep(10);
  check('zéro-régression : sans la clé by_shop (vieux serveur), la carte n’apparaît PAS',
    !allText(vS2).includes('Comparatif boutiques'));
  includeShops = true;

  console.log('\n— 📡 Serveur StatsController (statique) —');
  const ctrl = readApi('app/Http/Controllers/Api/StatsController.php');
  const shopBlock = (ctrl.split('// ---------- 🏬 v2.5')[1] ?? '').split('// ---------- 📊🏬 v2.7')[0].split('return [')[0]; // borne v2.7 : cross + v2.8 : goals restent hors du bloc
  check('réponse + clé additive by_shop (anciens clients : ignorée)',
    ctrl.includes("'by_shop' => $byShop"));
  check('agrégation TOUTES boutiques (PAS de $applyShop() dans le bloc v2.5) + LEFT JOIN shops + group by shop_id',
    shopBlock.length > 200 && !shopBlock.includes('$applyShop(') // (le commentaire cite le nom, pas un appel)
    && shopBlock.includes("leftJoin('shops'") && shopBlock.includes("groupBy('receipts.shop_id', 'shops.name')"));
  check('colonnes miroir des vendeurs : receipts_count / items (2ᵉ requête pluck) / revenue / avg_basket / share + « Siège » pour le siège',
    shopBlock.includes('receipts_count') && shopBlock.includes('avg_basket') && shopBlock.includes('share')
    && shopBlock.includes("pluck('items', 'shop_id')") && shopBlock.includes("?? 'Siège'"));

  console.log('\n— 📱 Mobile : ticket Z thermique (statique) —');
  const th = readApp('src/utils/thermalPrinter.js');
  const zBody = (th.split('export async function printZTicket')[1] ?? '').split('export async function printProductLabels')[0];
  check('printZTicket : plan PC (Z DE CAISSE, caissier, ventes/apports/dépenses, SOLDE + CFA, signature, généré le)',
    zBody.includes("'Z DE CAISSE") && zBody.includes('SOLDE CAISSE') && zBody.includes("CFA")
    && zBody.includes('Signature') && zBody.includes('Caissier') && zBody.includes('Genere le'));
  check('printZTicket : garde-fous UNAVAILABLE / NO_PRINTER + UNE connexion + accents normalisés',
    zBody.includes("'UNAVAILABLE'") && zBody.includes("'NO_PRINTER'")
    && (zBody.match(/connectPrinter\(/g) ?? []).length === 1 && zBody.includes('stripAccents'));
  const cs = readApp('src/screens/CashScreen.js');
  check('CashScreen : import printZTicket + printClosingZ + garde imprimante + spinner par ligne',
    cs.includes('printZTicket') && cs.includes('async (z)') && cs.includes('printClosingZ')
    && cs.includes('getSavedPrinter()') && cs.includes('printingZ === item.id'));
  check('CashScreen : 🖨️ sur chaque clôture + proposition « Imprimer le Z » juste après la clôture',
    cs.includes("t('cz_bt')") && cs.includes("t('cz_print_now')") && cs.includes('printClosingZ(z)'));

  console.log('\n— 📱 Mobile : rafale quantités (statique) —');
  const burstBody = (th.split('export async function printProductLabels')[1] ?? '').split('export async function printTestPage')[0];
  check('printProductLabels : copies=1 par défaut (rétro-compat) + borne 1..10 + boucle imbriquée + UN SEUL connectPrinter',
    burstBody.includes('copies = 1') && burstBody.includes('Math.min(10') && burstBody.includes('for (let c = 0; c < n')
    && burstBody.includes('let first = true') && (burstBody.match(/connectPrinter\(/g) ?? []).length === 1);
  const ps = readApp('src/screens/ProductsScreen.js');
  // 📝 pérennisé v2.6 : la liste est factorisée (burstList → `list`) — mêmes clés, même flux
  check('ProductsScreen : PickerModal quantité (×1 ×2 ×3 ×5 ×10, ×2 mis en avant) + confirm total + impression copies',
    ps.includes("import PickerModal from '../components/PickerModal'") && ps.includes('qtyOpen')
    && ps.includes('[1, 2, 3, 5, 10]') && ps.includes('value={2}')
    && ps.includes('lb_burst_confirm_qty') && ps.includes('printProductLabels(list, shop, copies)'));

  console.log('\n— 📱 Mobile : comparatif boutiques (statique) —');
  const st = readApp('src/screens/StatsScreen.js');
  check('StatsScreen : lecture by_shop avec repli [] + onglet Boutiques seulement si ≥ 2 + retour auto Produits sinon',
    st.includes('data?.by_shop ?? []') && st.includes("...(shops.length >= 2 ? ['shops'] : [])")
    && st.includes("setView('products')"));
  check('StatsScreen : vue boutiques (médailles, jauge, panier moyen, part) + export CSV partagé (BOM, « ; »)',
    st.includes('shareShopsCsv') && st.includes('maxShopRevenue') && st.includes('comparatif-boutiques-')
    && st.includes("t('st_shops_rank')") && st.includes("t('st_col_shop')")
    && st.includes('writeAsStringAsync') && st.includes('Sharing.shareAsync'));

  console.log('\n— 🌍 i18n & version —');
  const tr = readApp('src/i18n/translations.js');
  const frB = tr.split('export const fr = {')[1].split('\n};')[0];
  const enB = tr.split('export const en = {')[1].split('\n};')[0];
  const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };
  const frK = kms(frB); const enK = kms(enB);
  const V25M = ['lb_qty_title', 'lb_qty_total', 'lb_burst_confirm_qty', 'cz_bt', 'cz_print_now',
    'cz_print_done', 'cz_print_ko', 'st_tab_shops', 'st_col_shop', 'st_shops_rank'];
  check('traductions mobile : FR = EN ≥ 651 + clés v2.5', frK.size >= 651 && enK.size === frK.size && V25M.every((k) => frK.has(k) && enK.has(k)));
  const i18nSrc = read('src/js/i18n.js');
  const V25PC = ['st_shops', 'st_sh_title', 'st_sh_sub', 'lb_qty_title', 'lb_qty_hint', 'lb_qty_go'];
  check('i18n PC : 6 clés v2.5 présentes × 2 (FR+EN)',
    V25PC.every((k) => (i18nSrc.match(new RegExp(k + ':', 'g')) ?? []).length === 2));
  const frPcB = i18nSrc.split('const fr = {')[1].split('\n  };')[0];
  const enPcB = i18nSrc.split('const en = {')[1].split('\n  };')[0];
  const pcFr = kms(frPcB); const pcEn = kms(enPcB);
  check('i18n PC : FR = EN ≥ 660, parité parfaite', // 📝 pérennisé v2.6 (+8×2 → 668)
    pcFr.size >= 660 && pcEn.size === pcFr.size && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k)));
  check('version ≥ v2.5 (pérennisé : non épinglé)', /StockFlow PC v\d/.test(read('src/js/config.js')));
  check('ap_beep_sub toujours présente (surveillance)', (i18nSrc.match(/ap_beep_sub:/g) ?? []).length === 2);

  UI.toast = realToast;
  console.log(`\nRÉSULTAT v2.5 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('💥', e); process.exit(1); });
