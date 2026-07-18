// ============================================================
// StockFlow PC — shell : sidebar (tab bar transposée PC),
// topbar glass (comme le site), routeur hash + garde auth.
// ============================================================
const App = (() => {
  // Routes groupées en sections (comme les onglets thématiques du mobile)
  const ROUTES = {
    // 🧭 Vendre au quotidien
    '#/dashboard': { screen: () => Screens.dashboard, icon: '🏠', key: 'nav_home', sec: 'nav_sec_sell' },
    '#/sale': { screen: () => Screens.sale, icon: '🧾', key: 'nav_sale', sec: 'nav_sec_sell' },
    '#/receipts': { screen: () => Screens.receipts, icon: '📜', key: 'nav_receipts', sec: 'nav_sec_sell' },
    '#/customers': { screen: () => Screens.customers, icon: '👥', key: 'nav_customers', sec: 'nav_sec_sell' },
    '#/recurring': { screen: () => Screens.recurring, icon: '🔁', key: 'nav_recurring', sec: 'nav_sec_sell', roles: ['admin', 'manager'] },
    // 📦 Le stock
    '#/products': { screen: () => Screens.products, icon: '📦', key: 'nav_products', sec: 'nav_sec_stock' },
    '#/movements': { screen: () => Screens.movements, icon: '🔄', key: 'nav_movements', sec: 'nav_sec_stock' },
    '#/transfers': { screen: () => Screens.transfers, icon: '🚚', key: 'nav_transfers', sec: 'nav_sec_stock', roles: ['admin', 'manager'] },
    '#/inventories': { screen: () => Screens.inventories, icon: '📋', key: 'nav_inventories', sec: 'nav_sec_stock', roles: ['admin', 'manager'] },
    '#/alerts': { screen: () => Screens.alerts, icon: '🔔', key: 'nav_alerts', badge: 'alerts', sec: 'nav_sec_stock' },
    // 🛒 Approvisionnement
    '#/suppliers': { screen: () => Screens.suppliers, icon: '🚛', key: 'nav_suppliers', sec: 'nav_sec_buy' },
    '#/orders': { screen: () => Screens.orders, icon: '🛒', key: 'nav_orders', sec: 'nav_sec_buy', roles: ['admin', 'manager'] },
    // 💰 Pilotage
    '#/cash': { screen: () => Screens.cash, icon: '💵', key: 'nav_cash', sec: 'nav_sec_manage', roles: ['admin', 'manager'] },
    '#/stats': { screen: () => Screens.stats, icon: '📊', key: 'nav_stats', sec: 'nav_sec_manage', roles: ['admin', 'manager'] },
    // ⚙️ Configuration
    '#/categories': { screen: () => Screens.categories, icon: '🏷️', key: 'nav_categories', sec: 'nav_sec_admin' },
    '#/users': { screen: () => Screens.users, icon: '🧑‍🤝‍🧑', key: 'nav_users', sec: 'nav_sec_admin', roles: ['admin'] },
    '#/shops': { screen: () => Screens.shops, icon: '🏬', key: 'nav_shops', sec: 'nav_sec_admin', roles: ['admin'] },
    '#/shopsettings': { screen: () => Screens.shopsettings, icon: '🎯', key: 'nav_shopsettings', sec: 'nav_sec_admin', roles: ['admin', 'manager'] },
    '#/settings': { screen: () => Screens.settings, icon: '⚙️', key: 'nav_settings', sec: 'nav_sec_admin' },
  };

  const user = () => Api.user();
  const hasRole = (...roles) => (user() ? roles.includes(user().role) : false);
  const shopInfo = async () => {
    try {
      const res = await Api.get('/shop');
      Api.saveShop(res?.shop ?? null); // GET /api/shop → clé racine "shop"
      return Api.shop();
    } catch { return Api.shop(); }
  };

  // ---------- Shell ----------
  function renderShell() {
    const root = document.getElementById('root');
    root.innerHTML = '';

    const nav = UI.h('nav', { class: 'nav' });
    let lastSec = null;
    Object.entries(ROUTES).forEach(([hash, r]) => {
      if (r.roles && !hasRole(...r.roles)) return;
      // Titre de section quand on change de groupe (sections interdites masquées)
      if (r.sec && r.sec !== lastSec) {
        lastSec = r.sec;
        nav.appendChild(UI.h('div', { class: 'nav-sec' }, I18n.t(r.sec)));
      }
      nav.appendChild(UI.h('button', {
        class: 'nav-item', 'data-route': hash,
        onclick: () => { location.hash = hash; },
      },
        UI.h('span', { class: 'ico' }, r.icon),
        UI.h('span', {}, I18n.t(r.key)),
        r.badge ? UI.h('span', { class: 'nav-badge', 'data-nav-badge': r.badge, style: { display: 'none' } }) : null));
    });

    const sidebar = UI.h('aside', { class: 'sidebar' },
      UI.h('div', { class: 'brand' },
        UI.h('div', { class: 'brand-logo' }, '◆'),
        UI.h('div', {},
          UI.h('div', { class: 'brand-name' }, 'StockFlow'),
          UI.h('div', { class: 'brand-sub' }, 'PC · Desktop'))),
      nav,
      UI.h('div', { class: 'sidebar-foot' }, I18n.t('version')));

    const u = user();
    const topbar = UI.h('header', { class: 'topbar' },
      UI.h('div', { class: 'topbar-title', 'data-page-title': '' }, ''),
      UI.h('div', { class: 'topbar-shop' }, '🏪',
        UI.h('span', { 'data-shop-name': '' }, '…'),
        u?.shop_id ? null : ''),
      UI.h('span', { class: 'nav-badge', 'data-offline-chip': '', style: { display: 'none', marginLeft: '10px' } }),
      UI.h('div', { class: 'topbar-spacer' }),
      UI.h('div', { class: 'topbar-user' },
        UI.h('div', { class: 'avatar' }, (u?.name || '?').charAt(0).toUpperCase()),
        UI.h('div', {},
          UI.h('div', { class: 'uname' }, u?.name ?? ''),
          UI.h('span', { class: `role-chip role-${u?.role ?? 'employee'}` }, I18n.t(`role_${u?.role ?? 'employee'}`)))),
      UI.h('button', {
        class: 'lang-btn', title: 'Language',
        onclick: () => { I18n.setLang(I18n.getLang() === 'fr' ? 'en' : 'fr'); renderShell(); route(); },
      }, I18n.getLang() === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'),
      UI.h('button', { class: 'btn btn-sm btn-ghost', onclick: doLogout }, `🚪 ${I18n.t('logout')}`));

    const content = UI.h('main', { class: 'main' },
      topbar,
      UI.h('div', { class: 'content', id: 'view' }));

    root.append(sidebar, content);

    // Infos boutique (nom + règles fidélité pour l'écran vente)
    shopInfo().then((shop) => {
      const el = document.querySelector('[data-shop-name]');
      if (el) el.textContent = shop?.name ?? SFPC_CONFIG.BRAND;
      const picked = Api.pickedShop?.(); // 🏬 v1.3 : le poste choisi prime sur le rattachement
      const my = picked?.name ?? shop?.my_shop?.name;
      if (my && el) el.textContent = `${shop?.name ?? ''} · 🏬 ${my}`;
    });
  }

  async function doLogout() {
    if (!(await UI.confirm(I18n.t('confirm_logout'), { danger: true, okText: I18n.t('yes') }))) return;
    try { await Api.post('/logout', {}); } catch { /* déjà hors ligne */ }
    Api.clear();
    location.hash = '#/login';
    render();
  }

  // ---------- Routeur ----------
  function markActive(hash) {
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-route') === hash);
    });
    const r = ROUTES[hash];
    const t = document.querySelector('[data-page-title]');
    if (t && r) t.textContent = `${r.icon} ${I18n.t(r.key)}`;
  }

  function route() {
    if (!Api.token()) { location.hash = '#/login'; render(); return; }
    // 👤 v2.14 : un compte client reste sur son écran abonnement
    if (Api.user()?.role === 'client') { render(); return; }

    let hash = location.hash || '#/dashboard';
    if (hash === '#/login') { render(); return; }
    let route = ROUTES[hash];
    if (!route) { hash = '#/dashboard'; route = ROUTES[hash]; }
    if (route.roles && !hasRole(...route.roles)) { hash = '#/dashboard'; route = ROUTES[hash]; }

    location.hash = hash;
    markActive(hash);

    const view = document.getElementById('view');
    view.innerHTML = '';
    view.appendChild(UI.spinner());
    Promise.resolve()
      .then(() => route.screen()(view))
      .catch((e) => {
        view.innerHTML = '';
        view.appendChild(UI.empty('⚠️', e.message || I18n.t('err_generic'),
          e.network ? I18n.t('err_network') : null));
      });
    refreshAlertBadge();
    refreshOfflineChip();
  }

  // 📡 v1.2 : chip topbar mode hors ligne / ventes en attente
  function refreshOfflineChip() {
    const chip = document.querySelector('[data-offline-chip]');
    if (!chip || !window.OfflineSales) return;
    const n = OfflineSales.queueCount();
    const down = OfflineSales.isDown();
    if (!down && n === 0) { chip.style.display = 'none'; return; }
    chip.style.display = '';
    chip.style.background = down ? 'rgba(248,113,113,.18)' : 'rgba(251,191,36,.18)';
    chip.style.color = down ? '#F87171' : '#FBBF24';
    chip.textContent = down
      ? `📡 ${I18n.t('off_chip_down', { n })}`
      : `☁️ ${I18n.t('off_chip_sync', { n })}`;
  }

  async function refreshAlertBadge() {
    if (!Api.token()) return;
    try {
      const dash = await Api.get('/dashboard');
      const n = (dash?.stats?.low_stock ?? 0) + (dash?.stats?.out_of_stock ?? 0);
      window.StockNotifier?.maybeNotify(n); // 🔔 v1.7 : notification bureau si nouvelles alertes
      const b = document.querySelector('[data-nav-badge="alerts"]');
      if (b) { b.style.display = n > 0 ? '' : 'none'; b.textContent = n > 99 ? '99+' : n; }
    } catch { /* silencieux */ }
  }

  // ---------- Rendu global ----------
  function render() {
    if (!Api.token() || location.hash === '#/login') {
      document.getElementById('root').innerHTML = '';
      Screens.login(document.getElementById('root'), () => {
        // 👤 v2.14 : re-entrée render() → client = écran abonnement, staff = caisse
        location.hash = '#/dashboard';
        render();
      });
      return;
    }
    // 👤 v2.14 : compte CLIENT → écran abonnement dédié (pas la caisse)
    if (Api.user()?.role === 'client') {
      document.getElementById('root').innerHTML = '';
      Screens.clientaccount(document.getElementById('root'));
      return;
    }
    // 🏬 v1.3 : poste non rattaché → sélecteur obligatoire avant la caisse
    if (Api.needsShopPick?.()) {
      document.getElementById('root').innerHTML = '';
      Screens.shoppick(document.getElementById('root'), () => {
        renderShell();
        location.hash = '#/dashboard';
        route();
      });
      return;
    }
    if (!document.querySelector('.sidebar')) renderShell();
    route();
  }

  function start() {
    window.addEventListener('hashchange', () => route());
    // Actions du menu Electron (Ctrl+N → nouvelle vente)
    window.sfpc?.onAction?.((action) => {
      if (action === 'new-sale' && Api.token()) location.hash = '#/sale';
    });
    // 📡 v1.2 : sync de la file hors ligne (au retour réseau + toutes les 45 s)
    window.addEventListener('sfpc:offline-change', refreshOfflineChip);
    window.addEventListener('online', () =>
      OfflineSales.sync({ silent: true }).then(refreshOfflineChip));
    setInterval(async () => {
      if (Api.token()) {
        await OfflineSales.sync({ silent: true });
        refreshOfflineChip();
        refreshAlertBadge(); // 🔔 v1.7 : badge alertes + notifications frais toutes les 45 s
        window.Auto?.maybeAutoMonthly?.(); // 📅 v1.8 : récap auto au changement de mois
        window.Auto?.maybeAutoWeekly?.(); // 🧮 v2.1 : bilan hebdo auto de la semaine passée
      }
    }, 45000);
    setTimeout(() => { if (Api.token()) window.Auto?.maybeAutoMonthly?.(); }, 6000); // 📅 v1.8 : contrôle au démarrage
    setTimeout(() => { if (Api.token()) window.Auto?.maybeAutoWeekly?.(); }, 8000); // 🧮 v2.1 : contrôle au démarrage
    setTimeout(() => { if (Api.token()) window.Auto?.maybeDailyOutstock?.(); }, 10000); // 🔔 v2.7 : « N ruptures » du matin
    setTimeout(() => { if (Api.token()) window.Auto?.maybeDailyCreditDue?.(); }, 12000); // 💳 v2.13 : échéances crédit du matin
    render();
  }

  return { start, route, render, renderShell, hasRole, refreshAlertBadge };
})();
