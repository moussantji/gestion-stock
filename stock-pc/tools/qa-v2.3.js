// ============================================================
// 🧪 QA StockFlow PC v2.3 (PÉRENNE, dans le repo)
// 📧 bilan hebdo par email · ⚖️ comparatif vendeurs · 🏷️ rafale d'étiquettes
// Lancement : node tools/qa-v2.3.js   (depuis stock-pc/)
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, '..', 'stock-api');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readApi = (p) => fs.readFileSync(path.join(API, p), 'utf8');
const run = (src, name) => vm.runInThisContext(src, { filename: name });

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
const posts = [];
const pdfCalls = [];
let weeklyThrows = false;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (opts.method === 'POST') {
    posts.push({ url: u, body: opts.body ? JSON.parse(String(opts.body)) : {} });
    if (weeklyThrows) return { ok: false, status: 422, json: async () => ({ message: 'boss_email manquant' }) };
    return ok({ data: { to: 'patron@shop.ml', queued: false } });
  }
  if (u.includes('/accounting/summary')) {
    return ok({ data: { month: null, range: ['2026-07-06', '2026-07-12'],
      receipts: { count: 9, total: 420000, paid: 400000, points_discount: 0, refunds_total: 0 },
      cash: { in: 5000, out: 3000, ops: 4 },
      closings: { count: 6, sales: 410000, end_balance: 199000, days: [] } } });
  }
  if (u.includes('/stats/sales')) {
    return ok({ period: '30d',
      totals: { revenue: 500000, receipts: 12, items: 30, avg_basket: 41666 },
      products: [], categories: [],
      sellers: [
        { user_id: 1, name: 'Awa', receipts_count: 7, items: 18, revenue: 350000, avg_basket: 50000, share: 70 },
        { user_id: 2, name: 'Modibo', receipts_count: 5, items: 12, revenue: 150000, avg_basket: 30000, share: 30 },
      ] });
  }
  if (u.includes('/stats/margins')) return ok(null);
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  return ok({ data: [] });
};
global.sfpc = {
  thermal: { list: async () => [],
    printNet: async (o) => { netCalls.push(o); return true; },
    printSilent: async (o) => { silentCalls.push(o); return true; } },
  pdf: { save: async (o) => { pdfCalls.push(o); return { saved: true, path: '/Rapports/' + o.defaultName, data64: 'QUJD' }; } },
  file: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.name }) },
  isElectron: true,
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js', 'src/js/ui.js', 'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', 'src/js/automation.js', 'src/js/notifier.js', 'src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
const toasts = [];
UI.toast = (msg, color, ms) => { toasts.push({ msg: String(msg ?? ''), color, ms }); };
UI.confirm = async () => true;

let pass = 0; let ko = 0;
const check = (label, cond) => { if (cond) { pass++; console.log('  OK  ' + label); } else { ko++; console.log('  KO  ' + label); } };
const hasBytes = (arr, seq) => arr.join(',').includes(seq.join(','));
const asStr = (arr) => arr.map((c) => String.fromCharCode(c)).join('');
const countBytes = (arr, seq) => arr.join(',').split(seq.join(',')).length - 1;

