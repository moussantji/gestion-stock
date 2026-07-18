// ============================================================
// 🧪 QA StockFlow v2.6 (PÉRENNE, dans le repo)
// 📅 comparatif/stats à dates libres · ⚠️🏷️ rafale « ruptures »
// Lancement : node tools/qa-v2.6.js   (depuis stock-pc/)
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

/* ---------------- DOM minimal (mêmes conventions que qa-v2.5) ---------------- */
function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll(sel) { // uniquement '.chip' — utilisé par le sélecteur de période
      if (sel !== '.chip') return [];
      const out = [];
      (function walk(n) { (n?.children ?? []).forEach((c) => { if (c?.attrs?.class?.includes?.('chip') || (c?.className ?? '').includes('chip')) out.push(c); walk(c); }); })(e);
      return out;
    },
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

const apiCalls = []; // { url } — chaque appel réseau (vérification des paramètres envoyés)
const fileSaves = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET' });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (u.includes('/stats/sales')) {
    return ok({ period: '30d',
      totals: { revenue: 500000, receipts: 12, items: 30, avg_basket: 41666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
      ],
      by_shop: [
        { shop_id: null, name: 'Siège', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
        { shop_id: 2, name: 'Sotuba', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
      ] });
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  if (u.includes('/products') && u.includes('out_of_stock=1')) {
    return ok({ data: [
      { id: 9, name: 'Savon Dettol', sale_price: 800, barcode: '6130099', quantity: 0 },
      { id: 10, name: 'Lait Nido 400g', sale_price: 3800, barcode: null, quantity: 0 },
    ] });
  }
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [], printNet: async () => true, printSilent: async () => true },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName }) },
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
const realToast = UI.toast;

const allText = (n) => {
  // textContent posé après coup (puce plage) + nœuds texte + récursion enfants
  const own = (n?.nodeType === 3 ? n.text : (typeof n?.textContent === 'string' && n?.textContent) || '');
  return own + (n?.children ?? []).map((c) => allText(c)).join(' ');
};
const findAll = (n, pred, acc = []) => {
  if (pred(n)) acc.push(n);
  (n?.children ?? []).forEach((c) => findAll(c, pred, acc));
  return acc;
};
const findInputs = (n) => findAll(n, (c) => c?.tagName === 'input');
const findButtons = (n) => findAll(n, (c) => c?.tagName === 'button');

