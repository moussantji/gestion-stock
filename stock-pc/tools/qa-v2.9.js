// ============================================================
// 🧪 QA StockFlow v2.9 (PÉRENNE, dans le repo)
// 📸 vignettes en caisse · 🧮 multi-TVA · 👥 commissions vendeurs
// Lancement : node tools/qa-v2.9.js   (depuis stock-pc/)
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
const norm = (s) => String(s).replace(/[  ]/g, ' '); // Intl fr-FR groupe en espaces fines (U+202F)

/* ---------------- DOM minimal (mêmes conventions que qa-v2.8) ---------------- */
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

// 🏪 Boutique simulée : multi-TVA activée (cat 1 → 18 %, défaut 0 %) + commission 5 %
const SHOP_MOCK = { name: 'Épicerie Marième', loyalty: { earn_per: 1000, point_value: 10 },
  tva: { enabled: true, default_rate: 0, categories: { 1: 18 }, products: {} }, commission_pct: 5 };
const CATALOG = [
  { id: 1, name: 'Savon Dettol', sku: 'SAV-1', sale_price: 800, quantity: 5, category_id: 1, image_url: 'https://srv.test/storage/savon.jpg' },
  { id: 2, name: 'Riz 5kg', sku: 'RIZ-5', sale_price: 5000, quantity: 9, category_id: 2, image_url: null },
];

const apiCalls = [];
let outTotal = 3;    // 🔔 ruptures simulées (module automation chargé)
let goalTarget = 500000; // 🏆 objectif mensuel simulé
let putBody = null;  // 📥 corps du dernier PUT capturé
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET' });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (opts.method === 'PUT' && u.includes('/settings')) { putBody = JSON.parse(opts.body); return ok({ updated: true }); }
  if (u.includes('/stats/sales')) {
    return ok({ period: '30d',
      totals: { revenue: 440000, receipts: 12, items: 30, avg_basket: 36666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 79 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 90000, avg_basket: 18000, share: 21 },
      ],
      seller_goals: { target: goalTarget, sellers: goalTarget > 0 ? [
        { user_id: 1, name: 'Awa', revenue: 600000, progress: 120 },
        { user_id: 2, name: 'Modibo', revenue: 250000, progress: 50 },
      ] : [] } });
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/products') && u.includes('all=1')) return ok({ data: CATALOG }); // 🧾 catalogue caisse
  if (u.includes('/receipts?')) { // 🧾 liste
    return ok({ data: [{ id: 7, number: 'R-2026-000777', total: 4200, amount_paid: 4200, remaining: 0,
      created_at: '2026-07-17T14:32:00Z', user: { name: 'Awa' } }], current_page: 1, last_page: 1, total: 1 });
  }
  if (u.includes('/receipts/7')) { // 🧾 détail + ventilation v2.9 (additive)
    return ok({ data: { id: 7, number: 'R-2026-000777', total: 4200, amount_paid: 4200, remaining: 0,
      created_at: '2026-07-17T14:32:00Z', user: { name: 'Awa' }, client_name: 'Fatou',
      items: [{ product_name: 'Lait Nido 400g', quantity: 1, unit_price: 4200, refunded_qty: 0 }] },
      tva: { enabled: true, total_tva: 641, total_ht: 3559, by_rate: [{ rate: 18, amount: 641 }] } });
  }
  if (u.includes('/settings')) {
    return ok({ data: {
      seller_monthly_target: { value: '500000', min: 0, max: 100000000 },
      commission_pct: { value: '5', min: 0, max: 50 }, // 👥 v2.9
      tva_config: { value: '{"enabled":false,"default_rate":0,"categories":{},"products":{"5":10}}' }, // 🧮 exception produit à préserver
    } });
  }
  if (u.includes('/categories')) return ok({ data: [{ id: 1, name: 'Hygiène' }, { id: 2, name: 'Alimentation' }] });
  if (u.includes('/dashboard')) return ok({ stats: { low_stock: 2, out_of_stock: 1 } });
  if (u.includes('/shop')) return ok({ shop: SHOP_MOCK, tva: SHOP_MOCK.tva, commission_pct: 5 });
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
  'src/js/ui.js', 'src/js/promo.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', // v2.11 : promo.js ajouté au socle
  'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
