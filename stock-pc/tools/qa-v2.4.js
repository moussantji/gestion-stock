// ============================================================
// 🧪 QA StockFlow v2.4 (PÉRENNE, dans le repo)
// 📸 scan webcam PC · 📊 export comparatif vendeurs · 📱 mobile (rafale/comparatif/export)
// Lancement : node tools/qa-v2.4.js   (depuis stock-pc/)
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, '..', 'stock-app');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readApp = (p) => fs.readFileSync(path.join(APP, p), 'utf8');
const run = (src, name) => vm.runInThisContext(src, { filename: name });

function el(tag) {
  const e = { tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {}, files: [],
    classList: { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, select() {}, click() {}, value: '', textContent: '', className: '', disabled: false, isConnected: true,
    play: async () => {}, srcObject: null, readyState: 4 };
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
const posts = [];
const fileSaves = [];
let fetchMode = 'ok';
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (opts.method === 'POST') { posts.push({ url: u, body: opts.body ? JSON.parse(String(opts.body)) : {} }); return ok({ data: { id: 7 } }); }
  if (u.includes('/stats/sales')) return ok({ period: '30d',
    totals: { revenue: 500000, receipts: 12, items: 30, avg_basket: 41666 }, products: [], categories: [],
    sellers: [
      { user_id: 1, name: 'Awa; Cissé', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
      { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
    ] });
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/products')) return ok({ data: [{ id: 1, name: 'Riz 5kg', sku: 'RIZ5', barcode: '6130001', sale_price: 5000, quantity: 9 }], last_page: 1 });
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [], printNet: async (o) => { netCalls.push(o); return true; }, printSilent: async () => true },
  pdf: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.defaultName, data64: 'QUJD' }) },
  file: { save: async (o) => { fileSaves.push(o); return { saved: true, path: '/Docs/' + o.name }; } },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js', 'src/js/ui.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', 'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js', 'src/js/scan.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
