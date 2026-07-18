// ============================================================
// 🔄 Mouvements — historique + nouvelle entrée/sortie
// (badges transferts ↗️↙️ comme l'app v13/14)
// ============================================================
window.Screens = window.Screens || {};

Screens.movements = async (view) => {
  const t = I18n.t;
  let page = 1, lastPage = 1, filter = '';
  const products = (await Api.get('/products', { all: 1, sort: 'name' }))?.data ?? [];

  const TYPE_META = {
    in: { ico: '⬇️', tone: 'success', sign: '+' },
    out: { ico: '⬆️', tone: 'danger', sign: '−' },
    transfer_in: { ico: '↙️', tone: 'info', sign: '+' },
    transfer_out: { ico: '↗️', tone: 'info', sign: '−' },
  };

  const FILTERS = [
    { key: '', label: `🔄 ${t('all')}` },
    { key: 'in', label: `⬇️ ${t('m_in')}` },
    { key: 'out', label: `⬆️ ${t('m_out')}` },
    { key: 'transfer_in', label: `🔁 ${t('m_transfers')}` },
  ];

  const chips = UI.h('div', { class: 'chips' }, FILTERS.map((f) => UI.h('button', {
    class: `chip ${filter === f.key ? 'active' : ''}`,
    onclick: (e) => {
      filter = f.key;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      page = 1; load();
    },
  }, f.label)));

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });
  const pager = UI.h('div', { class: 'form-row', style: { justifyContent: 'center', marginTop: '12px', alignItems: 'center' } });

  async function load() {
    zone.innerHTML = ''; zone.appendChild(UI.spinner());
    const res = await Api.get('/movements', { page, per_page: 20, type: filter || undefined });
    const items = res.data ?? [];
    lastPage = res.last_page ?? 1;
    zone.innerHTML = '';

    if (!items.length) { zone.appendChild(UI.empty('🔄', t('m_none'))); }
    else {
      zone.appendChild(UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {},
          ...['', t('m_product'), t('m_qty'), t('m_reason'), t('m_user'), t('m_date')].map((x) => UI.h('th', {}, x)))),
        UI.h('tbody', {}, items.map((m) => {
          const tm = TYPE_META[m.type] ?? { ico: '🔄', tone: 'muted', sign: '' };
          return UI.h('tr', {},
            UI.h('td', {}, UI.badge(tm.tone, tm.ico)),
            UI.h('td', { class: 'strong' }, Fmt.esc(m.product?.name ?? '—'),
              UI.h('div', { class: 'muted mono' }, Fmt.esc(m.product?.sku ?? ''))),
            UI.h('td', { class: 'num strong', style: { color: `var(--${tm.tone})` } }, `${tm.sign}${m.quantity}`),
            UI.h('td', { class: 'muted', style: { maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              Fmt.esc(m.reason ?? '—')),
            UI.h('td', { class: 'muted' }, Fmt.esc(m.user?.name ?? '—')),
            UI.h('td', { class: 'muted' }, Fmt.dateTime(m.created_at)));
        }))));
    }

    pager.innerHTML = '';
    if (lastPage > 1) {
      pager.append(
        UI.h('button', { class: 'btn btn-sm', disabled: page <= 1, onclick: () => { page--; load(); } }, t('m_prev')),
        UI.h('span', { class: 'muted' }, t('m_page', { a: page, b: lastPage })),
        UI.h('button', { class: 'btn btn-sm', disabled: page >= lastPage, onclick: () => { page++; load(); } }, t('m_next')));
    }
  }

  // ---------- Nouveau mouvement ----------
  function openForm() {
    const prodSelect = UI.select({}, products.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.shop_stock ?? p.quantity})`,
    })));
    const typeSelect = UI.select({}, [
      { value: 'in', label: t('m_type_in') },
      { value: 'out', label: t('m_type_out') },
    ]);
    const qty = UI.input({ type: 'number', min: 1, value: 1 });
    const price = UI.input({ type: 'number', min: 0, placeholder: t('p_optional') });
    const reason = UI.input({ placeholder: t('m_reason_ph') });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('save'));

    typeSelect.addEventListener('change', () => {
      const p = products.find((x) => String(x.id) === prodSelect.value);
      if (p) price.value = typeSelect.value === 'in' ? p.purchase_price : p.sale_price;
    });
    prodSelect.addEventListener('change', () => typeSelect.dispatchEvent(new Event('change')));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      btn.disabled = true;
      try {
        await Api.post('/movements', {
          product_id: Number(prodSelect.value),
          type: typeSelect.value,
          quantity: Number(qty.value) || 1,
          unit_price: price.value ? Number(price.value) : undefined,
          reason: reason.value.trim() || undefined,
          client_uuid: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        UI.toast(t('m_saved'), 'var(--success)');
        close(); load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: t('m_new'), icon: '🔄',
      children: [
        errBox,
        UI.field(t('m_product'), prodSelect),
        UI.h('div', { class: 'form-row' },
          UI.field(t('actions'), typeSelect),
          UI.field(t('m_qty'), qty)),
        UI.field(`${t('p_price')} (${t('p_optional')})`, price),
        UI.field(t('m_reason'), reason),
        UI.h('div', { class: 'form-row', style: { marginTop: '6px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')), btn),
      ],
    });
    typeSelect.dispatchEvent(new Event('change'));
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('m_title')),
      UI.h('div', { class: 'page-sub' }, t('m_sub'))),
    UI.h('div', { class: 'form-row no-print', style: { alignItems: 'center' } },
      chips, UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: openForm }, `＋ ${t('m_new')}`)),
    zone, pager);
  load();
};
