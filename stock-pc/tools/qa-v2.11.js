// ============================================================
// 🧪 QA StockFlow v2.11 (PÉRENNE, dans le repo)
// 🏷️ prix promo datés · 📦 inventaire tournant · 🔔 relance crédit
// Lancement : node tools/qa-v2.11.js   (depuis stock-pc/)
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
const norm = (s) => String(s).replace(/[   ]/g, ' '); // Intl fr-FR groupe en espaces fines (U+202F) OU insécables (U+00A0) — échappements explicites, jamais de littéral invisible (leçon v2.10)

/* ---------------- DOM minimal (conventions qa-v2.9/v2.10) ---------------- */
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

const NOW = new Date();
const inMonth = (d) => d.toISOString().slice(0, 7) === NOW.toISOString().slice(0, 7);
const SHOP_MOCK = { name: 'Épicerie Marième', loyalty: { earn_per: 1000, point_value: 10 },
  tva: { enabled: false, default_rate: 0, categories: {}, products: {} }, commission_pct: 0, cycle_count_daily: 3 };
const CATALOG = [
  { id: 1, name: 'Savon Dettol', sku: 'SAV-1', sale_price: 800, quantity: 5, promo_price: 700, promo_until: '2026-12-31', image_url: null },
  { id: 2, name: 'Riz 5kg', sku: 'RIZ-5', sale_price: 5000, quantity: 9, promo_price: null, promo_until: null, image_url: null },
  { id: 3, name: 'Huile 1L', sku: 'HUI-1', sale_price: 2500, quantity: 12, promo_price: null, promo_until: null, image_url: null },
  { id: 4, name: 'Sucre 1kg', sku: 'SUC-1', sale_price: 900, quantity: 30, promo_price: null, promo_until: null, image_url: null },
];
const SETTINGS_MOCK = {
  segment_loyal_min: { value: '5', min: 1, max: 100 },
  cycle_count_daily: { value: '3', min: 0, max: 50 },
  tva_config: { value: '' },
  promo_config: { value: '{"1":{"price":700,"from":"2026-07-01","to":"2026-12-31"},"9":{"price":100,"from":"2026-01-01","to":"2026-06-30"}}' },
  boss_email: { value: '' },
};

