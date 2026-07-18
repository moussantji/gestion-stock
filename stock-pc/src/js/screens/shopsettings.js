// ============================================================
// 🎯 Seuils boutique — segments clients, rappel crédit,
// 🎁 fidélité + logo de la boutique (reçus PDF).
// Réservé admin/manager (logo : admin).
// ============================================================
window.Screens = window.Screens || {};

Screens.shopsettings = async (view) => {
  const t = I18n.t;
  const isAdmin = App.hasRole('admin');

  const FIELDS = [
    { key: 'segment_loyal_min', icon: '🏆', label: t('set_loyal'), hint: t('set_loyal_hint') },
    { key: 'segment_inactive_days', icon: '💤', label: t('set_inactive'), hint: t('set_inactive_hint') },
    { key: 'credit_reminder_days', icon: '📅', label: t('set_reminder'), hint: t('set_reminder_hint') },
    { key: 'loyalty_earn_per', icon: '🎁', label: t('set_loyalty_earn'), hint: t('set_loyalty_earn_hint') },
    { key: 'loyalty_point_value', icon: '💝', label: t('set_loyalty_value'), hint: t('set_loyalty_value_hint') },
    { key: 'seller_monthly_target', icon: '🏆', label: t('set_target'), hint: t('set_target_hint') }, // 🏆 v2.8
    { key: 'commission_pct', icon: '👥', label: t('set_commission'), hint: t('set_commission_hint') }, // 👥 v2.9
    { key: 'cycle_count_daily', icon: '📦', label: t('set_cycle'), hint: t('set_cycle_hint') }, // 📦 v2.11
  ];

  let values = {};
  let meta = {};
  let dirty = false;
  let shopCategories = []; // 🧮 v2.9 : taux TVA par catégorie
  let tvaDraft = {};       // 🧮 v2.9 : brouillon TVA édité par l'UI (reconstruit à la sauvegarde)
  let promoDraft = {};     // 🏷️ v2.11 : brouillon promos datées (reconstruit à la sauvegarde)
  let shopProducts = [];   // 🏷️ v2.11 : catalogue pour la datalist produit
  const zone = UI.h('div');

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      const [res, catRes, prodRes] = await Promise.all([
        Api.get('/settings'),
        Api.get('/categories').catch(() => ({ data: [] })), // 🧮 v2.9 (non bloquant)
        Api.get('/products?all=1').catch(() => ({ data: [] })), // 🏷️ v2.11 (datalist promos, non bloquant)
      ]);
      shopCategories = catRes?.data ?? [];
      shopProducts = prodRes?.data ?? [];
      const data = res.data ?? {};
      values = {};
      meta = {};
      Object.entries(data).forEach(([key, conf]) => {
        values[key] = String(conf.value ?? '');
        meta[key] = { min: conf.min, max: conf.max };
      });
      dirty = false;
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    const saveBtn = UI.h('button', {
      class: 'btn btn-primary btn-lg',
      style: { opacity: dirty ? 1 : 0.5, marginTop: '4px' },
      onclick: save,
    }, `💾 ${t('save')}`);

    FIELDS.forEach(({ key, icon, label, hint }) => {
      const input = UI.input({
        inputmode: 'numeric', value: values[key] ?? '',
        style: { width: '90px', textAlign: 'center', fontWeight: '800', fontSize: '16px' },
      });
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        values[key] = input.value;
        dirty = true;
        saveBtn.style.opacity = 1;
      });
      zone.appendChild(UI.h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' } },
        UI.h('div', { style: { flex: 1 } },
          UI.h('div', { class: 'strong' }, `${icon} ${label}`),
          UI.h('div', { class: 'muted', style: { marginTop: '3px' } }, hint),
          meta[key] && (meta[key].min !== undefined || meta[key].max !== undefined)
            ? UI.h('div', { class: 'muted', style: { fontSize: '11px', marginTop: '3px' } }, `${meta[key].min ?? '…'} – ${meta[key].max ?? '…'}`)
            : null),
        input));
    });

    // 📧 v2.1 : email du patron (reçoit le pack du jour PDF + CSV à chaque clôture)
    const emailInput = UI.input({
      type: 'email', value: values.boss_email ?? '',
      placeholder: 'patron@exemple.ml', style: { width: '240px' },
    });
    emailInput.addEventListener('input', () => {
      values.boss_email = emailInput.value;
      dirty = true;
      saveBtn.style.opacity = 1;
    });
    zone.appendChild(UI.h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', borderLeft: '3px solid var(--accent)' } },
      UI.h('div', { style: { flex: 1 } },
        UI.h('div', { class: 'strong' }, `📧 ${t('ss_email')}`),
        UI.h('div', { class: 'muted', style: { marginTop: '3px' } }, t('ss_email_hint'))),
      emailInput));

    // 🧮 v2.9 : multi-TVA (réglage texte `tva_config` en JSON — ventilation de présentation)
    let tvaCfg = {};
    try { tvaCfg = JSON.parse(values.tva_config ?? '{}') ?? {}; } catch { tvaCfg = {}; }
    if (typeof tvaCfg !== 'object' || tvaCfg === null) tvaCfg = {};
    tvaDraft = tvaCfg; // partagé avec save()
    const tvaBox = UI.h('div', { style: { marginTop: '8px' } });
    const tvaEnabled = UI.h('input', {
      type: 'checkbox', ...(tvaCfg.enabled ? { checked: '' } : {}),
      onchange: (e) => { tvaCfg.enabled = e.target.checked; dirty = true; saveBtn.style.opacity = 1; tvaBox.style.opacity = tvaCfg.enabled ? 1 : 0.45; },
    });
    const tvaDefault = UI.input({ inputmode: 'decimal', value: String(tvaCfg.default_rate ?? 0), style: { width: '64px', textAlign: 'center', fontWeight: '800' } });
    tvaDefault.addEventListener('input', () => {
      tvaCfg.default_rate = Number(tvaDefault.value.replace(/[^0-9.]/g, '')) || 0;
      dirty = true; saveBtn.style.opacity = 1;
    });
    tvaBox.style.opacity = tvaCfg.enabled ? 1 : 0.45;
    tvaBox.append(
      UI.h('div', { class: 'form-row', style: { alignItems: 'center' } },
        UI.h('span', { class: 'muted', style: { fontSize: '12.5px' } }, t('tva_default_rate')),
        tvaDefault, UI.h('span', { class: 'muted' }, '%')));
    (shopCategories ?? []).forEach((c) => { // taux par catégorie (per-produit : exceptions conservées)
      const inp = UI.input({ inputmode: 'decimal', value: String(tvaCfg.categories?.[String(c.id)] ?? ''), placeholder: '—', style: { width: '64px', textAlign: 'center', fontWeight: '700' } });
      inp.addEventListener('input', () => {
        const v = inp.value.trim();
        tvaCfg.categories = tvaCfg.categories ?? {};
        if (v === '') delete tvaCfg.categories[String(c.id)];
        else tvaCfg.categories[String(c.id)] = Number(v.replace(/[^0-9.]/g, '')) || 0;
        dirty = true; saveBtn.style.opacity = 1;
      });
      tvaBox.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', marginTop: '5px' } },
        UI.h('span', { style: { flex: 1, fontSize: '12.5px' } }, `🏷️ ${Fmt.esc(c.name ?? '')}`), inp, UI.h('span', { class: 'muted' }, '%')));
    });
    zone.appendChild(UI.h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: '3px solid var(--primary)' } },
      UI.h('label', { style: { display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' } },
        tvaEnabled, UI.h('span', { class: 'strong' }, `🧮 ${t('tva_title')}`)),
      UI.h('div', { class: 'muted', style: { marginTop: '3px', fontSize: '12px' } }, t('tva_hint')),
      tvaBox));

    // 🏷️ v2.11 : promos datées (réglage texte `promo_config` en JSON — prix du moment, hors période = prix normal)
    {
      let promoCfg = {};
      try { promoCfg = JSON.parse(values.promo_config ?? '{}') ?? {}; } catch { promoCfg = {}; }
      if (typeof promoCfg !== 'object' || promoCfg === null || Array.isArray(promoCfg)) promoCfg = {};
      promoDraft = {};
      Object.keys(promoCfg).forEach((pid) => {
        const r = promoCfg[pid] ?? {};
        promoDraft[pid] = { price: r.price, from: r.from, to: r.to };
      });
      const pcard = UI.h('div', { class: 'card', style: { marginBottom: '10px', borderLeft: '3px solid var(--warning)' } });
      pcard.appendChild(UI.h('div', { class: 'card-title' }, `🏷️ ${t('pr_title')}`));
      pcard.appendChild(UI.h('div', { class: 'muted', style: { margin: '3px 0 8px', fontSize: '12px' } }, t('pr_hint')));
      Object.entries(promoDraft).forEach(([pid, r]) => {
        const prod = (shopProducts ?? []).find((x) => String(x.id) === String(pid));
        pcard.appendChild(UI.h('div', { class: 'kv', style: { alignItems: 'center' } },
          UI.h('span', {}, `${Fmt.esc(prod?.name ?? '#' + pid)} `,
            UI.badge('warning', `🏷️ ${Fmt.money(r.price ?? 0)}`),
            UI.h('span', { class: 'muted', style: { fontSize: '11px' } }, ` ${Fmt.esc(r.from ?? '')} → ${Fmt.esc(r.to ?? '')}`)),
          UI.h('button', {
            class: 'btn btn-sm btn-ghost',
            onclick: () => { delete promoDraft[pid]; dirty = true; saveBtn.style.opacity = 1; render(); },
          }, '🗑')));
      });
      const pInput = UI.h('input', { class: 'input', list: 'sf-promo-products', placeholder: t('pr_product'), style: { flex: 2, minWidth: '160px' } });
      const priceInput = UI.input({ inputmode: 'numeric', placeholder: t('pr_price'), style: { width: '110px' } });
      priceInput.addEventListener('input', () => { priceInput.value = priceInput.value.replace(/[^0-9]/g, ''); });
      const fromInput = UI.input({ type: 'date' });
      const toInput = UI.input({ type: 'date' });
      const addBtn = UI.h('button', { class: 'btn' }, `＋ ${t('pr_add')}`);
      addBtn.addEventListener('click', () => {
        const m = String(pInput.value ?? '').match(/^(\d+)/);
        const price = parseInt(priceInput.value, 10) || 0;
        const f = String(fromInput.value ?? ''), d = String(toInput.value ?? '');
        if (!m || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(d) || f > d) {
          UI.toast(t('pr_invalid'), 'var(--danger)');
          return;
        }
        promoDraft[m[1]] = { price, from: f, to: d };
        dirty = true; saveBtn.style.opacity = 1;
        render();
      });
      pcard.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' } },
        pInput, priceInput, fromInput, toInput, addBtn));
      pcard.appendChild(UI.h('datalist', { id: 'sf-promo-products' },
        (shopProducts ?? []).map((x) => UI.h('option', { value: `${x.id} — ${x.name ?? ''}` }))));
      zone.appendChild(pcard);
    }

    zone.appendChild(saveBtn);

    // 🏪 Logo de la boutique (admin uniquement)
    if (isAdmin) {
      const file = UI.input({ type: 'file', accept: 'image/png,image/jpeg,image/webp' });
      const upBtn = UI.h('button', { class: 'btn btn-primary' }, `📤 ${t('set_logo_btn')}`);
      upBtn.addEventListener('click', async () => {
        if (!file.files[0]) { UI.toast(t('set_logo_pick'), 'var(--warning)'); return; }
        const fd = new FormData();
        fd.append('logo', file.files[0]);
        upBtn.disabled = true;
        try {
          await Api.postForm('/admin/shop-logo', fd);
          UI.toast(t('set_logo_done'), 'var(--success)');
          file.value = '';
        } catch (e) { UI.toast(e.message, 'var(--danger)'); }
        upBtn.disabled = false;
      });
      zone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '18px' } },
        UI.h('div', { class: 'card-title' }, `🏪 ${t('set_logo')}`),
        UI.h('div', { class: 'muted', style: { margin: '6px 0 10px' } }, t('set_logo_hint')),
        UI.h('div', { class: 'form-row', style: { alignItems: 'center' } }, file, upBtn)));
    }
  }

  async function save() {
    const payload = {};
    FIELDS.forEach(({ key }) => {
      if (values[key] !== undefined && values[key] !== '') payload[key] = parseInt(values[key], 10);
    });
    payload.boss_email = (values.boss_email ?? '').trim(); // 📧 v2.1 ('' = effacer l'adresse)
    // 🧮 v2.9 : tva_config reconstruit depuis l'UI (enabled/taux défaut/catégories ; exceptions produit conservées)
    {
      let cfg = {};
      try { cfg = JSON.parse(values.tva_config ?? '{}') ?? {}; } catch { cfg = {}; }
      if (typeof cfg !== 'object' || cfg === null) cfg = {};
      // les états courants des inputs sont écrits dans tvaCfgUI par les handlers (variable module ci-dessous)
      cfg.enabled = !!tvaDraft.enabled;
      cfg.default_rate = Number(tvaDraft.default_rate ?? 0) || 0;
      cfg.categories = tvaDraft.categories ?? {};
      const hasCats = cfg.categories && Object.keys(cfg.categories).length > 0;
      const hasProds = cfg.products && Object.keys(cfg.products).length > 0;
      payload.tva_config = (cfg.enabled || hasCats || hasProds || (cfg.default_rate ?? 0) > 0) ? JSON.stringify(cfg) : '';
    }
    // 🏷️ v2.11 : promo_config reconstruit depuis le brouillon UI (lignes invalides écartées, vide = '' → aucune promo)
    {
      const pr = {};
      Object.entries(promoDraft ?? {}).forEach(([pid, r]) => {
        const price = parseInt(r?.price, 10) || 0;
        const f = String(r?.from ?? ''), d = String(r?.to ?? '');
        if (price > 0 && /^\d{4}-\d{2}-\d{2}$/.test(f) && /^\d{4}-\d{2}-\d{2}$/.test(d) && f <= d) {
          pr[pid] = { price, from: f, to: d };
        }
      });
      payload.promo_config = Object.keys(pr).length ? JSON.stringify(pr, null, 1) : '';
    }
    try {
      await Api.put('/settings', payload);
      dirty = false;
      UI.toast(t('set_saved'), 'var(--success)');
      render();
    } catch (e) { UI.toast(e.message, 'var(--danger)'); }
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('set_title')),
      UI.h('div', { class: 'page-sub' }, t('set_sub'))),
    zone);

  load();
};