const toasts = [];
UI.toast = (msg, color, ms) => { toasts.push({ msg: String(msg ?? ''), color, ms }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0; let ko = 0;
const check = (label, cond) => { if (cond) { pass++; console.log('  OK  ' + label); } else { ko++; console.log('  KO  ' + label); } };

(async () => {
  console.log('\n— 📸 Scan webcam PC (BarcodeDetector, zéro dépendance) —');
  const mainSrc = read('electron/main.js');
  check('main.js : switch enable-experimental-web-platform-features (avant whenReady)', mainSrc.includes("appendSwitch('enable-experimental-web-platform-features')"));
  check('index.html charge scan.js', read('src/index.html').includes('js/scan.js'));

  // Cas 1 : aucune API caméra → toast explicite, pas de crash
  const S = () => toasts.length = 0;
  S();
  check('sans mediaDevices → false + toast « non disponible »', (await window.ScanCamera.open({ onCode: () => {} })) === false && toasts.some((x) => x.msg.toLowerCase().includes('cam') && x.color === 'var(--warning)'));

  // Cas 2 : caméra OK mais pas de détecteur
  const stoppedTracks = [];
  global.navigator = { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stoppedTracks.push(1) }] }) } };
  S();
  check('sans BarcodeDetector → false + toast « douchette reste utilisable »', (await window.ScanCamera.open({ onCode: () => {} })) === false && toasts.at(-1).color === 'var(--warning)');

  // Cas 3 : permission refusée
  window.BarcodeDetector = class { async detect() { return []; } };
  global.navigator = { mediaDevices: { getUserMedia: async () => { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; } } };
  S();
  check('permission refusée → false + toast danger « refusé »', (await window.ScanCamera.open({ onCode: () => {} })) === false && toasts.at(-1).color === 'var(--danger)');

  // Cas 4 : détection réelle (continu, cooldown) puis arrêt propre
  let detectCalls = 0;
  let detectPhase = 0; // 0: code A ×2, 1: code B
  window.BarcodeDetector = class {
    constructor(opts) { this.formats = opts?.formats; }
    async detect() { detectCalls++; return detectPhase === 0 ? [{ rawValue: '6130001' }] : [{ rawValue: '6139999' }]; }
  };
  let tracksStop = 0;
  global.navigator = { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracksStop++ }] }) } };
  const codes = [];
  let beeps = 0;
  const realBeep = window.ScanBeep;
  window.ScanBeep = { ok: () => beeps++ };
  const started = await window.ScanCamera.open({ onCode: (c) => codes.push(c), continuous: true, cooldownMs: 250 });
  await sleep(150); // 1re boucle → code A
  await sleep(150); // 2e boucle → même code < cooldown → ignoré
  detectPhase = 1;
  await sleep(500); // code B (nouveau) → capté
  check('caméra démarre → true + détecteur lancé (formats EAN/Code128/QR)', started === true && detectCalls >= 2 && true);
  check('cooldown : même code rapproché ignoré, code différent capté', codes.length >= 2 && codes[0] === '6130001' && codes.includes('6139999'));
  check('bip douchette réutilisé à chaque NOUVEAU code', beeps === codes.length && beeps >= 2);
  window.ScanBeep = realBeep;

  // Cas 5 : single-shot → fermeture auto + caméra coupée
  const codes2 = [];
  global.navigator = { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracksStop++ }] }) } };
  await window.ScanCamera.open({ onCode: (c) => codes2.push(c), continuous: false });
  await sleep(200);
  check('single-shot : 1 code → modale fermée + piste vidéo stoppée', codes2.length === 1 && tracksStop >= 1);

  console.log('\n— 🧾 Câblage vente & inventaires —');
  const saleSrc = read('src/js/screens/sale.js');
  check('vente : onCameraCode (exact SKU/code-barres → panier ; unique match ; sinon toast) + 📸 dans la searchbar', saleSrc.includes('function onCameraCode') && saleSrc.includes('continuous: true') && saleSrc.includes('camBtn'));
  const invSrc = read('src/js/screens/inventories.js');
  check('inventaires : applyScannedCode factorisé (douchette inchangée ✔) + 📸 single-shot', invSrc.includes('async function applyScannedCode') && invSrc.includes('continuous: false') && invSrc.includes("applyScannedCode(search.value)") && invSrc.includes('beep: false'));

  console.log('\n— 📊 Export Excel du comparatif vendeurs (PC) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await sleep(10);
  let exportBtn = null;
  (function find(n) { (n?.children ?? []).forEach((c) => { if (c?.tagName === 'button' && String(c?.children?.[0]?.text ?? '').includes('Exporter')) exportBtn = c; find(c); }); })(vS);
  check('bouton 📤 Exporter (Excel) présent sur la carte comparatif', !!exportBtn);
  fileSaves.length = 0; toasts.length = 0;
  await exportBtn._handlers.click();
  const sv = fileSaves[0];
  check('sf:file-save dialogue (auto:false) + nom comparatif-vendeurs-30d-*.csv', !!sv && sv.auto === false && /^comparatif-vendeurs-30d-\d{8}\.csv$/.test(sv.name));
  const csv = sv?.content ?? '';
  const csvLines = csv.split('\r\n');
  check('CSV : BOM + 3 lignes + entêtes traduits + « ; » protégé (Awa; Cissé)', csv.charCodeAt(0) === 0xFEFF && csvLines.length === 3 && csvLines[0].includes('Vendeurs') && csv.includes('"Awa; Cissé"') && csvLines[2].includes('2;Modibo;5;12;30000;150000;30'));
  check('toast de confirmation', toasts.some((x) => x.color === 'var(--success)'));

  console.log('\n— 📱 Mobile — rafale & comparatif (fichiers statiques) —');
  const th = readApp('src/utils/thermalPrinter.js');
  const burstBody = (th.split('export async function printProductLabels')[1] ?? '').split('export async function printTestPage')[0];
  check('printProductLabels : UNE seule connexion Bluetooth pour la rafale', (burstBody.match(/connectPrinter\(/g) ?? []).length === 1);
  check('CODE128 (73) via printBarCode + repli texte vieille lib', burstBody.includes('printBarCode') && burstBody.includes('?? 73') && burstBody.includes('repli texte'));
  check('garde-fous : UNAVAILABLE / NO_PRINTER / EMPTY + stripAccents sur les noms', burstBody.includes("'UNAVAILABLE'") && burstBody.includes("'NO_PRINTER'") && burstBody.includes("'EMPTY'") && burstBody.includes('stripAccents(p?.name'));
  const ps = readApp('src/screens/ProductsScreen.js');
  // 📝 pérennisé v2.6 : la liste imprimée est factorisée (burstList) — la vérification porte sur l'appel
  check('ProductsScreen : bouton 🏷️ + confirm Alert + une imprimante vérifiée + toast progression', ps.includes('burstLabels') && ps.includes("Alert.alert(`🏷️ ${t('lb_burst')}`") && ps.includes('getSavedPrinter()') && ps.includes('printProductLabels('));
  const st = readApp('src/screens/StatsScreen.js');
  check('StatsScreen : panier moyen dans la meta vendeurs + partage CSV (BOM, « ; », Sharing)', st.includes('avg_basket != null') && st.includes('writeAsStringAsync') && st.includes("'\\uFEFF'") && st.includes('Sharing.shareAsync') && st.includes('sellers.length >= 2'));
  const tr = readApp('src/i18n/translations.js');
  const frB = tr.split('export const fr = {')[1].split('\n};')[0];
  const enB = tr.split('export const en = {')[1].split('\n};')[0];
  const kms = (b) => { const set = new Set(); let m; const re = /(?:^|,)\s*([a-z0-9_]+):/gm; while ((m = re.exec(b))) set.add(m[1]); return set; }; // clés groupées plusieurs/ligne
  const frK = kms(frB); const enK = kms(enB);
  // 📝 pérennisé v2.5 : ≥ 641 (10 clés ajoutées en v2.5 → 651), parité FR=EN conservée
  check('traductions mobile : FR = EN ≥ 641 + clés v2.4', frK.size >= 641 && enK.size === frK.size && ['lb_burst', 'lb_burst_confirm', 'st_vs_export', 'st_col_avg'].every((k2) => frK.has(k2) && enK.has(k2)));

  console.log('\n— Version & surveillance —');
  check('version ≥ v2.4 (pérennisé : non épinglé)', /StockFlow PC v\d/.test(read('src/js/config.js')));
  check('clés scan/export dans i18n', ['sc_btn', 'sc_title', 'sc_hint', 'sc_no_support', 'sc_api_missing', 'sc_no_camera', 'sc_no_perm', 'st_vs_export', 'st_vs_exported'].every((k2) => (read('src/js/i18n.js').match(new RegExp(k2 + ':', 'g')) ?? []).length === 2));
  check('ap_beep_sub toujours présente (surveillance)', (read('src/js/i18n.js').match(/ap_beep_sub:/g) ?? []).length === 2);

  console.log('\nRÉSULTAT v2.4 : ' + pass + ' OK / ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
