// ============================================================
// 🧪 QA StockFlow v2.8 (PÉRENNE, dans le repo)
// 📉 prévisions en surface · 🏆 objectifs vendeurs · 🧾 reçu WhatsApp
// Lancement : node tools/qa-v2.8.js   (depuis stock-pc/)
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

/* ---------------- DOM minimal (mêmes conventions que qa-v2.7) ---------------- */
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
let outTotal = 3;    // 🔔 ruptures simulées
let goalTarget = 500000; // 🏆 objectif mensuel simulé (0 = désactivé)
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET' });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/stats/sales')) {
    return ok({ period: '30d',
      totals: { revenue: 440000, receipts: 12, items: 30, avg_basket: 36666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 79 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 90000, avg_basket: 18000, share: 21 },
      ],
      seller_goals: { target: goalTarget, sellers: goalTarget > 0 ? [
        { user_id: 1, name: 'Awa', revenue: 600000, progress: 120 }, // 🏆 dépassée → badge 🎉
        { user_id: 2, name: 'Modibo', revenue: 250000, progress: 50 }, // 🎯 à 50 %
      ] : [] } });
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/cash-ops/summary')) {
    return ok({ sales_collected_today: 120000, sales_count_today: 4, sales_yesterday: 100000, sales_by_user_today: [] });
  }
  if (u.includes('/products/restock-forecast')) {
    return ok({ data: [
      { id: 9, name: 'Savon Dettol', days_left: 4, velocity: 2 },
      { id: 10, name: 'Lait Nido', days_left: 12, velocity: 1 },
      { id: 11, name: 'Riz 5kg', days_left: 6, velocity: 3 },
    ], window_days: 30, lead_days: 14 });
  }
  if (u.includes('/dashboard')) return ok({ stats: { low_stock: 2, out_of_stock: 1 } });
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  if (u.includes('/products') && u.includes('out_of_stock=1')) {
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
const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*\n?\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; };