store.set('sfpc.shop', JSON.stringify(SHOP_MOCK)); // tva + commission lus par sale/stats
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

  console.log('— 📡 Serveur : multi-TVA & commissions (statique) —');
  const tva = readApi('app/Support/Tva.php');
  check('Tva.php NOUVEAU : config() lit le réglage TEXTE tva_config (JSON) + bornes 0-100 — 0 migration',
    tva.includes("Setting::getText('tva_config')") && tva.includes('max(0, min(100,') && tva.includes('public static function payload()'));
  check('Tva.rateFor : résolution produit → catégorie → taux par défaut',
    tva.includes("$cfg['products'][(string) $productId]") && tva.includes("$cfg['categories'][(string) $categoryId]")
      && tva.includes("return (float) $cfg['default_rate']"));
  check('Tva.breakdown : même formule d’arrondi que les clients (prix TTC) + taux triés croissants',
    tva.includes('(int) round($ttc - $ttc / (1 + $rate / 100))') && tva.includes("usort($byRate")
      && tva.includes("'total_ht' => $totalTtc - $totalTva"));
  check('Tva.breakdown : désactivée → bloc vide ; activée mais tout hors taxe → pas de bloc (total_ht seul)',
    tva.includes("if (! $cfg['enabled'])") && tva.includes("$empty + ['total_ht' => $totalTtc]"));
  const setting = readApi('app/Support/Setting.php');
  check('Setting : commission_pct dans DEFAULTS (0) + LIMITS (0 → 50) + tva_config dans TEXTS',
    setting.includes("'commission_pct' => 0,") && setting.includes("'commission_pct' => ['min' => 0, 'max' => 50]")
      && setting.includes("'tva_config' => '',"));
  const setCtrl = readApi('app/Http/Controllers/Api/SettingController.php');
  check('SettingController : règle EXPLICITE tva_config (sinon clé TEXTS silencieusement ignorée) — JSON valide requis',
    setCtrl.includes("$rules['tva_config']") && setCtrl.includes('max:4000') && setCtrl.includes('json_decode'));
  const shopCtrl = readApi('app/Http/Controllers/Api/ShopController.php');
  check('ShopController : payload /shop enrichi additif (tva + commission_pct — vieux clients : ignoré)',
    shopCtrl.includes('Tva::payload()') && shopCtrl.includes("'commission_pct' => (int)"));
  const rcCtrl = readApi('app/Http/Controllers/Api/ReceiptController.php');
  check('ReceiptController : show/pdf/ticket ventilent via Tva::breakdown($receipt->items) (×3, additif)',
    (rcCtrl.match(/Tva::breakdown\(\$receipt->items\)/g) ?? []).length >= 3 && rcCtrl.includes('items.product'));
  const blR = readApi('resources/views/pdf/sale-receipt.blade.php');
  const blT = readApi('resources/views/pdf/sale-ticket.blade.php');
  check('Blades PDF : bloc « dont HT / dont TVA n % » GARDÉ (@if enabled) dans reçu A5 ET ticket 80 mm',
    blR.includes("@if(($tva['enabled'] ?? false)") && blR.includes('dont HT') && blR.includes('@foreach($tva')
      && blT.includes("@if(($tva['enabled'] ?? false)") && blT.includes('dont TVA {{ $row'));
  const ac = readApi('app/Http/Controllers/Api/AccountingExportController.php');
  check('Export comptable : bloc « commissions » requêté SEULEMENT si pct > 0 + colonnes CSVventilation additives ($tvaOn)',
    ac.includes("Setting::get('commission_pct', 0)") && ac.includes('if ($commissionPct > 0)')
      && ac.includes("'commissions' => $commissions") && ac.includes("$tvaOn ? ['dont HT (F)', 'dont TVA (F)'] : []"));

  console.log('\n— 🖨 PC : ticket thermique & HTML (module réel) —');
  const receiptT = { number: 'R-2026-000777', created_at: '2026-07-17T14:32:00Z',
    items: [{ product_name: 'Lait Nido 400g', quantity: 1, unit_price: 4200 }], total: 4200, amount_paid: 4200, remaining: 0 };
  const shopT = { name: 'Épicerie Marième', phone: '+223 70 00 00 00' };
  const tvaT = { enabled: true, total_tva: 641, total_ht: 3559, by_rate: [{ rate: 18, amount: 641 }] };
  const b0 = Thermal.buildBytes(receiptT, shopT, null, null);
  const bOff = Thermal.buildBytes(receiptT, shopT, null, { enabled: false, total_tva: 0, total_ht: 0, by_rate: [] });
  check('zéro-régression : tva null (vieux serveur) = tva désactivée, ticket BYTE-IDENTIQUE à la v2.8',
    Buffer.from(b0).equals(Buffer.from(bOff)) && !Buffer.from(b0).toString('latin1').includes('dont HT'));
  const b1 = Buffer.from(Thermal.buildBytes(receiptT, shopT, null, tvaT)).toString('latin1');
  check('bytes ESC/POS : lignes « dont HT 3 559 FCFA » + « dont TVA 18% 641 FCFA » ajoutées après le TOTAL',
    norm(b1).includes('dont HT') && norm(b1).includes('3 559 FCFA') && b1.includes('dont TVA 18%') && norm(b1).includes('641 FCFA'));
  const html0 = Thermal.buildTicketHtml(receiptT, shopT, false, null);
  const html1 = Thermal.buildTicketHtml(receiptT, shopT, false, tvaT);
  check('ticket HTML 80 mm : ventilation uniquement quand TVA fournie (« dont TVA 18 % »)',
    !html0.includes('dont HT') && html1.includes('dont HT') && html1.includes('dont TVA 18 %') && norm(html1).includes('3 559'));
  const thSrc = read('src/js/thermal.js');
  check('print() 4ᵉ param additif + printById() câble r.tva du serveur (réimpression historique ventilée)',
    thSrc.includes('async function print(receipt, shop = {}, tva = null)') && thSrc.includes('r.tva ?? null'));

  console.log('\n— 🧾 PC : caisse (écran réel + panier simulé) —');
  run(read('src/js/screens/sale.js'), 'sale.js');
  const vSale = el('div');
  await Screens.sale(vSale);
  await sleep(10);
  const search = findAll(vSale, (c) => c.tagName === 'input')[0];
  check('caisse rendue avec le catalogue (champ recherche + 2 produits mockés)',
    !!search && allText(vSale).length > 0);
  search.value = 'Savon';
  search._handlers.input();
  await sleep(5);
  const pickBtn = findAll(vSale, (c) => c._handlers?.click && allText(c).includes('Savon Dettol'))[0];
  check('recherche « Savon » → carte produit cliquable AVEC vignette 📸 (img 30 px)',
    !!pickBtn && findAll(pickBtn, (c) => c.tagName === 'img' && String(c?.attrs?.src ?? '').includes('savon')).length === 1);
  pickBtn._handlers.click();
  await sleep(5);
  const txtSale = norm(allText(vSale));
  check('panier : ligne avec vignette 26 px + estimation « dont TVA 18 % » = 122 F (800 TTC, formule serveur)',
    findAll(vSale, (c) => c.tagName === 'img' && String(c?.attrs?.src ?? '').includes('savon')).length >= 1
      && txtSale.includes('dont TVA 18 %') && txtSale.includes('122 F'));
  check('zéro-régression : Riz (catégorie sans taux → défaut 0 %) n’ajoute AUCUNE ligne TVA',
    (() => { search.value = 'Riz'; search._handlers.input();
      const b = findAll(vSale, (c) => c._handlers?.click && allText(c).includes('Riz 5kg'))[0];
      b?._handlers?.click?.();
      return (norm(allText(vSale)).match(/dont TVA/g) ?? []).length === 1; })());

  console.log('\n— 🧾 PC : détail reçu (écran réel + modal) —');
  run(read('src/js/screens/receipts.js'), 'receipts.js');
  const vR = el('div');
  await Screens.receipts(vR);
  await sleep(10);
  const eye = findAll(vR, (c) => c._handlers?.click && allText(c).includes('👁'))[0];
  check('liste des reçus : ligne R-2026-000777 + bouton 👁 cliquable', !!eye);
  eye._handlers.click();
  await sleep(10);
  const txtModal = norm(allText(document.body));
  check('modal détail : lignes « dont HT 3 559 F » + « dont TVA 18 % 641 F » entre TOTAL et Payé',
    txtModal.includes('dont HT') && txtModal.includes('3 559') && txtModal.includes('dont TVA 18 %') && txtModal.includes('641'));

  console.log('\n— 📄 PC : rapport PDF + commissions (module réel) —');
  const recapBase = { receipts: { total: 100000, paid: 90000, count: 3, points_discount: 0 }, cash: {}, closings: { days: [] } };
  const htmlCom = StatReport.buildRecapHtml({ title: 'Rapport mensuel', periodLabel: 'Juillet 2026',
    recap: { ...recapBase, commissions: { pct: 5, sellers: [{ user_id: 1, name: 'Awa', revenue: 600000, commission: 30000 }], total: 30000 } },
    shop: { name: 'Épicerie Marième' }, user: { name: 'Patron' }, placeName: 'Siège' });
  check('avec commissions : encart « ② bis — 👥 Commissions (5 %) » + Awa 30 000 F',
    htmlCom.includes('② bis') && htmlCom.includes('Commissions (5 %)') && norm(htmlCom).includes('30 000'));
  const htmlSans = StatReport.buildRecapHtml({ title: 'Rapport mensuel', periodLabel: 'Juillet 2026',
    recap: recapBase, shop: { name: 'X' }, user: { name: 'Patron' }, placeName: 'Siège' });
  check('zéro-régression : clé absente / pct 0 → encart « ② bis » ABSENT, rapport inchangé',
    !htmlSans.includes('② bis') && !htmlSans.includes('Commission'));

  console.log('\n— 🏆 PC : objectifs + commission (écran réel) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await sleep(10);
  const goalCard = findAll(vS, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Objectifs vendeurs'))[0];
  check('carte objectifs : 💰 « com. 30 000 F » sous Awa (600 000 × 5 %) — donnée /shop additive',
    norm(allText(goalCard)).includes('💰') && norm(allText(goalCard)).includes('com. 30 000'));
  store.set('sfpc.shop', JSON.stringify({ ...SHOP_MOCK, commission_pct: 0 }));
  const vS2 = el('div');
  await Screens.stats(vS2);
  await sleep(10);
  const goalCard2 = findAll(vS2, (c) => String(c?.className ?? '') === 'card' && allText(c).includes('Objectifs vendeurs'))[0];
  check('zéro-régression : commission 0 (vieux réglage) → pas de 💰 DANS LA CARTE objectifs (elle existe toujours)',
    !!goalCard2 && !norm(allText(goalCard2)).includes('💰'));
  store.set('sfpc.shop', JSON.stringify(SHOP_MOCK));

  console.log('\n— ⚙️ PC : réglages boutique (écran réel + sauvegarde) —');
  run(read('src/js/screens/shopsettings.js'), 'shopsettings.js');
  const vSet = el('div');
  await Screens.shopsettings(vSet);
  await sleep(10);
  const txtSet = norm(allText(vSet));
  check('carte 🧮 Multi-TVA affichée (taux défaut + 2 catégories) + champ 👥 commission présent',
    txtSet.includes('Multi-TVA') && txtSet.includes('Hygiène') && txtSet.includes('Alimentation') && txtSet.includes('Commission vendeurs'));
  const tvaChk = findAll(vSet, (c) => c.tagName === 'input' && c.attrs?.type === 'checkbox')[0];
  tvaChk._handlers.change({ target: { checked: true } });
  const saveBtn = findAll(vSet, (c) => c._handlers?.click && allText(c).includes('💾'))[0];
  saveBtn._handlers.click();
  await sleep(10);
  check('sauvegarde : PUT /settings avec tva_enabled:true, commission_pct:5 ET exceptions produit {"5":10} préservées',
    !!putBody && putBody.commission_pct === 5 && !!putBody.tva_config
      && putBody.tva_config.includes('"enabled":true') && putBody.tva_config.includes('"5":10'));

  console.log('\n— 📱 Mobile : reçu texte WhatsApp (utilitaire réel) —');
  const rt = readApp('src/utils/receiptText.js');
  vm.runInThisContext(rt.replace(/^import .*$/gm, '').replace('export function buildReceiptText', 'globalThis.__brt = function _unused(){}; function buildReceiptText'), 'receiptText.js');
  const tm = (k, p) => {
    const tpl = ({ wa_txt_total: 'TOTAL', wa_txt_paid: 'Payé', wa_txt_due: 'Reste à payer', wa_txt_thanks: 'Merci !',
      wa_txt_ht: 'dont HT', wa_txt_vat: 'dont TVA {rate} % :' })[k] ?? `??${k}??`;
    return String(tpl).replace(/\{(\w+)\}/g, (_, x) => String(p?.[x] ?? ''));
  };
  const rcptMobile = { number: 'R-2026-000777', created_at: '2026-07-17T14:32:00Z', total: 4200, amount_paid: 4200, remaining: 0,
    items: [{ product_name: 'Lait Nido 400g', quantity: 1, unit_price: 4200, subtotal: 4200 }] };
  const txtWa = buildReceiptText(rcptMobile, { name: 'Épicerie Marième' }, tm,
    { enabled: true, total_tva: 641, total_ht: 3559, by_rate: [{ rate: 18, amount: 641 }] });
  check('avec tva (serveur v2.9) : « dont HT : 3 559 F » + « dont TVA 18 % : 641 F » après le TOTAL',
    norm(txtWa).includes('dont HT :') && norm(txtWa).includes('3 559 F') && txtWa.includes('dont TVA 18 % :') && norm(txtWa).includes('641 F'));
  const txtWa0 = buildReceiptText(rcptMobile, { name: 'Épicerie Marième' }, tm);
  check('zéro-régression : 4ᵉ param omis (vieux serveur) → texte IDENTIQUE à la v19 (aucune ligne « dont »)',
    !txtWa0.includes('dont'));
  const sheet = readApp('src/components/ReceiptActionsSheet.js');
  check('feuille d’actions : full.data?.tva câblé dans buildReceiptText (ventilation serveur)',
    sheet.includes('buildReceiptText(full.data.data, shopRes.data?.shop, t, full.data?.tva ?? null)'));
  const ns = readApp('src/screens/NewSaleScreen.js');
  check('NewSale : 📸 Image importée + vignettes liste/panier + image_url & category_id gardés au panier',
    ns.includes('Image,') && ns.includes('image_url: product.image_url ?? null') && ns.includes('category_id: product.category_id ?? null')
      && ns.includes('styles.resultThumb') && ns.includes('styles.cartThumb'));
  check('NewSale : tvaLines miroir serveur (produit → catégorie → défaut) + lignes « dont TVA {rate} % » au panier',
    ns.includes("tvaCfg.products?.[String(i.product_id)]") && ns.includes("tvaCfg.categories?.[String(i.category_id)]")
      && ns.includes("t('tva_incl', { rate })") && ns.includes("setTvaCfg(r.data?.tva ?? null)"));
  const st = readApp('src/screens/StatsScreen.js');
  check('Stats : commission_pct du /shop (catch silencieux) + ligne 💰 com_month sous la barre objectifs',
    st.includes("api.get('/shop')") && st.includes('.catch(() => {})') && st.includes("t('com_month'")
      && st.includes('Math.round(Number(g.revenue ?? 0) * comPct / 100)'));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms(trRaw.split('export const fr = {')[1].split('\n};')[0]);
  const enK = kms(trRaw.split('export const en = {')[1].split('\n};')[0]);
  const V29M = ['tva_incl', 'wa_txt_ht', 'wa_txt_vat', 'com_month'];
  check('traductions mobile : 676+ FR = EN + 4 clés v2.9 (v20) ×2', // ≥ : la v2.10 a ajouté 23 clés (699)
    frK.size >= 676 && enK.size >= 676 && frK.size === enK.size && V29M.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms(pcSrc.split('const fr = {')[1].split('\n  };')[0]);
  const pcEn = kms(pcSrc.split('const en = {')[1].split('\n  };')[0]);
  const V29PC = ['tva_title', 'tva_hint', 'tva_default_rate', 'tva_ht', 'tva_incl',
    'set_commission', 'set_commission_hint', 'com_title', 'com_due', 'com_month'];
  check('i18n PC : 692+ FR = EN, parité parfaite + 10 clés v2.9 ×2', // ≥ : la v2.10 a ajouté 36 clés (728)
    pcFr.size >= 692 && pcEn.size >= 692 && pcFr.size === pcEn.size && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && V29PC.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('version PC v2.9+', /APP_VERSION: 'StockFlow PC v\d/.test(read('src/js/config.js')));
  check('ap_beep_sub toujours présente (surveillance)', pcFr.has('ap_beep_sub') && pcEn.has('ap_beep_sub'));

  console.log(`\nRÉSULTAT v2.9 : ${pass} OK / ${ko} KO`);
})();