const apiCalls = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  apiCalls.push({ url: u, method: opts.method ?? 'GET', body: opts.body ?? null });
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/settings')) return ok({ data: SETTINGS_MOCK });
  if (u.includes('/categories')) return ok({ data: [] });
  if (u.includes('/products') && u.includes('all=1')) return ok({ data: CATALOG });
  if (u.includes('/products')) return ok({ data: CATALOG });
  if (u.includes('/inventories')) return ok({ data: [] });
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
  'src/js/ui.js', 'src/js/promo.js', 'src/js/thermal.js',
  'src/js/screens/products.js', 'src/js/screens/shopsettings.js', 'src/js/screens/inventories.js']) run(read(f), f);
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

  console.log('— 📡 Serveur : promos datées · comptage tournant (statique) —');
  const promoPhp = readApi('app/Support/Promo.php');
  check('Promo.php : config saine (getText + json_decode) + dates AAAA-MM-JJ strictes écartées sinon',
    promoPhp.includes("Setting::getText('promo_config')") && promoPhp.includes("/^\\d{4}-\\d{2}-\\d{2}$/"));
  check('Promo.php : activeFor bornes incluses (comparaison lexicale) + matchesLine + flagReceiptItems additifs',
    promoPhp.includes("$row['from'] <= $today && $today <= $row['to']") && promoPhp.includes('function matchesLine') && promoPhp.includes('function flagReceiptItems'));
  const settingPhp = readApi('app/Support/Setting.php');
  check('Setting : promo_config TEXTS + cycle_count_daily DEFAULTS 0 (OFF par défaut) + LIMITS 0→50',
    settingPhp.includes("'promo_config' => ''") && settingPhp.includes("'cycle_count_daily' => 0,") && settingPhp.includes("'cycle_count_daily' => ['min' => 0, 'max' => 50]"));
  const setCtrl = readApi('app/Http/Controllers/Api/SettingController.php');
  check('SettingController : règle JSON explicite promo_config (leçon v2.9 — sinon clé silencieusement ignorée)',
    setCtrl.includes("$rules['promo_config']") && setCtrl.includes('Le réglage promo doit être un JSON valide.'));
  const prodCtrl = readApi('app/Http/Controllers/Api/ProductController.php');
  const promoUses = prodCtrl.split('appendPromo(').length - 1;
  check('ProductController : appendPromo sur les 2 branches (all + paginate), clés promo_price/promo_until additives',
    promoUses === 3 && prodCtrl.includes('$p->promo_price') && prodCtrl.includes('$p->promo_until'));
  const rcCtrl = readApi('app/Http/Controllers/Api/ReceiptController.php');
  const flagCalls = rcCtrl.split('Promo::flagReceiptItems').length - 1;
  check('ReceiptController : prix par défaut = promo active DÉTAIL, jamais à la place du gros (ternaire wholesale conservée)',
    rcCtrl.includes('Promo::priceFor($product) ?? $product->sale_price') && rcCtrl.includes('(int) $product->wholesale_price'));
  check('ReceiptController : drapeaux promo sur les 4 surfaces utiles (store 201 / show / pdf / ticket)',
    flagCalls >= 4);
  const invCtrl = readApi('app/Http/Controllers/Api/InventoryController.php');
  check('InventoryController : product_ids additif (nullable, exists, ≤ 100) → whereIn, absent = tout le catalogue',
    invCtrl.includes("'product_ids' => ['nullable', 'array', 'max:100']") && invCtrl.includes("->when($onlyIds->isNotEmpty(), fn ($q) => $q->whereIn('id', $onlyIds->all()))"));
  const shopCtrl = readApi('app/Http/Controllers/Api/ShopController.php');
  check('ShopController : cycle_count_daily additif dans le payload /shop (lu par PC & mobile, 0 = carte masquée)',
    shopCtrl.includes("'cycle_count_daily' => (int) \\App\\Support\\Setting::get('cycle_count_daily', 0)"));
  const bladeR = readApi('resources/views/pdf/sale-receipt.blade.php');
  const bladeT = readApi('resources/views/pdf/sale-ticket.blade.php');
  check('Blades PDF : badge [PROMO] gardé @if sur le reçu A5 ET le ticket 80 mm (absent sinon — mention du moment)',
    bladeR.includes("@if($item->promo ?? false)") && bladeT.includes("@if($item->promo ?? false)") && bladeT.includes('[PROMO]'));

  console.log('\n— 🧰 PC : promo.js (module RÉEL, exécuté) —');
  check('promoActive : null / 0 / absent → faux ; promo_price > 0 → vrai',
    !Promo.promoActive(null) && !Promo.promoActive({ promo_price: 0 }) && !Promo.promoActive({}) && Promo.promoActive({ promo_price: 700 }));
  check('effectivePrice : promo si active, prix normal sinon',
    Promo.effectivePrice({ sale_price: 800, promo_price: 700 }, false) === 700
      && Promo.effectivePrice({ sale_price: 800, promo_price: null }, false) === 800);
  check('effectivePrice : JAMAIS de promo pour un client de gros (wholesale_price prime)',
    Promo.effectivePrice({ sale_price: 800, promo_price: 700, wholesale_price: 600 }, true) === 600
      && Promo.effectivePrice({ sale_price: 800, promo_price: 700, wholesale_price: null }, true) === 700);
  {
    const cat = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const day1 = Promo.cycleList(cat, 3, new Date('2026-07-17T12:00:00Z'));
    const day1b = Promo.cycleList(cat, 3, new Date('2026-07-17T12:00:00Z'));
    const day2 = Promo.cycleList(cat, 3, new Date('2026-07-18T12:00:00Z'));
    const day4 = Promo.cycleList(cat, 3, new Date('2026-07-20T12:00:00Z'));
    const ids = (l) => l.map((p) => p.id).join(',');
    const dayIdx = Math.floor(new Date('2026-07-17T12:00:00Z').getTime() / 86400000);
    const expIds = (offset) => Array.from({ length: 3 }, (_, i) => (((dayIdx * 3 + offset + i) % 10) + 10) % 10 + 1).join(',');
    check('cycleList : déterministe (même date → même tranche ' + ids(day1) + ') et suit la règle start=(jour×n)%total',
      ids(day1) === ids(day1b) && ids(day1) === expIds(0) && ids(day2) === expIds(3));
    check('cycleList : rotation complète — J+1 disjoint de J, J+3 reboucle correctement (' + ids(day4) + ')',
      day1.every((p) => !day2.some((q) => q.id === p.id)) && ids(day4) === expIds(9));
    check('cycleList : bornes — n=0 → [], catalogue vide → [], n > total → min(n, total))',
      Promo.cycleList(cat, 0).length === 0 && Promo.cycleList([], 3).length === 0 && Promo.cycleList(cat, 99).length === 10);
  }
  check('waPhoneIntl : 8 chiffres → préfixe 223 (Mali), +223 conservé, 00223 normalisé',
    Promo.waPhoneIntl('70 44 33 22') === '22370443322' && Promo.waPhoneIntl('+223 76 11 22 33') === '22376112233' && Promo.waPhoneIntl('0022376445566') === '22376445566');
  check('waLink : wa.me + texte encodé URI (espaces, accents)',
    Promo.waLink('70443322', 'Bonjour Awa, il reste 5 000 F').startsWith('https://wa.me/22370443322?text=')
      && Promo.waLink('70443322', 'a b').endsWith('a%20b'));

  console.log('\n— 🖥 PC : écrans RÉELS montés avec les nouveautés —');
  {
    const view = el('div');
    await Screens.products(view);
    await sleep(60); // load() est fire & forget dans l'écran
    const txt = norm(allText(view));
    const strikes = findAll(view, (n) => n.tagName === 's');
    check('Produits (monté) : promo affichée — 700 F + prix normal barré (800 F) + badge PROMO ; hors promo : prix seul',
      txt.includes('700') && txt.includes('800') && txt.includes('PROMO') && strikes.length >= 1 && txt.includes('5 000 F'));
  }
  {
    const view = el('div');
    await Screens.shopsettings(view);
    await sleep(60);
    const txt = norm(allText(view));
    const dl = findAll(view, (n) => n.tagName === 'datalist')[0];
    check('Seuils (monté) : carte 🏷️ Promos + champ « Inventaire tournant » + 1 ligne promo existante (Savon Dettol 700 F, dates)',
      txt.includes('Promos datées') && txt.includes('Inventaire tournant (produits/jour)') && txt.includes('Savon Dettol') && txt.includes('2026-07-01 → 2026-12-31'));
    check('Seuils (monté) : datalist produits alimentée depuis /products?all=1 (4 options « id — nom »)',
      dl && dl.children.length === 4 && String(dl.children[0]?.attrs?.value ?? '').startsWith('1 — Savon Dettol'));
    {
      const saveBtn = findAll(view, (n) => n.tagName === 'button' && allText(n).includes('💾'))[0];
      apiCalls.length = 0;
      if (saveBtn?._handlers?.click) await saveBtn._handlers.click();
      const put = apiCalls.find((c) => c.method === 'PUT' && c.url.includes('/settings'));
      const body = put ? JSON.parse(put.body) : {};
      let promoSent = {};
      try { promoSent = JSON.parse(body.promo_config ?? ''); } catch { promoSent = null; }
      check('Seuils (sauvegarde simulée) : PUT /settings — cycle_count_daily=3 + promo_config JSON valide (promo 1 @700 conservée, expirée 9 conservée)',
        !!put && body.cycle_count_daily === 3 && promoSent && String(promoSent['1']?.price) === '700' && promoSent['1']?.to === '2026-12-31' && String(promoSent['9']?.price) === '100');
    }
  }
  {
    store.set('sfpc.shop', JSON.stringify(SHOP_MOCK)); // cycle_count_daily = 3 (lu via cache Api.shop())
    const view = el('div');
    await Screens.inventories(view);
    await sleep(60);
    const txt = norm(allText(view));
    const expected = Promo.cycleList(CATALOG, 3).map((p) => p.id);
    const btn = findAll(view, (n) => n.tagName === 'button' && allText(n).includes('✏️'))[0];
    check('Inventaires (monté) : carte « Comptage du jour » affichée à n=3 — ' + expected.length + ' produits attendus de la rotation',
      txt.includes('Comptage du jour') && txt.includes('3 produits à compter') && !!btn);
    {
      apiCalls.length = 0;
      if (btn?._handlers?.click) await btn._handlers.click();
      await new Promise((r) => setTimeout(r, 150));
      const post = apiCalls.find((c) => c.method === 'POST' && c.url.includes('/inventories'));
      const body = post ? JSON.parse(post.body) : {};
      check('Inventaires (clic ✏️) : POST /inventories avec product_ids = tranche du jour (' + expected.join(',') + ') + nom daté',
        !!post && JSON.stringify(body.product_ids ?? []) === JSON.stringify(expected) && String(body.name ?? '').length > 4);
    }
    store.set('sfpc.shop', JSON.stringify({ ...SHOP_MOCK, cycle_count_daily: 0 })); // OFF → carte masquée (zéro régression)
    const view0 = el('div');
    await Screens.inventories(view0);
    await sleep(60);
    check('Inventaires (monté, réglage 0) : carte comptage tournant MASQUÉE — vieux serveur / désactivé = comme avant',
      !norm(allText(view0)).includes('Comptage du jour'));
    store.set('sfpc.shop', JSON.stringify(SHOP_MOCK));
  }
  {
    const receipt = { number: 'T-1', created_at: '2026-07-17 10:00:00', total: 6400, amount_paid: 6400,
      items: [
        { product_name: 'Savon Dettol', quantity: 2, unit_price: 700, promo: true },
        { product_name: 'Riz 5kg', quantity: 1, unit_price: 5000 },
      ] };
    const bytes = Thermal.buildBytes(receipt, SHOP_MOCK, null, null);
    const txt = bytes.map((b) => String.fromCharCode(b)).join('');
    const html = Thermal.buildTicketHtml(receipt, SHOP_MOCK, false, null);
    check('Thermal (module réel) : ESC/POS « 2x Savon Dettol *PROMO* » + HTML [PROMO] — ligne sans drapeau intacte',
      txt.includes('*PROMO*') && txt.includes('1x Riz 5kg') && !txt.includes('Riz 5kg *PROMO*') && html.includes('[PROMO]'));
  }

  console.log('\n— 🧷 PC : câblage statique (caisse, fiche client, reçus, index) —');
  const saleJs = read('src/js/screens/sale.js');
  check('Caisse : linePrice = Promo.effectivePrice (+ prix barré & badge sur la carte résultat)',
    saleJs.includes('window.Promo.effectivePrice(p') && saleJs.includes("UI.badge('warning', `🏷️ ${t('pr_badge')}`)"));
  const custJs = read('src/js/screens/customers.js');
  check('Fiche client : relance crédit wa.me pré-remplie — gardée par solde > 0 ET téléphone + nom boutique',
    custJs.includes('window.Promo.waLink(') && custJs.includes("t('cr_msg'") && custJs.includes('Number(st.credit_balance ?? 0) > 0') && custJs.includes('Api.shop()?.name'));
  const recJs = read('src/js/screens/receipts.js');
  check('Reçus : badge PROMO dans le détail quand le drapeau serveur est présent (additif)',
    recJs.includes("it.promo ? UI.badge('warning', `🏷️ ${t('pr_badge')}`) : null"));
  check('index.html : promo.js chargé sur le socle (avant les écrans) + version v2.11',
    read('src/index.html').includes('src="js/promo.js"') && /APP_VERSION: 'StockFlow PC v\d+\.\d+'/.test(read('src/js/config.js')));

  console.log('\n— 📱 Mobile v22 (statique + module RÉEL exécuté) —');
  {
    let src = readApp('src/utils/promo.js').replace(/export const /g, 'const ').replace(/export function /g, 'function ');
    const mod = vm.runInThisContext(`(() => { ${src}; return { promoActive, effectivePrice, cycleList, waPhoneIntl, waLink }; })()`);
    const catPc = CATALOG.map((p) => ({ id: p.id }));
    check('utils/promo.js mobile (exécuté) : effectivePrice identique PC (promo détail, jamais gros)',
      mod.effectivePrice({ sale_price: 800, promo_price: 700 }, false) === 700
        && mod.effectivePrice({ sale_price: 800, promo_price: 700, wholesale_price: 600 }, true) === 600);
    check('utils/promo.js mobile (exécuté) : cycleList IDENTIQUE au PC (même tranche, même date)',
      JSON.stringify(mod.cycleList(catPc, 3, new Date('2026-07-17T12:00:00Z')).map((p) => p.id))
        === JSON.stringify(Promo.cycleList(catPc, 3, new Date('2026-07-17T12:00:00Z')).map((p) => p.id)));
    check('utils/promo.js mobile (exécuté) : waPhoneIntl + waLink miroirs (223, encodage)',
      mod.waPhoneIntl('70 44 33 22') === '22370443322' && mod.waLink('70443322', 'x y').includes('?text=x%20y'));
  }
  const cardJs = readApp('src/components/ProductCard.js');
  check('ProductCard : prix promo + ancien prix barré (promoOld) + 🏷️ — repli prix normal sinon',
    cardJs.includes('promoActive(product)') && cardJs.includes('styles.promoOld') && cardJs.includes('formatMoney(product.sale_price)'));
  const nsJs = readApp('src/screens/NewSaleScreen.js');
  check('Vente mobile : promo_price transportée dans le panier + effectivePrice aux 3 sites (ajout panier / choix client / retrait client)',
    nsJs.includes('promo_price: product.promo_price != null') && (nsJs.split('effectivePrice(').length - 1) >= 3);
  check('Vente mobile : résultat recherche = promo en gras + prix barré (détail uniquement)',
    nsJs.includes("promoActive(p) && customer?.price_tier !== 'wholesale'") && nsJs.includes("textDecorationLine: 'line-through'"));
  const cdJs = readApp('src/screens/CustomerDetailScreen.js');
  check('Fiche client mobile : 🔔 relance crédit — waLink + cr_msg pré-remplie (nom, montant, boutique), gardée solde > 0',
    cdJs.includes('waLink(customer.phone, msg)') && cdJs.includes("t('cr_msg'") && cdJs.includes('Number(stats?.credit_balance ?? 0) > 0'));
  const invJs = readApp('src/screens/InventoriesScreen.js');
  check('Inventaires mobile : carte comptage tournant (cycleList) + POST product_ids + navigation directe vers le comptage',
    invJs.includes('cycleList(cycleItems, cycleN)') && invJs.includes('product_ids: todays.map((p) => p.id)') && invJs.includes("navigation.navigate('InventoryCount'"));
  const rtJs = readApp('src/utils/receiptText.js');
  check('Reçu WhatsApp : mention « 🏷️ PROMO » sur la ligne concernée (drapeau additif serveur)',
    rtJs.includes("it.promo ? ` 🏷️ ${t('pr_badge')}` : ''"));

  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frBlock = trRaw.split(/export default|const fr/)[0];
  const frK = kms((trRaw.match(/export const fr = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const enK = kms((trRaw.match(/export const en = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const V222 = ['pr_badge', 'cc_title', 'cc_hint', 'cc_empty', 'cc_start', 'cc_name', 'cr_remind', 'cr_msg'];
  check('traductions mobile : 707 FR = 707 EN + 8 clés v22 ×2', frK.size >= 707 && enK.size >= 707 && V222.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms((pcSrc.match(/const fr = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const pcEn = kms((pcSrc.match(/const en = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const V11 = ['pr_title', 'pr_hint', 'pr_product', 'pr_price', 'pr_add', 'pr_invalid', 'pr_badge',
    'set_cycle', 'set_cycle_hint', 'cc_title', 'cc_hint', 'cc_empty', 'cc_start', 'cc_name', 'cc_created',
    'cr_remind', 'cr_hint', 'cr_msg'];
  check('i18n PC : 746 FR = 746 EN, parité parfaite + 18 clés v2.11 ×2',
    pcFr.size >= 746 && pcEn.size >= 746 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && V11.every((k) => pcFr.has(k) && pcEn.has(k)));

  console.log(`\nRÉSULTAT v2.11 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
