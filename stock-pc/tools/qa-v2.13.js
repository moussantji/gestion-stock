// ============================================================
// 🧪 QA StockFlow v2.13 (PÉRENNE, dans le repo)
// 📥 import CSV produits en masse · 💳 échéancier de rappels crédit
// Lancement : node tools/qa-v2.13.js   (depuis stock-pc/)
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
const norm = (s) => String(s).replace(/[  ]/g, ' '); // U+202F / U+00A0 → espace (échappements explicites — leçon v2.10)
const sq = (s) => norm(s).replace(/ +/g, ' '); // + padding colonnes (leçon v2.12)

/* ---------------- DOM minimal (conventions qa-v2.10/v2.11/v2.12) ---------------- */
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
const TODAY = '2026-07-17';
const CUS_LIST = [ // 💳 clients mockés — échéancier additif v2.13
  { id: 1, name: 'Awa Diallo', phone: '70443322', price_tier: 'retail', loyalty_points: 0, receipts_count: 9, spent_total: 50000, paid_total: 30000, credit_balance: 20000, last_purchase_at: '2026-07-10', payment_dates: ['2026-07-10', '2026-08-01'], next_payment_date: '2026-07-10', days_until: -7 },
  { id: 2, name: 'Modibo Keita', phone: null, price_tier: 'wholesale', loyalty_points: 12, receipts_count: 3, spent_total: 15000, paid_total: 10000, credit_balance: 5000, last_purchase_at: '2026-07-12', payment_dates: ['2026-07-18'], next_payment_date: '2026-07-18', days_until: 1 },
  { id: 3, name: 'Fatou Sissoko', phone: null, price_tier: 'retail', loyalty_points: 0, receipts_count: 1, spent_total: 3000, paid_total: 0, credit_balance: 3000, last_purchase_at: '2026-07-15', payment_dates: ['2026-07-27'], next_payment_date: '2026-07-27', days_until: 10 },
  { id: 4, name: 'Sekou Camara', phone: null, price_tier: 'retail', loyalty_points: 0, receipts_count: 2, spent_total: 9000, paid_total: 9000, credit_balance: 0, last_purchase_at: '2026-07-16', payment_dates: ['2026-07-20'], next_payment_date: '2026-07-20', days_until: 3 },
];
let serverHasPlan = true;   // 💳 vieux serveur = payment_plan absent du détail
let customersFail = false;  // 💳 panne réseau simulée (automation)