(async () => {
  console.log('\n— 📧🧮 Backend : bilan hebdo par email (lundi matin) —');
  const mail = readApi('app/Mail/WeeklyRecapMail.php');
  check('WeeklyRecapMail ShouldQueue + sujet avec plage + CA + boutique', mail.includes('ShouldQueue') && mail.includes('Bilan hebdo') && mail.includes('number_format'));
  check('PDF joint fromData nommé bilan-hebdo-<from>_au_<to>.pdf', mail.includes('fromData') && mail.includes('bilan-hebdo-{$this->from}_au_{$this->to}.pdf'));
  const blade = readApi('resources/views/emails/weekly_recap.blade.php');
  check('blade : chiffres clés (recap) + meilleure journée + pièce jointe mentionnée', blade.includes("$recap['receipts']") && blade.includes('$bestDay') && blade.includes("bilan-hebdo-{{ $from }}_au_{{ $to }}.pdf"));
  const ac = readApi('app/Http/Controllers/Api/AccountingExportController.php');
  check('emailWeekly : validations from/to (after_or_equal) + 367 j + %PDF + 422 boss_email', ac.includes("function emailWeekly") && ac.includes('after_or_equal:from') && ac.includes('367 * 86400') && ac.includes('%PDF') && ac.includes("getText('boss_email')"));
  check('récap factorisé : recapData privé réutilisé par summary ET emailWeekly (zéro duplication)', (ac.match(/recapData\(/g) ?? []).length >= 3 && ac.includes('$this->recapData($request, $from, $to, $range)') && ac.includes('$this->recapData($request, "{$range[0]} 00:00:00"'));
  check('meilleure journée calculée (sortByDesc sales_collected, hors jours à 0)', ac.includes("sortByDesc('sales_collected')") && ac.includes('$bestDay'));
  check('envoi queue avec repli synchrone', (ac.match(/->queue\(\$mail\)/g) ?? []).length === 2 && (ac.match(/->send\(\$mail\)/g) ?? []).length === 2);
  check('route POST /accounting/email-weekly (admin/manager)', readApi('routes/api.php').includes("Route::post('/accounting/email-weekly'"));

  console.log('\n— 🤖 Toggle 11 : email hebdo enchaîné au bilan —');
  check('préf weeklyemail OFF par défaut', window.Auto.get().weeklyemail === false);
  check('emailWeekly désactivé → off', (await window.Auto.emailWeekly('2026-07-06', '2026-07-12', { data64: 'QUJD' })) === 'off');
  window.Auto.set({ weeklyemail: true });
  toasts.length = 0;
  check('sans data64 → no-data + toast warning', (await window.Auto.emailWeekly('2026-07-06', '2026-07-12', { saved: true })) === 'no-data' && toasts.at(-1).color === 'var(--warning)');
  posts.length = 0; toasts.length = 0;
  const rE = await window.Auto.emailWeekly('2026-07-06', '2026-07-12', { data64: 'QUJD' });
  check('→ POST /accounting/email-weekly {from,to,pdf} + toast succès', rE === 'sent' && posts.some((p) => p.url.includes('/accounting/email-weekly') && p.body.from === '2026-07-06' && p.body.to === '2026-07-12' && p.body.pdf === 'QUJD') && toasts.some((x) => x.color === 'var(--success)'));
  weeklyThrows = true; toasts.length = 0;
  check('422 serveur → failed + toast danger', (await window.Auto.emailWeekly('2026-07-06', '2026-07-12', { data64: 'QUJD' })) === 'failed' && toasts.some((x) => x.color === 'var(--danger)'));
  weeklyThrows = false;
  window.Auto.set({ weekly: true, weeklyprint: false, weeklyemail: true });
  store.set('sfpc.auto_weekly.v1', '2026-W28');
  posts.length = 0; pdfCalls.length = 0;
  const rW = await window.Auto.maybeAutoWeekly('2026-07-15');
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); // fire & forget : laisser partir
  check('bilan auto : PDF saved + EMAIL hebdo enchaîné', rW === 'saved' && pdfCalls.length === 1 && posts.some((p) => p.url.includes('/accounting/email-weekly')));
  window.Auto.set({ weekly: false, weeklyemail: false });

  console.log('\n— ⚖️ Comparatif vendeurs multi-postes (stats) —');
  run(read('src/js/screens/stats.js'), 'stats.js');
  const vS = el('div');
  await Screens.stats(vS);
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  const txt = (n) => (n?.nodeType === 3 ? (n.text ?? '') : (n?.textContent ?? '')) + ' ' + (n?.children ?? []).map(txt).join(' ');
  const all = txt(vS);
  check('≥ 2 vendeurs → carte comparatif affichée (médailles + noms)', all.includes('Comparatif vendeurs') && all.includes('🥇') && all.includes('Awa') && all.includes('Modibo'));
  check('chiffres par vendeur : 7 ventes · 18 articles · 70 %', all.includes('7') && all.includes('18') && all.includes('70 %'));
  const statsSrc = read('src/js/screens/stats.js');
  check('masquée si < 2 vendeurs + repli « — » clés absentes (ancien serveur)', statsSrc.includes('sellers.length >= 2') && statsSrc.includes("? '—' : v"));

  console.log('\n— 🏷️ Rafale d\'étiquettes thermiques —');
  const T = window.Thermal;
  const SHOP = { name: 'Épicerie Marième' };
  const P = [
    { name: 'Riz 5kg', sale_price: 5000, barcode: 'ART-001' },
    { name: 'Huile 1L', sale_price: 2500 },
    { name: 'Sucre 1kg', sale_price: 900, barcode: 'ART-003' },
  ];
  const bb = T.buildLabelsBytes(P, SHOP);
  check('binaire : 3 étiquettes concaténées (3× init ESC@ + 3× coupe)', countBytes(bb, [0x1B, 0x40]) === 3 && countBytes(bb, [0x1D, 0x56, 0x41, 0x05]) === 3);
  check('binaire : 2 CODE128 (produits avec code) + prix affichés', countBytes(bb, [0x1D, 0x6B, 0x49]) === 2 && asStr(bb).includes('{BART-001') && asStr(bb).includes('{BART-003') && asStr(bb).includes('2 500'));
  const bh = T.buildLabelsHtml(P, SHOP);
  check('HTML : 2 sauts de page (3 étiquettes) + noms', (bh.match(/page-break-before/g) ?? []).length === 2 && bh.includes('Huile 1L'));
  let err0 = null;
  try { await T.printLabels([]); } catch (e) { err0 = e.message; }
  check('liste vide → erreur propre (p_none)', err0 === I18n.t('p_none'));
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'off' }));
  let err1 = null;
  try { await T.printLabels(P); } catch (e) { err1 = e.message; }
  check('mode off → erreur config', err1 === I18n.t('th_cfg_needed'));
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'net', ip: '192.168.1.50', port: 9100 }));
  netCalls.length = 0;
  await T.printLabels(P);
  check('net → UN SEUL socket avec les 3 étiquettes (pas 3 impressions)', netCalls.length === 1 && countBytes(netCalls[0].payload, [0x1B, 0x40]) === 3);
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'sys', deviceName: 'POS-80' }));
  silentCalls.length = 0;
  await T.printLabels(P);
  check('système → UN seul printSilent multi-pages', silentCalls.length === 1 && (silentCalls[0].html.match(/page-break-before/g) ?? []).length === 2);
  const prodSrc = read('src/js/screens/products.js');
  // 📝 pérennisé v2.5 : la confirmation s'est enrichie d'une modale quantité (openBurstQty) — l'esprit du check reste
  check('produits.js : bouton rafale (thermique configurée) + lastItems + choix quantité + printLabels', prodSrc.includes('renderBurstBtn') && prodSrc.includes('lastItems') && prodSrc.includes('openBurstQty') && prodSrc.includes('Thermal.printLabels(list') && prodSrc.includes('isConfigured'));

  console.log('\n— Réglages & version —');
  run(read('src/js/screens/settings.js'), 'settings.js');
  const vSet = el('div');
  await Screens.settings(vSet);
  await new Promise((r) => setImmediate(r));
  let cbs = 0;
  (function countCb(n) { (n.children ?? []).forEach((c) => { if (c?.attrs?.type === 'checkbox') cbs++; countCb(c); }); })({ children: vSet.children });
  check('≥ 11 interrupteurs auto (dont weeklyemail)', cbs >= 11 && read('src/js/screens/settings.js').includes("'weeklyemail'"));
  check('version ≥ v2.3 (pérennisé : non épinglé)', /StockFlow PC v\d/.test(read('src/js/config.js')));
  const i18nSrc = read('src/js/i18n.js');
  check('clés v2.3 dans i18n', ['st_vs_title', 'st_vs_sub', 'st_share', 'lb_burst', 'lb_burst_confirm', 'lb_burst_done', 'ap_weeklyemail', 'ap_weeklyemail_sub'].every((k) => (i18nSrc.match(new RegExp(k + ':', 'g')) ?? []).length === 2));
  check('ap_beep_sub toujours présente (surveillance)', (i18nSrc.match(/ap_beep_sub:/g) ?? []).length === 2);

  console.log('\nRÉSULTAT v2.3 : ' + pass + ' OK / ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
