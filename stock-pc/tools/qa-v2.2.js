// ============================================================
// 🧪 QA StockFlow PC v2.2 (PÉRENNE, dans le repo)
// 🔔 email crédits cron · 📊 comparatif boutiques · 🖨 bilan hebdo thermique
// Lancement : node tools/qa-v2.2.js   (depuis stock-pc/)
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
    classList: { _s: new Set(), add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    _handlers: {}, addEventListener(type, fn) { e._handlers[type] = fn; },
    append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, select() {}, click() {}, value: '', textContent: '', className: '', isConnected: true };
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

const pdfCalls = [];
const netCalls = [];
const summaryCalls = [];
let weeklyThrows = false;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (d) => ({ ok: true, status: 200, json: async () => d });
  if (u.includes('/accounting/summary')) {
    summaryCalls.push(u);
    if (weeklyThrows) return { ok: false, status: 500, json: async () => ({ message: 'boom' }) };
    return ok({ data: { month: null, range: ['2026-07-06', '2026-07-12'], receipts: { count: 9, total: 420000, paid: 400000, points_discount: 0, refunds_total: 0 }, cash: { in: 5000, out: 3000, ops: 4 }, closings: { count: 6, sales: 410000, end_balance: 199000, days: [ { date: '2026-07-06', sales_collected: 60000, total_in: 0, total_out: 0, balance: 150000, cashier: 'Awa' } ] } } });
  }
  if (u.includes('/shop')) return ok({ shop: { name: 'Épicerie Marième', my_shop: null } });
  if (u.includes('/receipts')) return ok({ data: [], last_page: 1 });
  return ok({ data: [] });
};
global.sfpc = { thermal: { list: async () => [],
    printNet: async (o) => { if (weeklyThrows) throw new Error('socket hang up'); netCalls.push(o); return true; },
    printSilent: async () => true },
  pdf: { save: async (o) => { pdfCalls.push(o); return { saved: true, path: '/Rapports/' + o.defaultName, data64: 'QUJD' }; } },
  file: { save: async (o) => ({ saved: true, path: '/Rapports/' + o.name }) },
  isElectron: true };

