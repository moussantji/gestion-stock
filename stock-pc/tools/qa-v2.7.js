// ============================================================
// 🧪 QA StockFlow v2.7 (PÉRENNE, dans le repo)
// 📊 heatmap vendeurs × boutiques · 📦 pack hebdo par boutique · 🔔 ruptures du matin
// Lancement : node tools/qa-v2.7.js   (depuis stock-pc/)
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

/* ---------------- DOM minimal (mêmes conventions que qa-v2.6) ---------------- */
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

const apiCalls = [];
let outTotal = 3;   // 🔔 ruptures simulées
let outFail = false; // 🔔 panne réseau simulée
let withCross = true; // 📊 zéro-régression : vieux serveur sans cross/by_shop
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET' });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/stats/sales')) {
    const resp = { period: '30d',
      totals: { revenue: 440000, receipts: 12, items: 30, avg_basket: 36666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 79 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 90000, avg_basket: 18000, share: 21 },
      ] };
    if (withCross) {
      resp.by_shop = [
        { shop_id: null, name: 'Siège', receipts_count: 7, items: 18, revenue: 280000, avg_basket: 40000, share: 64 },
        { shop_id: 2, name: 'Sotuba', receipts_count: 5, items: 12, revenue: 160000, avg_basket: 32000, share: 36 },
      ];
      resp.cross = [ // 📊🏬 v2.7 : pivot vendeur → CA par boutique (Modibo : aucune case « Siège » → « · »)
        { user_id: 1, name: 'Awa', total: 350000, by_shop: [
          { shop_id: null, revenue: 280000 }, { shop_id: 2, revenue: 70000 }] },
        { user_id: 2, name: 'Modibo', total: 90000, by_shop: [
          { shop_id: 2, revenue: 90000 }] },
      ];
    }
    return ok(resp);
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  if (u.includes('/products') && u.includes('out_of_stock=1')) {
    if (outFail) throw new Error('network down');
    return ok({ data: [], total: outTotal, current_page: 1, last_page: 1 });
  }
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [], printNet: async () => true, printSilent: async () => true },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName }) },
  file: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.name }) },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js',
  'src/js/ui.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js',
  'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
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

