// Smoke headless StockFlow PC v1.4 — monte les 21 écrans avec stub DOM + API
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = require('path').join(__dirname, '..'); // racine stock-pc
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const run = (src, name) => vm.runInThisContext(src, { filename: name });

function el(tag) {
  const e = {
    tagName: tag, nodeType: 1, children: [], style: {}, attrs: {}, dataset: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, v) { v ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener() {}, append(...cs) { cs.flat(Infinity).forEach((c) => c && e.children.push(c)); },
    appendChild(c) { e.children.push(c); return c; }, prepend(c) { e.children.unshift(c); },
    setAttribute(k, v) { e.attrs[k] = v; }, getAttribute(k) { return e.attrs[k] ?? null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() {}, focus() {}, click() {}, value: '', checked: false, disabled: false, textContent: '', className: '',
  };
  Object.defineProperty(e, 'innerHTML', { get() { return ''; }, set(v) { if (v === '') e.children = []; } });
  return e;
}
global.window = globalThis;
global.document = {
  createElement: el, createElementNS: () => el('svg'),
  createTextNode: (t) => ({ nodeType: 3, text: String(t) }),
  getElementById: () => el('div'), querySelector: () => null, querySelectorAll: () => [],
  body: el('body'),
};
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.location = { hash: '' };

global.fetch = async (url) => {
  const u = String(url);
  let data = { data: [] };
  const ok = () => ({ ok: true, status: 200, json: async () => data });
  if (u.includes('/dashboard')) data = { today: {}, week: [], low_stock: [] };
  else if (u.includes('/receipts/credits')) data = { outstanding_total: 3000, data: [] };
  else if (u.includes('/receipts')) data = { data: [{ id: 1, number: 'REC-0001', client_name: 'Moussa', total: 10000, amount_paid: 6000, remaining: 4000, status: 'completed', items_count: 2, created_at: new Date().toISOString(), user: { name: 'Admin' } }], last_page: 1, current_page: 1 };
  else if (u.includes('/products')) data = { data: [{ id: 1, name: 'Eau 1.5L', sku: 'EAU15', barcode: '6001', sale_price: 500, quantity: 40, shop_stock: 12, category_name: 'Boissons' }], last_page: 1 };
  else if (u.includes('/customers')) data = { data: [{ id: 1, name: 'Moussa', phone: '+22370000000', loyalty_points: 25 }], last_page: 1 };
  else if (u.includes('/movements')) data = { data: [{ id: 1, type: 'in', quantity: 10, reason: 'Livraison', created_at: new Date().toISOString(), product: { name: 'Eau' }, user: { name: 'Admin' } }], last_page: 1 };
  else if (u.includes('/stock-alerts')) data = { data: [{ id: 1, name: 'Eau', quantity: 2, threshold: 5, shop_name: 'Siège' }] };
  else if (u.includes('/transfers')) data = { data: [{ id: 1, reference: 'TR-0001', from_name: '🏠 Siège', to_name: '🏬 ACI', items_count: 2, status: 'in_transit', sent_at: new Date().toISOString() }] };
  else if (u.includes('/suppliers')) data = { data: [{ id: 1, name: 'Dépôt central', products_count: 0, phone: '+223 70 00 00 00' }] };
  else if (u.includes('/purchase-orders')) data = { data: [{ id: 1, number: 'BC-0001', status: 'sent', created_at: new Date().toISOString(), items_count: 1, total_estimated: 5000, supplier: { name: 'Dépôt' }, user: { name: 'Admin' } }] };
  else if (u.includes('/inventories')) data = { data: [{ id: 1, reference: 'INV-0001', name: 'Mensuel', status: 'in_progress', lines_count: 3, counted_lines: 1, created_at: new Date().toISOString(), user: { name: 'Admin' } }] };
  else if (u.includes('/recurring-sales')) data = { data: [{ id: 1, customer: { name: 'Client X' }, label: 'Eau', frequency: 'weekly', next_run_at: new Date().toISOString(), status: 'active', total: 5000, items: [] }] };
  else if (u.includes('/users')) data = { data: [{ id: 2, name: 'Awa', email: 'awa@x.ml', role: 'manager', shop: { name: 'ACI' }, movements_count: 3 }] };
  else if (u.includes('/shops')) data = { data: [{ id: 1, name: 'ACI 2000', is_active: true, users_count: 2 }] };
  else if (u.includes('/categories')) data = { data: [{ id: 1, name: 'Boissons', products_count: 2 }] };
  else if (u.includes('/stats/margins')) data = { totals: { revenue: 10000, cost: 7000, margin: 3000, rate: 30 }, products: [] };
  else if (u.includes('/stats/sales')) data = { totals: { revenue: 10000, receipts: 1, items: 5, avg_basket: 10000 }, products: [], sellers: [], categories: [] };
  else if (u.includes('/settings')) data = { data: { segment_loyal_min: { value: 5, min: 1, max: 50 }, loyalty_earn_per: { value: 1000, min: 100 } } };
  else if (u.includes('/cash-ops')) data = { data: [], balance: 0 };
  else if (u.includes('/cash-operations')) data = { data: [] };
  else if (u.includes('/shop')) data = { shop: { name: 'Boutique Démo', my_shop: null, loyalty: { earn_per: 1000, point_value: 10 } } };
  return ok();
};

for (const f of ['src/js/config.js', 'src/js/i18n.js', 'src/js/format.js', 'src/js/api.js', 'src/js/ui.js', 'src/js/promo.js', // v2.11 : socle (miroir index.html)

  'src/js/thermal.js', 'src/js/offline.js', 'src/js/report.js', 'src/js/automation.js']) run(read(f), f);
global.App = { hasRole: () => true };
store.set('sfpc.token', 'tok');
store.set('sfpc.user', JSON.stringify({ id: 1, name: 'Awa', role: 'admin', shop_id: null }));

(async () => {
  const screens = fs.readdirSync(path.join(ROOT, 'src/js/screens'))
    .filter((f) => f.endsWith('.js') && !['login', 'shoppick'].includes(f.replace('.js', '')))
    .map((f) => f.replace('.js', '')).sort();
  for (const f of screens) run(read('src/js/screens/' + f + '.js'), f);
  let ko = 0;
  global.addEventListener = global.addEventListener ?? (() => {});
  for (const name of screens) {
    const view = el('div');
    try {
      await global.Screens[name](view);
      if (!view.children.length) throw new Error('vue vide');
      console.log('  OK  Screens.' + name + ' → ' + view.children.length + ' blocs');
    } catch (e) {
      ko++;
      console.log('  KO  Screens.' + name + ' → ' + e.message);
    }
  }
  console.log(ko ? 'SMOKE COMPLET: ' + ko + ' ecrans KO' : 'SMOKE COMPLET: ' + screens.length + '/' + screens.length + ' ecrans rendus');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
