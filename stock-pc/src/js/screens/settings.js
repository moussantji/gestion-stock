// ============================================================
// ⚙️ Réglages — langue, URL de l'API (+ test), session, à propos
// ============================================================
window.Screens = window.Screens || {};

Screens.settings = async (view) => {
  const t = I18n.t;
  const u = Api.user() ?? {};
  const shop = Api.shop() ?? {};

  const langSelect = UI.select({}, [
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'en', label: '🇬🇧 English' },
  ]);
  langSelect.value = I18n.getLang();

  const apiInput = UI.input({ value: Api.getUrl(), placeholder: SFPC_CONFIG.DEFAULT_API_URL });
  const okBox = UI.h('div', { style: { display: 'none' } });
  const testBtn = UI.h('button', { class: 'btn' }, `🔌 ${t('g_test')}`);
  const saveBtn = UI.h('button', { class: 'btn btn-primary' }, t('save'));

  function showOk(msg) {
    okBox.className = 'form-ok'; okBox.style.display = ''; okBox.textContent = msg;
    setTimeout(() => { okBox.style.display = 'none'; }, 4000);
  }

  saveBtn.addEventListener('click', () => {
    Api.setUrl(apiInput.value.trim().replace(/\/$/, ''));
    I18n.setLang(langSelect.value);
    // re-render complet pour appliquer la langue partout
    App.renderShell();
    location.hash = '#/settings';
    // route() est appelé via hashchange si déjà sur settings → forcer
    App.route();
    UI.toast(t('g_saved'), 'var(--success)');
  });

  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    try {
      Api.setUrl(apiInput.value.trim().replace(/\/$/, ''));
      const res = await Api.get('/shop');
      showOk(t('g_test_ok', { name: res?.shop?.name ?? 'StockFlow' }));
    } catch (e) {
      okBox.className = 'form-error'; okBox.style.display = ''; okBox.textContent = e.message;
    } finally {
      testBtn.disabled = false;
    }
  });

  // ---------- 🖨 v1.2 : carte impression thermique ----------
  function printerCard() {
    const card = UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '🖨 ', t('th_title')));
    if (!window.sfpc?.thermal || !window.Thermal) {
      card.append(UI.h('div', { class: 'muted', style: { fontSize: '12px' } }, `ℹ️ ${t('th_electron_only')}`));
      return card;
    }
    const cfg = Thermal.getCfg();
    const modeSel = UI.select({}, [
      { value: 'off', label: t('th_mode_off') },
      { value: 'system', label: t('th_mode_system') },
      { value: 'net', label: t('th_mode_net') },
    ]);
    modeSel.value = cfg.mode ?? 'off';
    const dynZone = UI.h('div');
    const deviceSel = UI.select({}, [{ value: '', label: t('th_device_default') }]);
    if (cfg.deviceName) deviceSel.dataset.saved = cfg.deviceName;
    const ipInput = UI.input({ value: cfg.ip ?? '', placeholder: '192.168.1.87' });
    const portInput = UI.input({ type: 'number', min: 1, max: 65535, value: cfg.port ?? 9100 });
    // 🖼 v1.6 : logo boutique en tête du ticket (ESC/POS raster + HTML système)
    const logoCb = UI.h('input', { type: 'checkbox', ...(cfg.logo === false ? {} : { checked: '' }) });

    async function refreshPrinters() {
      try {
        const list = await window.sfpc.thermal.list();
        deviceSel.innerHTML = '';
        deviceSel.appendChild(UI.h('option', { value: '' }, t('th_device_default')));
        list.forEach((p) => deviceSel.appendChild(
          UI.h('option', { value: p.name }, `${p.name}${p.isDefault ? ' ★' : ''}`)));
        if (deviceSel.dataset.saved) deviceSel.value = deviceSel.dataset.saved;
        if (!list.length) UI.toast(t('th_no_printers'), 'var(--warning)');
      } catch (e) { UI.toast(e.message, 'var(--danger)'); }
    }

    function renderDyn() {
      dynZone.innerHTML = '';
      if (modeSel.value === 'system') {
        dynZone.append(UI.h('div', { class: 'form-row', style: { alignItems: 'flex-end' } },
          UI.h('div', { style: { flex: 1 } }, UI.field(t('th_device'), deviceSel)),
          UI.h('button', { class: 'btn btn-sm', onclick: refreshPrinters }, `↻ ${t('th_refresh')}`)));
        refreshPrinters();
      } else if (modeSel.value === 'net') {
        dynZone.append(UI.h('div', { class: 'form-row' },
          UI.field(t('th_ip'), ipInput), UI.field(t('th_port'), portInput)));
      }
    }
    modeSel.addEventListener('change', renderDyn);

    card.append(
      UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, t('th_sub')),
      UI.field(t('th_mode'), modeSel),
      dynZone,
      UI.h('div', { class: 'muted', style: { fontSize: '11px', margin: '8px 0' } }, `ℹ️ ${t('th_note')}`),
      UI.h('label', { class: 'check-row', style: { fontWeight: 700, fontSize: '12.5px', margin: '4px 0 2px' } },
        logoCb, `🖼 ${t('th_logo')}`),
      UI.h('div', { class: 'muted', style: { fontSize: '11px', margin: '0 0 8px 28px', lineHeight: 1.5 } }, t('th_logo_sub')),
      UI.h('div', { class: 'form-row' },
        UI.h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            Thermal.saveCfg({
              mode: modeSel.value,
              deviceName: deviceSel.value || null,
              ip: ipInput.value.trim() || null,
              port: Number(portInput.value) || 9100,
              logo: logoCb.checked, // 🖼 v1.6
            });
            UI.toast(t('g_saved'), 'var(--success)');
          },
        }, t('save')),
        UI.h('button', {
          class: 'btn',
          onclick: async () => {
            try { await Thermal.testPrint(); UI.toast(t('th_printed'), 'var(--success)'); }
            catch (e) { UI.toast(e.message, 'var(--danger)'); }
          },
        }, `🖨 ${t('th_test')}`)));
    renderDyn();
    return card;
  }

  // ---------- 📡 v1.2 : carte file hors ligne ----------
  function offlineCard() {
    const card = UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '📡 ', t('off_title')));
    const zone = UI.h('div');

    function render() {
      zone.innerHTML = '';
      const q = OfflineSales.queue();
      zone.append(UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } },
        `${t('off_sub')} ${t('off_pending', { n: q.length })}`));
      if (!q.length) zone.append(UI.empty('🎉', t('off_none')));
      [...q].reverse().slice(0, 8).forEach((item) => {
        zone.append(UI.h('div', { class: 'form-row', style: { alignItems: 'center', padding: '4px 0' } },
          UI.h('span', { style: { flex: 1 } },
            UI.h('div', { class: 'strong', style: { fontSize: '12.5px' } },
              `${Fmt.esc(item.meta?.client ?? '—')} · ${Fmt.moneyFull(item.meta?.total ?? 0)}`),
            UI.h('div', { class: 'muted', style: { fontSize: '11px' } }, Fmt.dateTime(item.at)),
            item.error ? UI.h('div', { class: 'form-error', style: { fontSize: '11px', padding: '4px 8px', marginTop: '3px' } },
              t('off_err_keep', { msg: item.error })) : null),
          UI.h('button', {
            class: 'btn btn-sm btn-ghost',
            onclick: () => { OfflineSales.remove(item.id); render(); },
          }, '🗑')));
      });
      const cat = OfflineSales.readCatalog();
      zone.append(UI.h('div', { class: 'muted', style: { fontSize: '11px', marginTop: '8px' } },
        cat ? `💾 ${t('off_catalog', { date: Fmt.dateTime(cat.at) })}` : ''));
      zone.append(UI.h('div', { class: 'form-row', style: { marginTop: '10px' } },
        UI.h('button', {
          class: 'btn btn-primary',
          onclick: async () => {
            const r = await OfflineSales.sync();
            render();
            if (!r.sent && !r.left) UI.toast(t('off_none'), 'var(--info)');
            else if (r.left) UI.toast(`${r.sent} ✓ · ${r.left} ⏳`, 'var(--warning)', 5000);
          },
        }, `↻ ${t('off_now')}`),
        q.length ? UI.h('button', {
          class: 'btn btn-danger',
          onclick: async () => {
            if (await UI.confirm(t('off_clear_q', { n: q.length }), { danger: true, okText: t('delete') })) {
              OfflineSales.clear();
              render();
            }
          },
        }, `🗑 ${t('off_clear')}`) : null));
    }

    try { window.addEventListener('sfpc:offline-change', render); } catch { /* tests */ }
    render();
    card.append(zone);
    return card;
  }

  // ---------- 🤖 v1.4 : carte automatisations ----------
  function autoCard() {
    const card = UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '🤖 ', t('ap_title')));
    if (!window.Auto) return card; // module absent (jamais en prod)
    card.append(UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, t('ap_sub')));
    const cfg = Auto.get();
    const mkToggle = (label, sub, key) => {
      const cb = UI.h('input', {
        type: 'checkbox', ...(cfg[key] ? { checked: '' } : {}),
        onchange: (e) => { Auto.set({ [key]: e.target.checked }); UI.toast(t('g_saved'), 'var(--success)'); },
      });
      return UI.h('div', { style: { marginBottom: '10px' } },
        UI.h('label', { class: 'check-row', style: { fontWeight: 700, fontSize: '13px' } }, cb, label),
        UI.h('div', { class: 'muted', style: { fontSize: '11px', margin: '2px 0 0 28px', lineHeight: 1.5 } }, sub));
    };
    card.append(
      mkToggle(t('ap_ticket'), t('ap_ticket_sub'), 'ticket'),
      mkToggle(t('ap_report'), t('ap_report_sub'), 'report'),
      mkToggle(t('ap_zticket'), t('ap_zticket_sub'), 'zticket'), // 🖨 v1.5
      mkToggle(t('ap_notif'), t('ap_notif_sub'), 'notif'), // 🔔 v1.7
      mkToggle(t('ap_monthly'), t('ap_monthly_sub'), 'monthly'), // 📅 v1.8
      mkToggle(t('ap_beep'), t('ap_beep_sub'), 'beep'), // 🔊 v1.8
      mkToggle(t('ap_daypack'), t('ap_daypack_sub'), 'daypack'), // 📦 v1.9
      mkToggle(t('ap_emailpack'), t('ap_emailpack_sub'), 'emailpack'), // 📧 v2.1
      mkToggle(t('ap_weekly'), t('ap_weekly_sub'), 'weekly'), // 🧮 v2.1
      mkToggle(t('ap_weeklyprint'), t('ap_weeklyprint_sub'), 'weeklyprint'), // 🖨 v2.2
      mkToggle(t('ap_weeklyemail'), t('ap_weeklyemail_sub'), 'weeklyemail'), // 📧 v2.3
      mkToggle(t('ap_outstock'), t('ap_outstock_sub'), 'outstock'), // 🔔 v2.7
      mkToggle(t('ap_creditdue'), t('ap_creditdue_sub'), 'creditdue')); // 💳 v2.13
    if (window.StockNotifier?.canNotify?.()) {
      card.append(UI.h('button', {
        class: 'btn btn-sm', style: { marginTop: '2px' },
        onclick: () => {
          const r = StockNotifier.test();
          UI.toast(r ? t('ap_notif_test') : t('ap_notif_ko'), r ? 'var(--success)' : 'var(--warning)', 4000);
        },
      }, `🔔 ${t('ap_notif_test')}`));
    }
    if (!window.sfpc?.thermal || !window.sfpc?.pdf) {
      card.append(UI.h('div', { class: 'muted', style: { fontSize: '11px' } }, `ℹ️ ${t('ap_electron')}`));
    }
    return card;
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('g_title')),
      UI.h('div', { class: 'page-sub' }, t('g_sub'))),
    UI.h('div', { class: 'grid grid-cols-2' },
      UI.h('div', { class: 'card' },
        UI.h('div', { class: 'card-title' }, '🌐 ', t('g_lang')),
        UI.field(t('g_lang'), langSelect),
        UI.field(t('g_api'), apiInput),
        UI.h('div', { class: 'muted', style: { fontSize: '11.5px', margin: '-6px 0 12px' } }, t('g_api_hint')),
        okBox,
        UI.h('div', { class: 'form-row' }, saveBtn, testBtn)),
      UI.h('div', { class: 'card' },
        UI.h('div', { class: 'card-title' }, '👤 ', t('g_session')),
        UI.kv(t('p_name'), Fmt.esc(u.name ?? '—')),
        UI.kv(t('email'), Fmt.esc(u.email ?? '—')),
        UI.kv(t('g_shop'), shop?.my_shop?.name ? `🏬 ${Fmt.esc(shop.my_shop.name)}` : `🏠 ${t('g_hq')}`),
        UI.kv(I18n.getLang() === 'fr' ? 'Rôle' : 'Role', I18n.t(`role_${u.role ?? 'employee'}`)),
        // 🏬 v1.3 : poste rattaché à une boutique (choix au login), modifiable ici
        !u.shop_id && ['admin', 'manager'].includes(u.role) ? UI.h('div', { style: { marginTop: '10px' } },
          UI.kv(t('sp_current'), Api.pickedShop?.()?.name
            ? `🏬 ${Fmt.esc(Api.pickedShop().name)}`
            : `🏠 ${t('g_hq')}`),
          UI.h('button', {
            class: 'btn btn-sm', style: { marginTop: '8px' },
            onclick: async () => {
              if (!(await UI.confirm(t('sp_change_q'), { okText: t('yes') }))) return;
              Api.clearPickedShop();
              App.render();
            },
          }, `🏬 ${t('sp_change')}`)) : null,
        UI.h('div', { class: 'card-title', style: { marginTop: '16px' } }, 'ℹ️ ', t('g_about')),
        UI.h('div', { class: 'muted', style: { fontSize: '12.5px', lineHeight: '1.6' } }, t('g_about_txt')),
        UI.h('div', { style: { marginTop: '10px' } },
          UI.badge('primary', SFPC_CONFIG.APP_VERSION)))),
    UI.h('div', { class: 'grid grid-cols-3', style: { marginTop: '14px' } },
      printerCard(),
      offlineCard(),
      autoCard())); // 🤖 v1.4
};