(async () => {
  UI.toast = (msg, color) => { toasts.push({ msg: String(msg ?? ''), color }); };

  console.log('— 📡 Serveur : matrice cross + by_shop hebdo (statique) —');
  const ctrl = readApi('app/Http/Controllers/Api/StatsController.php');
  const crossBlock = (ctrl.split('// ---------- 📊🏬 v2.7')[1] ?? '').split('// ---------- 🏆 v2.8')[0].split('return [')[0];
  check('matrice cross : jointure users + groupBy (user, name, shop) — NON bornée par $applyShop',
    crossBlock.includes("join('users'") && crossBlock.includes("groupBy('receipts.user_id', 'users.name', 'receipts.shop_id')")
    && !crossBlock.includes('$applyShop('));
  check('cross : CA NET (quantity − refunded_qty) × prix + pivot vendeur trié par total + clé additive',
    crossBlock.includes('receipt_items.refunded_qty') && crossBlock.includes("->sortByDesc('total')")
    && ctrl.includes("'cross' => $cross,"));
  const acc = readApi('app/Http/Controllers/Api/AccountingExportController.php');
  // borne : le bloc v2.9 (commissions, scopé boutique) SUIT by_shop — la v2.9 déplace la borne
  const accBlock = (acc.split('// 🏬 v2.7')[1] ?? '').split('// 👥 v2.9')[0];
  check('recapData hebdo : by_shop sur reçus COMPLETED, LEFT JOIN shops, « Siège », part % + TOTAL implicite',
    accBlock.includes('Receipt::STATUS_COMPLETED') && accBlock.includes("leftJoin('shops'")
    && accBlock.includes("?? 'Siège'") && accBlock.includes('share') && !accBlock.includes('ShopScope::apply('));
  check('recapData : clé « by_shop » additive dans le retour',
    acc.includes("'by_shop' => $byShop,"));
  const blade = readApi('resources/views/emails/weekly_recap.blade.php');
  check('blade email : section boutiques seulement si ≥ 2 + boucle + TOTAL + gabarits équilibrés',
    blade.includes("@if(count($recap['by_shop'] ?? []) >= 2)") && blade.includes('@foreach')
    && blade.includes('TOTAL') && blade.match(/@if/g).length === blade.match(/@endif/g).length
    && blade.match(/@foreach/g).length === blade.match(/@endforeach/g).length);

  console.log('\n— 📊 PC : heatmap vendeurs × boutiques (écran réel) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await sleep(10);
  check('carte « 📊 Vendeurs × boutiques » affichée (2 vendeurs × 2 boutiques)',
    allText(vS).includes('Vendeurs × boutiques'));
  const card = findAll(vS, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Vendeurs × boutiques'))[0];
  const hotCells = findAll(card, (c) => c?.tagName === 'td' && String(c?.style?.background ?? '').includes('rgba(124, 92, 255, 0.75)'));
  const dotCells = findAll(card, (c) => c?.tagName === 'td' && allText(c).trim() === '·');
  check('intensité : la case max (Awa@Siège 280 000) est à alpha 0.75 + Modibo@Siège vide → « · »',
    hotCells.length >= 1 && dotCells.length === 1);
  const tds = findAll(card, (c) => c?.tagName === 'td');
  const has280 = tds.some((c) => allText(c).replace(/[^0-9]/g, '') === '280000');
  const has350 = tds.some((c) => allText(c).replace(/[^0-9]/g, '') === '350000');
  const totalRow = findAll(card, (c) => c?.tagName === 'tr' && allText(c).startsWith('TOTAL'))[0];
  check('contenu : cases 280 000 / 350 000 (total vendeur) + ligne TOTAL (280 000 / 160 000 / 440 000)',
    has280 && has350 && !!totalRow && allText(totalRow).includes('280') && allText(totalRow).includes('160') && allText(totalRow).includes('440'));
  // 🛡 zéro-régression : vieux serveur (sans cross/by_shop) → carte absente
  withCross = false;
  const vS2 = el('div');
  await Screens.stats(vS2);
  await sleep(10);
  check('zéro-régression : sans les clés cross/by_shop, la heatmap n’apparaît PAS',
    !allText(vS2).includes('Vendeurs × boutiques'));
  withCross = true;

  console.log('\n— 📦 PC : pack hebdo par boutique (module réel) —');
  const recapFull = {
    receipts: { count: 9, total: 420000, paid: 400000, points_discount: 0, refunds_total: 0 },
    cash: { in: 5000, out: 3000, ops: 4 },
    closings: { count: 6, sales: 410000, end_balance: 199000, days: [] },
    by_shop: [
      { shop_id: null, name: 'Siège', count: 6, total: 280000, share: 66.7 },
      { shop_id: 7, name: 'Sotuba', count: 3, total: 140000, share: 33.3 },
    ],
  };
  const htmlW = StatReport.buildWeeklyHtml({ from: '2026-07-06', to: '2026-07-12', recap: recapFull, shop: { name: 'Épicerie Marième' }, user: { name: 'Awa' }, placeName: null });
  check('PDF hebdo : section « ① bis — Comparatif boutiques » + 2 boutiques + TOTAL 100 % + parts',
    htmlW.includes('① bis') && htmlW.includes('Comparatif boutiques') && htmlW.includes('Sotuba')
    && htmlW.includes('Siège') && htmlW.includes('100 %') && htmlW.includes('66.7 %'));
  const recapOld = { ...recapFull };
  delete recapOld.by_shop;
  const htmlOld = StatReport.buildWeeklyHtml({ from: '2026-07-06', to: '2026-07-12', recap: recapOld, shop: {}, user: {}, placeName: null });
  check('zéro-régression : vieux serveur (sans by_shop) → section absente, PDF identique à la v2.6',
    !htmlOld.includes('① bis') && !htmlOld.includes('Comparatif boutiques') && htmlOld.length > 1000);

  console.log('\n— 🔔 PC : ruptures du matin (module réel) —');
  check('pref « outstock » OFF par défaut (12ᵉ interrupteur, rétro-compat)',
    window.Auto.get().outstock === false);
  apiCalls.length = 0;
  check('OFF → « off », zéro appel réseau',
    (await window.Auto.maybeDailyOutstock('2026-07-17')) === 'off'
    && !apiCalls.some((c) => c.url.includes('out_of_stock=1')));
  window.Auto.set({ outstock: true });
  const fires = [];
  window.StockNotifier = { maybeNotify: async () => true, test: async () => true, enabled: () => true, canNotify: () => true,
    fire: (title, body) => { fires.push({ title, body }); return true; } };
  outTotal = 3;
  check('ON + 3 ruptures → « sent » + notification groupée avec le compteur « 3 »',
    (await window.Auto.maybeDailyOutstock('2026-07-17')) === 'sent'
    && fires.length === 1 && fires[0].title.includes('3'));
  check('même jour → « same » (anti-spam : pas de 2ᵉ notification)',
    (await window.Auto.maybeDailyOutstock('2026-07-17')) === 'same' && fires.length === 1);
  outFail = true;
  check('panne réseau → « failed » + marqueur NON avancé (retentative possible au prochain boot)',
    (await window.Auto.maybeDailyOutstock('2026-07-18')) === 'failed' && fires.length === 1
    && store.get('sfpc.outstock.v1') === '2026-07-17');
  outFail = false; outTotal = 0;
  check('0 rupture → « none » + jour marqué (aucune notification inutile)',
    (await window.Auto.maybeDailyOutstock('2026-07-18')) === 'none' && fires.length === 1
    && store.get('sfpc.outstock.v1') === '2026-07-18');
  outTotal = 5;
  check('lendemain avec ruptures → nouvelle notification « 5 » (1×/jour)',
    (await window.Auto.maybeDailyOutstock('2026-07-19')) === 'sent' && fires.length === 2 && fires[1].title.includes('5'));
  const appSrc = read('src/js/app.js');
  const setSrc = read('src/js/screens/settings.js');
  const notifSrc = read('src/js/notifier.js');
  check('câblage : démarrage app (setTimeout 10 s) + toggle Réglages + fire() dans le return map',
    appSrc.includes('maybeDailyOutstock') && appSrc.includes('10000')
    && setSrc.includes("mkToggle(t('ap_outstock'), t('ap_outstock_sub'), 'outstock')")
    && /return\s*\{[^}]*\bfire\b/.test(notifSrc));
  check('notifier : fire exportée dans l’API publique', notifSrc.includes('canNotify, fire'));

  console.log('\n— 📱 Mobile : bloc croisé (statique) —');
  const st = readApp('src/screens/StatsScreen.js');
  check('StatsScreen : cross lue depuis data + repli [] + gardien ≥ 2 vendeurs × ≥ 2 boutiques',
    st.includes('data?.cross ?? []') && st.includes('cross.length >= 2 && shops.length >= 2'));
  check('StatsScreen : shopNameOf (Siège par défaut) + barres proportionnelles au max croisé + slice(0, 8)',
    st.includes('shopNameOf') && st.includes('maxCrossCell') && st.includes('slice(0, 8)'));
  check('StatsScreen : clés i18n croisées utilisées', st.includes("t('st_cross_title')") && st.includes("t('st_cross_sub')"));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };
  const frBlock = trRaw.split('export const fr = {')[1].split('\n};')[0];
  const enBlock = trRaw.split('export const en = {')[1].split('\n};')[0];
  const frK = kms(frBlock); const enK = kms(enBlock);
  const V27M = ['st_cross_title', 'st_cross_sub'];
  check('traductions mobile : ≥ 662 FR = EN + 2 clés croisées v2.7 (compteurs pérennisés)',
    frK.size >= 662 && enK.size >= 662 && frK.size === enK.size && V27M.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFrBlock = pcSrc.split('const fr = {')[1].split('\n  };')[0];
  const pcEnBlock = pcSrc.split('const en = {')[1].split('\n  };')[0];
  const pcFr = kms(pcFrBlock); const pcEn = kms(pcEnBlock);
  const V27PC = ['rp_shops', 'st_cross_title', 'st_cross_sub', 'ap_outstock', 'ap_outstock_sub', 'ap_outstock_title', 'ap_outstock_body'];
  check('i18n PC : 7 clés v2.7 présentes × 2 (FR+EN)',
    V27PC.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('i18n PC : ≥ 675 FR = EN, parité parfaite (compteurs pérennisés)',
    pcFr.size >= 675 && pcEn.size >= 675 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k)));
  check('version PC v2.7+ (pérennisé)', /APP_VERSION: 'StockFlow PC v\d/.test(read('src/js/config.js')));
  check('ap_beep_sub toujours présente (surveillance)', pcFr.has('ap_beep_sub') && pcEn.has('ap_beep_sub'));

  console.log(`\nRÉSULTAT v2.7 : ${pass} OK / ${ko} KO`);
})();