for (const f of ['src/js/config.js','src/js/i18n.js','src/js/format.js','src/js/api.js','src/js/ui.js','src/js/thermal.js','src/js/offline.js','src/js/report.js','src/js/automation.js','src/js/notifier.js','src/js/beep.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));
const toasts = [];
UI.toast = (msg, color, ms) => { toasts.push({ msg: String(msg ?? ''), color, ms }); };

let pass = 0; let ko = 0;
const check = (label, cond) => { if (cond) { pass++; console.log('  OK  ' + label); } else { ko++; console.log('  KO  ' + label); } };
const norm = (s) => String(s ?? '').replace(/[\u00A0\u202F ]/g, ' ');
const hasBytes = (arr, seq) => arr.join(',').includes(seq.join(','));
const asStr = (arr) => arr.map((c) => String.fromCharCode(c)).join('');

(async () => {
  console.log('\n— 🔔 Backend rappel email crédits anciens (cron quotidien) —');
  const cmd = readApi('app/Console/Commands/CreditsRemindEmail.php');
  check('commande credits:remind-email (namespace Console/Commands)', cmd.includes("signature = 'credits:remind-email'") && cmd.includes('class CreditsRemindEmail'));
  check('silencieuse si boss_email vide (no-op propre)', cmd.includes("boss_email vide") && cmd.includes('getText'));
  check('seuil boutique credit_reminder_days (défaut 7)', cmd.includes("Setting::get('credit_reminder_days', 7)"));
  check('requête : completed + reste > 0 + âge, plus anciens d’abord, 15 lignes', cmd.includes('whereColumn') && cmd.includes('->oldest()') && cmd.includes('take(15)'));
  check('envoi queue avec repli synchrone', cmd.includes('->queue($mail)') && cmd.includes('->send($mail)'));
  const cmdMail = readApi('app/Mail/CreditReminderMail.php');
  check('CreditReminderMail ShouldQueue + sujet avec encours', cmdMail.includes('ShouldQueue') && cmdMail.includes('crédit(s) de +'));
  check('vue credit_reminder.blade.php (tableau lignes + seuil mentionné)', fs.existsSync(path.join(API, 'resources/views/emails/credit_reminder.blade.php')) && readApi('resources/views/emails/credit_reminder.blade.php').includes('$rows'));
  check('planifiée 10:05 quotidienne (routes/console.php)', readApi('routes/console.php').includes("credits:remind-email')->dailyAt('10:05')"));

  console.log('\n— 📊 Comparatif multi-boutiques dans le pack jour —');
  const co = readApi('app/Http/Controllers/Api/CashOperationController.php');
  check('backend : sales_by_shop_today (groupBy shop_id + import Shop + repli Siège)', co.includes("'sales_by_shop_today'") && co.includes("groupBy('shop_id')") && co.includes('use App\\Models\\Shop;') && co.includes("'Siège'"));
  const closing = { id: 9, closing_date: '2026-07-17', sales_collected: 125000, total_in: 0, total_out: 0, balance: 212000, user: { name: 'Awa' } };
  const sumMulti = { sales_collected_today: 125000, sales_count_today: 7, sales_yesterday: 100000,
    sales_by_user_today: [ { name: 'Awa', count: 5, total: 90000 } ],
    sales_by_shop_today: [ { name: 'Siège ACI', count: 5, total: 90000 }, { name: 'Sotuba', count: 2, total: 35000 } ] };
  const pk = norm(window.StatReport.buildDayPackHtml({ closing, summary: sumMulti, shop: { name: 'Groupe Diarra' }, user: null, placeName: null }));
  check('≥ 2 boutiques → section comparatif (noms + montants + TOTAL)', pk.includes('Comparatif boutiques') && pk.includes('Siège ACI') && pk.includes('Sotuba') && pk.includes('90 000') && pk.includes('TOTAL'));
  const pk1 = norm(window.StatReport.buildDayPackHtml({ closing, summary: { ...sumMulti, sales_by_shop_today: [ { name: 'Siège ACI', count: 7, total: 125000 } ] }, shop: {}, user: null, placeName: null }));
  check('1 seule boutique → section masquée (pas de bruit)', !pk1.includes('Comparatif boutiques'));
  const pk0 = norm(window.StatReport.buildDayPackHtml({ closing, summary: sumMulti && { sales_collected_today: 0 }, shop: {}, user: null, placeName: null }));
  check('ancien serveur (clé absente) → masquée aussi', !pk0.includes('Comparatif boutiques'));

  console.log('\n— 🖨 Bilan hebdo sur la thermique —');
  const T = window.Thermal;
  const RECAP = { receipts: { count: 9, total: 420000, paid: 400000, points_discount: 2000, refunds_total: 5000 }, cash: { in: 5000, out: 3000, ops: 4 }, closings: { count: 6, end_balance: 199000, days: [ { date: '2026-07-06', sales_collected: 60000, total_in: 0, total_out: 0, balance: 150000, cashier: 'Awa' }, { date: '2026-07-07', sales_collected: 70000, total_in: 0, total_out: 0, balance: 160000, cashier: 'Modibo' } ] } };
  const b = T.buildWeeklyBytes(RECAP, '2026-07-06', '2026-07-12', { name: 'Épicerie Marième' });
  const bs = asStr(b);
  check('binaire : init ESC@, coupe partielle fin', hasBytes(b.slice(0, 2), [0x1B, 0x40]) && hasBytes(b.slice(-4), [0x1D, 0x56, 0x41, 0x05]));
  check('binaire : titre + plage du 06/07 au 12/07', bs.includes('BILAN HEBDO') && bs.includes('06/07') && bs.includes('12/07'));
  check('binaire : KPIs (CA 420 000, panier moyen 46 666…, apports/dépenses, remises)', bs.includes('420 000 F') && bs.includes('Panier moyen') && bs.includes('+5 000 F') && bs.includes('-3 000 F') && bs.includes('Remises points'));
  check('binaire : journal Z (06/07 Awa 60 000, 07/07) + solde 199 000 + nb Z', bs.includes('60 000 F') && bs.includes('Awa') && bs.includes('199 000 F') && bs.includes('clotures'));
  check('binaire :sans logo → pas de GS v 0', !hasBytes(b, [0x1D, 0x76, 0x30]));
  const bL = T.buildWeeklyBytes(RECAP, '2026-07-06', '2026-07-12', { name: 'S' }, [0x1D, 0x76, 0x30, 0x00, 1, 0, 1, 0, 0xFF]);
  check('binaire : logo inséré après init+centré', bL.slice(0, 5).join(',') === '27,64,27,97,1' && bL.slice(5, 8).join(',') === '29,118,48');
  const h = T.buildWeeklyTicketHtml(RECAP, '2026-07-06', '2026-07-12', { name: 'Épicerie Marième' });
  check('HTML 72mm : titre + valeurs + journal', h.includes('BILAN HEBDOMADAIRE') && h.includes('420 000') && h.includes('06/07') && h.includes('199 000'));
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'off' }));
  let errMsg = null;
  try { await T.printWeekly('2026-07-06', '2026-07-12'); } catch (e) { errMsg = e.message; }
  check('printWeekly mode off → erreur config', errMsg === I18n.t('th_cfg_needed'));
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'net', ip: '192.168.1.50', port: 9100 }));
  netCalls.length = 0; summaryCalls.length = 0;
  await T.printWeekly('2026-07-06', '2026-07-12');
  check('printWeekly net → summary appelé avec la plage + payload hebdo', netCalls.length === 1 && summaryCalls.some((u) => u.includes('from=2026-07-06') && u.includes('to=2026-07-12')) && asStr(netCalls[0].payload).includes('BILAN HEBDO'));

  console.log('\n— 🤖 Toggle 10 : impression auto au bilan —');
  check('préf weeklyprint OFF par défaut', window.Auto.get().weeklyprint === false);
  check('printWeeklyTicket désactivé → off', (await window.Auto.printWeeklyTicket('2026-07-06', '2026-07-12')) === 'off');
  window.Auto.set({ weeklyprint: true });
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'off' }));
  toasts.length = 0;
  check('sans thermique → no-printer + toast warning', (await window.Auto.printWeeklyTicket('2026-07-06', '2026-07-12')) === 'no-printer' && toasts.at(-1).color === 'var(--warning)');
  store.set('sfpc.printer.v1', JSON.stringify({ mode: 'net', ip: '192.168.1.50', port: 9100 }));
  netCalls.length = 0; toasts.length = 0;
  check('thermique OK → printed + toast succès', (await window.Auto.printWeeklyTicket('2026-07-06', '2026-07-12')) === 'printed' && netCalls.length === 1 && toasts.some((x) => x.color === 'var(--success)'));
  weeklyThrows = true; toasts.length = 0;
  check('panne impression → failed + toast danger', (await window.Auto.printWeeklyTicket('2026-07-06', '2026-07-12')) === 'failed' && toasts.some((x) => x.color === 'var(--danger)'));
  weeklyThrows = false;
  window.Auto.set({ weekly: true, weeklyprint: true });
  store.set('sfpc.auto_weekly.v1', '2026-W28');
  netCalls.length = 0;
  const rW = await window.Auto.maybeAutoWeekly('2026-07-15');
  await new Promise((r) => setImmediate(r)); // impression fire & forget : on laisse le payload partir
  await new Promise((r) => setImmediate(r));
  check('bilan auto : PDF saved + IMPRESSION thermique enchaînée', rW === 'saved' && netCalls.length === 1 && asStr(netCalls[0].payload).includes('BILAN HEBDO'));
  window.Auto.set({ weekly: false, weeklyprint: false });

  console.log('\n— Réglages & version —');
  run(read('src/js/screens/settings.js'), 'settings.js');
  const vS = el('div');
  await Screens.settings(vS);
  await new Promise((r) => setImmediate(r));
  let cbs = 0;
  (function countCb(n) { (n.children ?? []).forEach((c) => { if (c?.attrs?.type === 'checkbox') cbs++; countCb(c); }); })({ children: vS.children });
  check('≥ 10 interrupteurs auto', cbs >= 10);
  check('version ≥ v2.2 (pérennisé : non épinglé)', /StockFlow PC v\d/.test(read('src/js/config.js')));
  const i18nSrc = read('src/js/i18n.js');
  check('clés v2.2 dans i18n', ['pk_shops', 'pk_shop_col', 'ap_weeklyprint', 'ap_weeklyprint_sub', 'ap_wp_printed', 'ap_wp_failed'].every((k) => i18nSrc.includes(k + ':')));
  check('ap_beep_sub toujours présente (surveillance)', (i18nSrc.match(/ap_beep_sub:/g) ?? []).length === 2);

  console.log('\nRÉSULTAT v2.2 : ' + pass + ' OK / ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