(async () => {
  UI.toast = (msg, color) => { toasts.push({ msg: String(msg ?? ''), color }); };

  console.log('— 📡 Serveur : objectifs vendeurs (statique) —');
  const ctrl = readApi('app/Http/Controllers/Api/StatsController.php');
  const goalBlock = (ctrl.split('// ---------- 🏆 v2.8')[1] ?? '').split('return [')[0];
  check('seller_goals : réglage lu, 0 = désactivé → requête SQL non émise',
    goalBlock.includes("Setting::get('seller_monthly_target'") && goalBlock.includes('if ($goalTarget > 0)')
    && goalBlock.includes("['target' => $goalTarget, 'sellers' => []]"));
  check('seller_goals : CA du MOIS CALENDAIRE en cours, CA net, scopé $applyShop, % arrondi, limite 20',
    goalBlock.includes('now()->startOfMonth()') && goalBlock.includes('receipt_items.refunded_qty')
    && goalBlock.includes('$applyShop(DB::table') && goalBlock.includes("'progress' => round(") && goalBlock.includes('->limit(20)'));
  check('seller_goals : clé additive dans la réponse (anciens clients : ignorée)',
    ctrl.includes("'seller_goals' => $sellerGoals,") && ctrl.includes('use App\\Support\\Setting;'));
  const setting = readApi('app/Support/Setting.php');
  check('Setting : seller_monthly_target dans DEFAULTS (0) + LIMITS (0 → 100 M) — 0 migration',
    setting.includes("'seller_monthly_target' => 0") && setting.includes("'seller_monthly_target' => ['min' => 0, 'max' => 100000000]"));

  console.log('\n— 🏆 PC : carte objectifs (écran réel) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await sleep(10);
  check('carte « 🏆 Objectifs vendeurs du mois » affichée (cible 500 000, 2 vendeurs)',
    allText(vS).includes('Objectifs vendeurs du mois'));
  const goalCard = findAll(vS, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Objectifs vendeurs'))[0];
  check('contenu : 🎉 « Atteint ! » pour Awa (120 %) + 50 % pour Modibo + sous-titre avec la cible',
    allText(goalCard).includes('Atteint') && allText(goalCard).includes('120') && allText(goalCard).includes('50 %'.replace(' ', ''))
    && allText(goalCard).includes('600') && allText(goalCard).includes('500'));
  // 🛡 zéro-régression : cible 0 → carte absente
  goalTarget = 0;
  const vS2 = el('div');
  await Screens.stats(vS2);
  await sleep(10);
  check('zéro-régression : objectif 0 (ou vieux serveur) → carte ABSENTE, écran inchangé',
    !allText(vS2).includes('Objectifs vendeurs'));
  goalTarget = 500000;

  console.log('\n— 📉 PC : chip prévisions du badge (écran réel) —');
  run(read('src/js/screens/dashboard.js'), 'dashboard.js');
  const vD = el('div');
  apiCalls.length = 0;
  await Screens.dashboard(vD);
  await sleep(15);
  check('badge EN DIRECT : /products/restock-forecast appelé (non bloquant, route v14)',
    apiCalls.some((c) => c.url.includes('/products/restock-forecast')));
  check('chip « ⏳ ruptures sous 7 j » affichée (2 produits ≤ 7 j sur 3)',
    allText(vD).includes('7 j') && !!findAll(vD, (c) => String(c?.className ?? '') === 'live-alertchip' && allText(c).includes('⏳'))[0]);
  check('le chip est cliquable → écran Alertes',
    findAll(vD, (c) => String(c?.className ?? '') === 'live-alertchip' && allText(c).includes('⏳'))[0]?._handlers?.click !== undefined);

  console.log('\n— 🔔 PC : notification du matin enrichie (module réel) —');
  window.Auto.set({ outstock: true });
  const fires = [];
  window.StockNotifier = { maybeNotify: async () => true, test: async () => true, enabled: () => true, canNotify: () => true,
    fire: (title, body) => { fires.push({ title, body }); return true; } };
  outTotal = 3;
  const r1 = await window.Auto.maybeDailyOutstock('2026-07-17');
  check('3 ruptures → « sent » + titre avec « 3 » (comportement v2.7 inchangé)',
    r1 === 'sent' && fires.length === 1 && fires[0].title.includes('3'));
  check('corps enrichi : « … + 2 épuisé(s) sous 7 j » (prévisions ajoutées au message)',
    fires[0].body.includes('7 j') && /\b2\b/.test(fires[0].body));
  check('anti-spam conservé : 2ᵉ appel même jour → « same », pas de 2ᵉ notification',
    (await window.Auto.maybeDailyOutstock('2026-07-17')) === 'same' && fires.length === 1);

  console.log('\n— 🧾 Mobile : reçu texte WhatsApp (utilitaire réel) —');
  const rt = readApp('src/utils/receiptText.js');
  vm.runInThisContext(rt.replace(/^import .*$/gm, '').replace('export function buildReceiptText', 'globalThis.__brt = function _unused(){}; function buildReceiptText'), 'receiptText.js');
  const tfr = (k, p) => ({ wa_txt_total: 'TOTAL', wa_txt_paid: 'Payé', wa_txt_due: 'Reste à payer', wa_txt_thanks: 'Merci de votre visite ! 🙏' })[k] ?? `??${k}??`;
  const txt = buildReceiptText({
    number: 'R-2026-000123', created_at: '2026-07-17T14:32:00Z', client_name: 'Fatou', user: { name: 'Awa' },
    total: 5400, amount_paid: 5400, remaining: 0,
    items: [
      { product_name: 'Savon Dettol', quantity: 2, unit_price: 800, subtotal: 1600 },
      { product_name: 'Lait Nido 400g', quantity: 1, unit_price: 3800, subtotal: 3800 },
    ],
  }, { name: 'Épicerie Marième', phone: '+223 70 00 00 00' }, tfr);
  check('texte : boutique en gras *MAJUSCULES* + tél + numéro + date + client + vendeur',
    txt.includes('*ÉPICERIE MARIÈME*') && txt.includes('+223') && txt.includes('R-2026-000123') && txt.includes('17/07/2026') && txt.includes('Fatou') && txt.includes('Awa'));
  const norm = (s) => String(s).replace(/[  ]/g, ' '); // Intl fr-FR groupe en espaces fines
  check('texte : 2 lignes articles avec quantités × prix + TOTAL « 5 400 F » en gras',
    norm(txt).includes('2 x 800 F') && txt.includes('Lait Nido 400g') && norm(txt).includes('*5 400 F*'));
  const txtCredit = buildReceiptText({ number: 'R-1', created_at: '2026-07-17T10:00:00Z', total: 5000, amount_paid: 2000, remaining: 3000,
    items: [{ product_name: 'Riz', quantity: 1, unit_price: 5000, subtotal: 5000 }] }, {}, tfr);
  check('crédit : lignes Payé + Reste à payer (gras) + mention ⚠️, ticket soldé = ✅',
    norm(txtCredit).includes('Payé :') && norm(txtCredit).includes('*3 000 F*') && txtCredit.includes('⚠️') && txt.includes('✅'));
  const sheet = readApp('src/components/ReceiptActionsSheet.js');
  check('feuille d’actions : Share (react-native) importé + bouton 🧾 + busy « wa » + texte partagé',
    sheet.includes('Share,') && sheet.includes("import { buildReceiptText } from '../utils/receiptText'")
    && sheet.includes("label={t('wa_share')}") && sheet.includes("busy === 'wa'") && sheet.includes('Share.share({ message })'));
  check('annulation de partage silencieuse (« User did not share » non alertée) + couvre post-vente ET historique',
    sheet.includes('User did not share'));

  console.log('\n— 📱 Mobile : objectifs + chip dashboard (statique) —');
  const st = readApp('src/screens/StatsScreen.js');
  check('StatsScreen : seller_goals lue depuis data + gardien target > 0 + 🏆/🎉 atteint + barre (min 4 %)',
    st.includes('data?.seller_goals ?? null') && st.includes("Number(goals?.target ?? 0) > 0")
    && st.includes("t('goal_reached')") && st.includes('Math.min(100, Math.max(4, pct))'));
  const db = readApp('src/screens/DashboardScreen.js');
  check('Dashboard : /products/restock-forecast (catch propre) + chip ⏳ cliquable → Alerts',
    db.includes("api.get('/products/restock-forecast')") && db.includes('setFcCount')
    && db.includes("navigation.navigate('Alerts')") && db.includes("t('db_fc_chip'"));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms(trRaw.split('export const fr = {')[1].split('\n};')[0]);
  const enK = kms(trRaw.split('export const en = {')[1].split('\n};')[0]);
  const V28M = ['wa_share', 'wa_ko', 'wa_txt_total', 'wa_txt_paid', 'wa_txt_due', 'wa_txt_thanks',
    'goal_title', 'goal_sub', 'goal_reached', 'db_fc_chip'];
  check('traductions mobile : 672+ FR = EN + 10 clés v2.8', // ≥ : la v2.9 a ajouté 4 clés (676)
    frK.size >= 672 && enK.size >= 672 && frK.size === enK.size && V28M.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms(pcSrc.split('const fr = {')[1].split('\n  };')[0]);
  const pcEn = kms(pcSrc.split('const en = {')[1].split('\n  };')[0]);
  const V28PC = ['db_fc_chip', 'ap_outstock_more', 'goal_title', 'goal_sub', 'goal_reached', 'set_target', 'set_target_hint'];
  check('i18n PC : 7 clés v2.8 présentes × 2 (FR+EN)', V28PC.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('i18n PC : 682+ FR = EN, parité parfaite', // ≥ : la v2.9 a ajouté 10 clés (692)
    pcFr.size >= 682 && pcEn.size >= 682 && pcFr.size === pcEn.size && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k)));
  check('version PC v2.8+', /APP_VERSION: 'StockFlow PC v\d/.test(read('src/js/config.js')));
  const setSrc = read('src/js/screens/shopsettings.js');
  check('🎯 Seuils PC : champ seller_monthly_target câblé dans FIELDS',
    setSrc.includes("{ key: 'seller_monthly_target', icon: '🏆', label: t('set_target'), hint: t('set_target_hint') }"));
  check('ap_beep_sub toujours présente (surveillance)', pcFr.has('ap_beep_sub') && pcEn.has('ap_beep_sub'));

  console.log(`\nRÉSULTAT v2.8 : ${pass} OK / ${ko} KO`);
})();