(async () => {
  UI.toast = (msg, color) => { toasts.push({ msg: String(msg ?? ''), color }); };

  console.log('— 📡 Serveur : dates libres (statique) —');
  const ctrl = readApi('app/Http/Controllers/Api/StatsController.php');
  check('periodFrom : from/to lus, retour [custom, $from, $to] + borne $to = null en mode classique',
    ctrl.includes("$request->query('from')") && ctrl.includes("return ['custom', $from, $to];")
    && ctrl.includes("return [$period, $days ? now()->subDays($days - 1)->startOfDay() : null, null];"));
  check('garanties : inversion permutée + plafond 370 j + to absent → aujourd\'hui + from absent → 30 j glissants',
    ctrl.includes('[$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];')
    && ctrl.includes('subDays(370)') && ctrl.includes("? Carbon::parse((string) $request->query('to'))->endOfDay()\n                    : now()->endOfDay();")
    && ctrl.includes("$to->copy()->subDays(29)->startOfDay();"));
  check('dates illisibles → repli silencieux sur la période standard (try/catch)',
    ctrl.includes('} catch (\\Throwable $e) {'));
  check('borne haute $to ajoutée sur ≥ 10 requêtes reçus préfixées + ≥ 4 non-préfixées (pérennisé)', // v2.7 : +1 (matrice cross)
    (ctrl.match(/->when\(\$to, fn \(\$q\) => \$q->where\('receipts\.created_at', '<=', \$to\)\)/g) ?? []).length >= 10
    && (ctrl.match(/->when\(\$to, fn \(\$q\) => \$q->where\('created_at', '<=', \$to\)\)/g) ?? []).length >= 4);
  check('réponse additive : clé « to » (anciens clients : ignorée)',
    ctrl.includes("'to' => $to?->toDateString(),"));
  check('imports Carbon présents', ctrl.includes('use Carbon\\Carbon;'));

  console.log('\n— 📅 PC : stats à dates libres (écran réel) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  apiCalls.length = 0;
  await Screens.stats(vS);
  await sleep(10);
  check('démarrage classique : ?period=30d (zéro régression)',
    apiCalls.some((c) => c.url.includes('/stats/sales') && c.url.includes('period=30d') && !c.url.includes('from=')));
  const inputs = findInputs(vS).filter((i) => i.attrs?.type === 'date');
  const applyBtn = findButtons(vS).find((b) => allText(b).includes('Appliquer'));
  check('deux champs date + bouton « 📅 Appliquer » présents', inputs.length === 2 && !!applyBtn);
  inputs[0].value = '2026-07-01';
  inputs[1].value = '2026-07-15';
  apiCalls.length = 0;
  await applyBtn._handlers.click();
  await sleep(10);
  const rangeCalls = apiCalls.filter((c) => c.url.includes('/stats/'));
  check('application : /stats/sales + /stats/margins avec from=…&to=… (SANS period=)',
    rangeCalls.some((c) => c.url.includes('/stats/sales') && c.url.includes('from=2026-07-01') && c.url.includes('to=2026-07-15') && !c.url.includes('period='))
    && rangeCalls.some((c) => c.url.includes('/stats/margins') && c.url.includes('from=2026-07-01')));
  check('puce plage affichée « Du 2026-07-01 au 2026-07-15 ✕ »',
    allText(vS).includes('Du 2026-07-01 au 2026-07-15 ✕'));
  const exportBtns2 = findButtons(vS).filter((b) => allText(b).includes('Exporter'));
  fileSaves.length = 0; toasts.length = 0;
  for (const b of exportBtns2) { await b._handlers.click(); } // eslint-disable-line no-await-in-loop
  check('CSV de la plage : comparatif-boutiques-2026-07-01_2026-07-15-AAAAMMJJ.csv (+ vendeurs idem)',
    fileSaves.some((s) => /^comparatif-boutiques-2026-07-01_2026-07-15-\d{8}\.csv$/.test(s.name))
    && fileSaves.some((s) => /^comparatif-vendeurs-2026-07-01_2026-07-15-\d{8}\.csv$/.test(s.name)));
  const rangeChipEl = findButtons(vS).find((b) => allText(b).includes('✕'));
  apiCalls.length = 0;
  await rangeChipEl._handlers.click(); // ✕ → retour à 30 j
  await sleep(10);
  check('✕ sur la puce plage → retour à ?period=30d',
    apiCalls.some((c) => c.url.includes('/stats/sales') && c.url.includes('period=30d') && !c.url.includes('from=')));
  check('dates vides → toast d\'avertissement, aucun appel réseau',
    (() => { toasts.length = 0; apiCalls.length = 0; inputs[0].value = ''; return Promise.resolve(applyBtn._handlers.click()).then(() => sleep(5)).then(() => toasts.some((x) => x.color === 'var(--warning)') && !apiCalls.some((c) => c.url.includes('from='))); })());

  console.log('\n— ⚠️🏷️ PC : bouton rafale ruptures (statique + module réel) —');
  const prodSrc = read('src/js/screens/products.js');
  check('bouton ⚠️ Ruptures : route all=1 + out_of_stock=1 (une requête, zéro backend)',
    prodSrc.includes("Api.get('/products', { out_of_stock: 1, all: 1 })"));
  check('ruptures : liste vide → toast 🎉 (pas d\'impression), sinon même modale quantité (openBurstQty)',
    prodSrc.includes("t('lb_out_none')") && prodSrc.includes('openBurstQty(list)') && prodSrc.includes('outBurstBtn'));
  check('bouton rendu UNIQUEMENT si la thermique est configurée (comme la rafale classique)',
    prodSrc.includes('[burstBtn, outBurstBtn]') && prodSrc.includes('isConfigured'));
  const T = window.Thermal;
  const ruptures = [
    { name: 'Savon Dettol', sale_price: 800, barcode: '6130099' },
    { name: 'Lait Nido 400g', sale_price: 3800, barcode: null },
  ];
  const bytes = T.buildLabelsBytes(ruptures, { name: 'Épicerie Marième' }, null, 2);
  check('moteur inchangé : 2 ruptures × 2 copies = paquet 2× (CODE128 conservé pour Dettol)',
    bytes.length === T.buildLabelsBytes(ruptures, { name: 'Épicerie Marième' }, null, 1).length * 2
    && String.fromCharCode(...bytes).includes('6130099'));

  console.log('\n— 📱 Mobile : dates libres & rafale ruptures (statique) —');
  const st = readApp('src/screens/StatsScreen.js');
  check('StatsScreen : statsParams custom → from/to sinon period + periodKey pour les 2 noms de CSV',
    st.includes('custom ? { from: custom.from, to: custom.to } : { period: p }')
    && (st.match(/periodKey\(\)\}\.csv/g) ?? []).length === 2);
  check('StatsScreen : puce 📅 (affichage jj/mm compact, appui long = retour puces)',
    st.includes('onLongPress') && st.includes('setDateOpen(true)') && st.includes("t('st_dates')"));
  check('StatsScreen : modale 2 TextInput + validation AAAA-MM-JJ (alerte sinon) + apply relance load + marges',
    st.includes("const RE = /^\\d{4}-\\d{2}-\\d{2}$/;") && st.includes("t('st_bad_date')")
    && st.includes('setCustom({ from: dateFrom.trim(), to: dateTo.trim() })')
    && st.includes("if (view === 'margins') loadMargins();"));
  check('StatsScreen : retour aux puces standards = sortie des dates libres (both sales & margins rechargés par statsParams)',
    st.includes('setCustom(null); // 📅 v17'));
  const ps = readApp('src/screens/ProductsScreen.js');
  check('ProductsScreen : burstList factorisée (liste affichée OU ruptures) + modale quantité sur burstList',
    ps.includes('const [burstList, setBurstList] = useState([])') && ps.includes('setBurstList(items);')
    && ps.includes('burList') === false && ps.includes('burstList.length * q'));
  check('ProductsScreen : bouton 🚨 → /products?out_of_stock=1&all=1 (une requête) + vide → alerte 🎉',
    ps.includes("out_of_stock: 1, all: 1") && ps.includes('burstOutOfStock') && ps.includes("t('lb_out_none')"));
  check('ProductsScreen : impression factorisée printProductLabels(list, shop, copies) + spinner 🚨 (outLoading)',
    ps.includes('printProductLabels(list, shop, copies)') && ps.includes('outLoading'));

  console.log('\n— 🌍 i18n & version —');
  const tr = readApp('src/i18n/translations.js');
  const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };
  const frK = kms(tr.split('export const fr = {')[1].split('\n};')[0]);
  const enK = kms(tr.split('export const en = {')[1].split('\n};')[0]);
  const V26M = ['st_dates', 'st_custom_title', 'st_from_lbl', 'st_to_lbl', 'st_apply', 'st_bad_date', 'lb_out', 'lb_out_none', 'lb_out_ko'];
  check('traductions mobile : ≥ 660 FR = EN + 9 clés v2.6 (compteurs pérennisés)',
    frK.size >= 660 && enK.size >= 660 && frK.size === enK.size && V26M.every((k) => frK.has(k) && enK.has(k)));
  const i18nSrc = read('src/js/i18n.js');
  const V26PC = ['st_du', 'st_au', 'st_apply', 'st_pick_dates', 'lb_out', 'lb_out_hint', 'lb_out_none', 'lb_out_ko'];
  check('i18n PC : 8 clés v2.6 présentes × 2 (FR+EN)',
    V26PC.every((k) => (i18nSrc.match(new RegExp(k + ':', 'g')) ?? []).length === 2));
  const pcFr = kms(i18nSrc.split('const fr = {')[1].split('\n  };')[0]);
  const pcEn = kms(i18nSrc.split('const en = {')[1].split('\n  };')[0]);
  check('i18n PC : ≥ 668 FR = EN, parité parfaite (compteurs pérennisés)',
    pcFr.size >= 668 && pcEn.size >= 668 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k)));
  check('version PC v2.6+ (pérennisé)', /APP_VERSION: 'StockFlow PC v\d/.test(read('src/js/config.js')));
  check('ap_beep_sub toujours présente (surveillance)', (i18nSrc.match(/ap_beep_sub:/g) ?? []).length === 2);

  UI.toast = realToast;
  console.log(`\nRÉSULTAT v2.6 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('💥', e); process.exit(1); });