const apiCalls = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method ?? 'GET';
  const body = opts.body ? JSON.parse(opts.body) : null;
  apiCalls.push({ url: u, method, body });
  if (u.includes('/customers') && customersFail) throw new Error('réseau KO');
  const ok = (d) => ({ ok: true, status: 200, json: async () => d, headers: { get: () => null } });
  if (u.includes('/products/import') && method === 'POST') {
    return ok({ created: 2, updated: 1, errors: [{ line: 4, sku: 'BAD-1', message: 'Catégorie inconnue : Inconnue' }] });
  }
  if (u.includes('/customers/') && method === 'PUT') {
    const dates = [...(body?.payment_plan ?? [])].sort();
    return ok({ data: { id: 1, name: 'Awa Diallo' },
      payment_plan: { dates, next: dates[0] ?? null, days_until: dates.length ? 9 : null } });
  }
  if (u.includes('/customers/1')) {
    return ok({ data: { id: 1, name: 'Awa Diallo', phone: '70443322', loyalty_points: 0 },
      stats: { receipts_count: 9, spent_total: 50000, paid_total: 30000, credit_balance: 20000 },
      credits: [], history: [], loyalty_history: [],
      loyalty_config: { earn_per: 1000, point_value: 10 },
      ...(serverHasPlan ? { payment_plan: { dates: ['2026-07-10', '2026-08-01'], next: '2026-08-01', days_until: 15 } } : {}) });
  }
  if (u.includes('/customers') && method === 'GET') {
    return ok({ data: serverHasPlan ? CUS_LIST : CUS_LIST.map((c) => { const { payment_dates, next_payment_date, days_until, ...rest } = c; return rest; }) });
  }
  if (u.includes('/categories')) return ok({ data: [{ id: 1, name: 'Hygiène' }] });
  if (u.includes('/suppliers')) return ok({ data: [{ id: 7, name: 'Sotuba' }] });
  if (u.includes('/products')) return ok({ data: [{ id: 5, name: 'Savon Dettol', sku: 'SAV-1', sale_price: 800, purchase_price: 500, quantity: 12, alert_threshold: 3 }], current_page: 1, last_page: 1, total: 1 });
  if (u.includes('/shop')) return ok({ shop: SHOP_MOCK });
  return ok({ data: [] });
};
const notifFires = [];
global.sfpc = {
  thermal: { list: async () => [], printNet: async () => true, printSilent: async () => true },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName }) },
  file: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.name }) },
  isElectron: true,
};
window.StockNotifier = { canNotify: () => true, fire: (title, body) => { notifFires.push({ title, body }); return true; } };

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js',
  'src/js/ui.js', 'src/js/promo.js', 'src/js/csvimport.js', 'src/js/automation.js',
  'src/js/screens/products.js', 'src/js/screens/customers.js']) run(read(f), f);
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

  /* ============ 📡 SERVEUR (statique) ============ */
  console.log('— 📡 Serveur : import CSV & échéancier crédit (statique) —');
  const routes = readApi('routes/api.php');
  const prodCtrl = readApi('app/Http/Controllers/Api/ProductController.php');
  check('Route POST /products/import AVANT apiResource (pas de conflit avec /products/{product})',
    routes.includes("Route::post('/products/import'") && routes.indexOf("Route::post('/products/import'") < routes.indexOf("Route::apiResource('products'"));
  check('Import : validation ligne par ligne (Validator::make, mêmes règles que Store, max 300) + une ligne invalide n\'empêche PAS les autres',
    prodCtrl.includes("'rows' => ['required', 'array', 'min:1', 'max:300']") && prodCtrl.includes('Validator::make($row')
      && prodCtrl.includes("$v->fails()") && prodCtrl.includes('continue;'));
  check('Import : rapprochement SKU insensible à la casse (UNE requête whereIn + keyBy mb_strtolower) + doublons fichier = mise à jour',
    prodCtrl.includes("Product::whereIn('sku', $skus)") && prodCtrl.includes('mb_strtolower((string) $p->sku)') && prodCtrl.includes('$existing->put('));
  check('Import : quantité JAMAIS sur mise à jour ; création = stock initial + mouvement IN « Import CSV » (miroir store)',
    prodCtrl.includes("'quantity' => 0, // passe par un mouvement") && prodCtrl.includes("'reason' => 'Import CSV'")
      && !/if \(\$product\) \{[\s\S]{0,700}'quantity' =>/.test(prodCtrl.split('if ($product) {')[1]?.split('} else {')[0] ?? ''));
  check('Import : catégories/fournisseurs par nom (ci) — créés SEULEMENT si create_missing, sinon erreur de ligne',
    prodCtrl.includes("$request->boolean('create_missing')") && prodCtrl.includes("Category::create(['name' => $catName])")
      && prodCtrl.includes('Catégorie inconnue') && prodCtrl.includes('Fournisseur inconnu'));
  check('Import : rapport {created, updated, errors:[{line, sku, message}]} — line = ligne RÉELLE du fichier (+2)',
    prodCtrl.includes("$line = $i + 2;") && prodCtrl.includes("'created' => $created,") && prodCtrl.includes("'errors' => $errors,"));

  const setting = readApi('app/Support/Setting.php');
  const settingCtrl = readApi('app/Http/Controllers/Api/SettingController.php');
  check('Échéancier : réglage TEXTS credit_schedule (0 migration) + règle JSON EXPLICITE dans SettingController (leçon v2.11)',
    setting.includes("'credit_schedule' => ''") && settingCtrl.includes("$rules['credit_schedule']") && settingCtrl.includes('échéancier doit être un JSON valide'));
  const cusCtrl = readApi('app/Http/Controllers/Api/CustomerController.php');
  check('Échéancier : clés additives index (payment_dates / next_payment_date / days_until) + planFor normalisé (strict, dédoublonné, trié, J±n signé)',
    cusCtrl.includes("'next_payment_date' => $plan['next'],") && cusCtrl.includes("'days_until' => $plan['days_until'],")
      && cusCtrl.includes("preg_match('/^\\d{4}-\\d{2}-\\d{2}$/'") && cusCtrl.includes('sort($dates);'));
  check('Échéancier : update accepte payment_plan SEUL (name « sometimes », ≤ 12 dates Y-m-d) → Setting::set, [] = retirer ; show + update renvoient la clé additive',
    cusCtrl.includes("'name' => ['sometimes', 'required'") && cusCtrl.includes("'payment_plan' => ['nullable', 'array', 'max:12']")
      && cusCtrl.includes("'payment_plan.*' => ['date_format:Y-m-d']") && cusCtrl.includes("Setting::set('credit_schedule'")
      && cusCtrl.includes('unset($schedule[$customer->id]') && (cusCtrl.match(/'payment_plan' => \$this->planFor/g) ?? []).length === 2);

  const cmd = readApi('app/Console/Commands/CreditsRemindEmail.php');
  const mail = readApi('app/Mail/CreditReminderMail.php');
  const blade = readApi('resources/views/emails/credit_reminder.blade.php');
  check('Email : rappel J−1 — plannedRows (demain OU retard, solde > 0 via SUM groupé, retards d\'abord, 15 max) + PAS de retour prématuré si seuls planifiés',
    cmd.includes('private function plannedRows()') && cmd.includes('$oldCredits->isEmpty() && $planned === []')
      && cmd.includes('SUM(total - amount_paid) as due') && cmd.includes('usort('));
  check('Email : Mailable planned additif (= [] par défaut) + sujet conditionnel + section blade gardée @if(!empty($planned)) + section anciens gardée @if($count > 0)',
    mail.includes('public array $planned = []') && mail.includes('$this->count > 0')
      && blade.includes('@if (!empty($planned))') && blade.includes('@if ($count > 0)') && blade.includes('demain (J−1)'));

  /* ============ 📥 PC : parseur CSV (module RÉEL, exécuté) ============ */
  console.log('\n— 📥 PC : parseur csvimport.js (module RÉEL, exécuté) —');
  {
    const C = window.CsvImport;
    check('num() : « 1 500 F » → 1500 · « 1500 FCFA » → 1500 · « 1.500,50 » → 1500.5 · vide → null',
      C.num('1 500 F') === 1500 && C.num('1500 FCFA') === 1500 && C.num('1.500,50') === 1500.5 && C.num('') === null && C.num('abc') === null);
    const exportTxt = '﻿ID;Nom;SKU;Code-barres;Catégorie;Fournisseur;Prix achat;Prix vente;Quantité;Seuil alerte;Valeur stock\r\n'
      + '7;Savon Dettol;SAV-1;6001234;Hygiène;Sotuba;500;800;12;3;9600\n'
      + '9;Riz 5kg;RIZ-5;;Alimentaire;;4 200;5 100;20;5;84000\n';
    const r1 = C.parseProductsCsv(exportTxt);
    check('Re-import direct du fichier « Export produits » StockFlow : 2 lignes, TOUTES colonnes mappées, ID & Valeur stock ignorés, BOM + \\r\\n gérés',
      r1.rows.length === 2 && r1.errors.length === 0 && r1.ignored.includes('ID') && r1.ignored.includes('Valeur stock')
        && r1.rows[0].barcode === '6001234' && r1.rows[0].category === 'Hygiène' && r1.rows[1].purchase_price === 4200 && r1.rows[1].alert_threshold === 5);
    const r2 = C.parseProductsCsv('name,sku,purchase_price,sale_price,quantity\n"Savon, le bon",SAV-2,500,800,4\n"Huile ""pure""",HUI-1,900,1200,6');
    check('CSV anglais (virgule) + champs entre guillemets (séparateur & "" échappé à l\'intérieur)',
      r2.rows.length === 2 && r2.rows[0].name === 'Savon, le bon' && r2.rows[1].name === 'Huile "pure"' && r2.rows[1].quantity === 6);
    const r3 = C.parseProductsCsv('Nom;SKU;Prix achat;Prix vente\nSavon;SAV-1;500;800\n;SANS-NOM;1;2\nDoublon;SAV-1;1;2\nHuile;HUI-1;abc;2');
    check('Erreurs PAR LIGNE (numéro = ligne fichier) : nom requis (l.3), SKU dupliqué (l.4 exclu), prix illisible (l.5) — les valides passent',
      r3.rows.length === 1 && r3.rows[0].sku === 'SAV-1'
        && r3.errors.some((e) => e.line === 3 && e.message === 'required')
        && r3.errors.some((e) => e.line === 4 && e.message.startsWith('duplicate'))
        && r3.errors.some((e) => e.line === 5 && e.message.startsWith('purchase_price')));
    const r4 = C.parseProductsCsv('Prix;Truc\n1;2');
    check('En-têtes sans « Nom »/« SKU » → erreur fatale « headers » (aucune ligne produite) ; texte vide → « empty »',
      r4.rows.length === 0 && r4.errors[0]?.message === 'headers' && C.parseProductsCsv('   ').errors[0]?.message === 'empty');
  }

  /* ============ 🖥 PC : écran Produits RÉEL monté (modale import) ============ */
  console.log('\n— 🖥 PC : écran Produits RÉEL monté (import CSV) —');
  {
    const view = el('div');
    await Screens.products(view);
    await sleep(80); // cats+suppliers puis load() — fire & forget (leçon v2.11)
    const impBtn = findAll(view, (n) => n.tagName === 'button' && allText(n).includes('Importer'))[0];
    check('Produits : bouton « 📥 Importer » présent dans l\'en-tête (à côté de 🏷️ Étiquettes)',
      !!impBtn && norm(allText(view)).includes('Étiquette'));
    impBtn._handlers.click();
    await sleep(30);
    const paste = findAll(document.body, (n) => n.tagName === 'textarea')[0];
    const txt0 = norm(allText(document.body));
    check('Modale ouverte : consigne format + case « créer inconnus » COCHÉE par défaut + zone d\'aperçu vide (invite)',
      txt0.includes('Export produits') && txt0.includes('catégories/fournisseurs inconnus') && !!paste
        && findAll(document.body, (n) => n.attrs?.type === 'checkbox')[0]?.checked === true
        && txt0.includes('aperçu'));
    paste.value = 'Nom;SKU;Prix achat;Prix vente;Quantité\nSavon Dettol;SAV-1;500;800;12\nRiz 5kg;RIZ-5;4 200;5 100;20\nSavon Lux;SAV-2;300;1000;500';
    paste._handlers.input();
    await sleep(260); // debounce 200 ms
    const txt1 = norm(allText(document.body));
    check('Collage → aperçu temps réel : 3 lignes valides + extrait « Savon Dettol (SAV-1) — 800 F · ×12 »',
      txt1.includes('Savon Dettol (SAV-1)') && txt1.includes('×12'));
    const go = findAll(document.body, (n) => n.tagName === 'button' && allText(n).includes('Importer dans le catalogue'))[0];
    const callsBefore = apiCalls.filter((c) => c.url.includes('/products?') || c.url.endsWith('/products')).length;
    go._handlers.click();
    await sleep(60);
    const impCall = apiCalls.find((c) => c.url.includes('/products/import'));
    check('Clic « Importer » → POST /products/import {rows:[3 lignes complètes], create_missing:1} ENVOYÉ',
      impCall?.method === 'POST' && impCall.body.create_missing === 1 && impCall.body.rows.length === 3
        && impCall.body.rows[1].purchase_price === 4200 && impCall.body.rows[1].sale_price === 5100 && impCall.body.rows[2].quantity === 500);
    const txt2 = norm(allText(document.body));
    check('Rapport rendu : « ✅ 2 créé(s) · 1 mis à jour · 1 erreur(s) » + ligne d\'erreur 4 (BAD-1) + catalogue rechargé en arrière-plan',
      txt2.includes('2 créé(s)') && txt2.includes('1 mis à jour') && txt2.includes('BAD-1')
        && apiCalls.filter((c) => c.url.includes('/products?') || c.url.endsWith('/products')).length > callsBefore);
  }

  /* ============ 🖥 PC : Clients — badges & échéancier (écran RÉEL monté) ============ */
  console.log('\n— 💳 PC : Clients — badges échéances & carte échéancier (écran RÉEL) —');
  {
    serverHasPlan = true;
    const view = el('div');
    await Screens.customers(view);
    await sleep(60);
    const txt = norm(allText(view));
    check('Liste : badges 📅 couleurs — « 7 j de retard » (Awa), « demain » (Modibo), « dans 10 j » (Fatou)',
      txt.includes('7 j de retard') && txt.includes('demain') && txt.includes('dans 10 j'));
    check('Liste : Sekou soldé (crédit 0) → badge masqué malgré une date planifiée (on ne relance pas un client à jour)',
      !txt.includes('dans 3 j'));
    // Détail Awa (ligne cliquable) → carte échéancier
    const row = findAll(view, (n) => n._handlers?.click && allText(n).includes('Awa Diallo'))[0];
    row._handlers.click();
    await sleep(60);
    const txtD = norm(allText(document.body));
    check('Détail : carte Échéancier affichée — titre + consigne rappel J−1 + chips 10/07/2026 et 01/08/2026 + champ date',
      txtD.includes('Échéancier') && txtD.includes('rappel automatique la veille') && txtD.includes('10/07/2026') && txtD.includes('01/08/2026')
        && !!findAll(document.body, (n) => n.attrs?.type === 'date')[0]);
    // Ajout d'une date via le champ → PUT payment_plan complet
    const dateInput = findAll(document.body, (n) => n.attrs?.type === 'date')[0];
    dateInput.value = '2026-07-26';
    const addBtn = findAll(document.body, (n) => n.tagName === 'button' && allText(n).includes('Ajouter'))[0];
    addBtn._handlers.click();
    await sleep(60);
    const put = apiCalls.find((c) => c.method === 'PUT' && c.url.includes('/customers/1'));
    check('Ajout → PUT /customers/1 avec payment_plan COMPLET trié [10/07, 26/07, 01/08] (SANS name — partiel v2.13)',
      put?.body !== null && !('name' in put.body) && JSON.stringify(put.body.payment_plan) === JSON.stringify(['2026-07-10', '2026-07-26', '2026-08-01']));
    check('Après PUT : chips rafraîchies depuis la réponse (3 dates dont 26/07/2026) + toast « Échéancier enregistré »',
      norm(allText(document.body)).includes('26/07/2026') && toasts.some((x) => x.msg.includes('Échéancier enregistré')));
    // 💳 Vieux serveur : clé absente → carte masquée, liste sans badge, écran intact
    serverHasPlan = false;
    document.body.children = [];
    const view0 = el('div');
    await Screens.customers(view0);
    await sleep(60);
    const txt0 = norm(allText(view0));
    check('Vieux serveur : liste AUCUN badge 📅 (clés absentes) + écran Clients intact — zéro régression',
      !txt0.includes('de retard') && !txt0.includes('demain') && txt0.includes('Awa Diallo'));
    const row0 = findAll(view0, (n) => n._handlers?.click && allText(n).includes('Awa Diallo'))[0];
    row0._handlers.click();
    await sleep(60);
    check('Vieux serveur : carte Échéancier MASQUÉE dans le détail (clé payment_plan absente) — reste de la fiche intact',
      !norm(allText(document.body)).includes('Échéancier') && norm(allText(document.body)).includes('Awa Diallo'));
    serverHasPlan = true;
  }

  /* ============ 🖥 PC : notif du matin (module RÉEL exécuté) ============ */
  console.log('\n— 💳 PC : automation.maybeDailyCreditDue (module RÉEL) —');
  {
    check('Automation : OFF par défaut → \'off\' (aucun appel réseau)',
      await window.Auto.maybeDailyCreditDue(TODAY) === 'off');
    window.Auto.set({ creditdue: true });
    localStorage.setItem('sfpc.creditdue.v1', TODAY);
    check('Automation : déjà notifié aujourd\'hui → \'same\' (1×/jour max)',
      await window.Auto.maybeDailyCreditDue(TODAY) === 'same');
    store.delete('sfpc.creditdue.v1');
    const n0 = notifFires.length;
    check('Automation : 2 clients avec échéance ≤ demain + solde > 0 (Awa −7 j, Modibo demain) → \'sent\' + notif « 2 échéance(s) crédit », Fatou J−10 exclue',
      await window.Auto.maybeDailyCreditDue(TODAY) === 'sent' && notifFires.length === n0 + 1
        && notifFires[n0].title.includes('2 échéance(s) crédit'));
    check('Automation : marqueur posé même quand AUCUNE échéance (re-marqueur « same » au 2ᵉ appel — pas de spam)',
      await window.Auto.maybeDailyCreditDue(TODAY) === 'same');
    store.delete('sfpc.creditdue.v1');
    serverHasPlan = false; // vieux serveur : days_until absent → rien à signaler
    check('Automation : vieux serveur (clés absentes) → \'none\' proprement, aucune notif',
      await window.Auto.maybeDailyCreditDue('2026-07-18') === 'none');
    customersFail = true;
    store.delete('sfpc.creditdue.v1');
    check('Automation : panne réseau → \'failed\' et marqueur NON avancé (retentative au prochain boot)',
      await window.Auto.maybeDailyCreditDue('2026-07-19') === 'failed' && localStorage.getItem('sfpc.creditdue.v1') !== '2026-07-19');
    customersFail = false; serverHasPlan = true;
    check('Câblage : pref « creditdue » dans les défauts + exposée au return + toggle Réglages + appel boot 12 s',
      window.Auto.get().creditdue === true && typeof window.Auto.maybeDailyCreditDue === 'function'
        && read('src/js/screens/settings.js').includes("'creditdue')")
        && read('src/js/app.js').includes('maybeDailyCreditDue?.()'));
  }

  /* ============ 📱 Mobile v24 (miroir exécuté + statique) ============ */
  console.log('\n— 📱 Mobile v24 : import & échéancier (utilitaire RÉEL + statique) —');
  {
    const msrc = readApp('src/utils/csvImport.js').replace(/^export /gm, '');
    const M = vm.runInThisContext(`(() => { ${msrc}; return { parseProductsCsv, normHead, num }; })()`);
    const same = '﻿ID;Nom;SKU;Code-barres;Catégorie;Prix achat;Prix vente;Quantité;Seuil alerte;Valeur stock\n7;Savon;SAV-1;6001234;Hygiène;500;800;12;3;9600';
    const mRows = M.parseProductsCsv(same);
    const pcRows = window.CsvImport.parseProductsCsv(same);
    check('csvImport mobile EXÉCUTÉ : miroir strict du PC (même fichier → résultats identiques)',
      JSON.stringify(mRows) === JSON.stringify(pcRows) && mRows.rows[0].barcode === '6001234');
    const ps = readApp('src/screens/ProductsScreen.js');
    check('ProductsScreen mobile : bouton 📥 + modale collage (TextInput multiline) + POST rows.slice(0,300) + create_missing chip + reload ensuite',
      ps.includes("parseProductsCsv } from '../utils/csvImport'") && ps.includes("setImpOpen(true)") && ps.includes('multiline')
        && ps.includes("api.post('/products/import'") && ps.includes('rows: impPreview.rows.slice(0, 300)') && ps.includes('setImpCreate((v) => !v)')
        && ps.includes('reload();'));
    const cd = readApp('src/screens/CustomerDetailScreen.js');
    check('CustomerDetailScreen mobile : carte gardée par la clé additive (undefined → masquée) + PUT payment_plan (nom non envoyé) + chips ✕ filtrent + raccourcis +7/+15/+30 + AAAA-MM-JJ validée',
      cd.includes('sp === undefined ? null') && cd.includes("api.put(`/customers/${customerId}`, { payment_plan: dates })")
        && cd.includes('.filter((x) => x !== d)') && cd.includes('[7, 15, 30].map') && cd.includes('/^\\d{4}-\\d{2}-\\d{2}$/.test(d)'));
    const cs = readApp('src/screens/CustomersScreen.js');
    check('CustomersScreen mobile : badge coloré (retard danger / demain warning / futur muted) + soldé = masqué (credit_balance > 0 exigé)',
      cs.includes('pl_due_late') && cs.includes('pl_due_tomorrow') && cs.includes('pl_due_in')
        && cs.includes('item.next_payment_date == null || Number(item.credit_balance ?? 0) <= 0'));
  }

  /* ============ 🌍 i18n & version ============ */
  console.log('\n— 🌍 i18n & version —');
  const trRaw = readApp('src/i18n/translations.js');
  const frK = kms((trRaw.match(/export const fr = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const enK = kms((trRaw.match(/export const en = \{([\s\S]*?)\n\};?/) ?? [])[1] ?? '');
  const VM = ['imp_open', 'imp_title', 'imp_done', 'imp_create_missing', 'pl_title', 'pl_none', 'pl_due_late'];
  check('traductions mobile : ≥734 FR/EN + parité parfaite + clés v24 ×2',
    frK.size >= 734 && enK.size >= 734 && ![...frK].some((k) => !enK.has(k)) && ![...enK].some((k) => !frK.has(k))
      && VM.every((k) => frK.has(k) && enK.has(k)));
  const pcSrc = read('src/js/i18n.js');
  const pcFr = kms((pcSrc.match(/const fr = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const pcEn = kms((pcSrc.match(/const en = \{([\s\S]*?)\n  \};?/) ?? [])[1] ?? '');
  const V13 = ['imp_open', 'imp_headers_ko', 'imp_done', 'pl_title', 'pl_saved', 'pl_due_tomorrow', 'ap_creditdue', 'ap_creditdue_body'];
  check('i18n PC : ≥776 FR/EN, parité parfaite + clés v2.13 ×2',
    pcFr.size >= 776 && pcEn.size >= 776 && ![...pcFr].some((k) => !pcEn.has(k)) && ![...pcEn].some((k) => !pcFr.has(k))
      && V13.every((k) => pcFr.has(k) && pcEn.has(k)));
  check('version PC ≥ v2.13 + csvimport.js chargé dans index.html',
    /APP_VERSION: 'StockFlow PC v2\.(1[3-9]|[2-9][0-9])'/.test(read('src/js/config.js'))
      && read('src/index.html').includes('<script src="js/csvimport.js"></script>'));

  console.log(`\nRÉSULTAT v2.13 : ${pass} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
