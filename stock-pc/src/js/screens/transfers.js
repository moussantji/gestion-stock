// ============================================================
// 🚚 Transferts — siège ⇆ boutiques, cycle v14 :
// départ immédiat → « en transit » → réception validée (ou annulée).
// Réservé admin/manager (même règle que l'API).
// ============================================================
window.Screens = window.Screens || {};

Screens.transfers = async (view) => {
  const t = I18n.t;
  const me = Api.user();
  const canManage = App.hasRole('admin', 'manager');

  const canReceive = (item) => item.status === 'in_transit'
    && (me?.role === 'admin' || (me?.role === 'manager' && me?.shop_id === item.to_shop_id));
  const canCancel = (item) => item.status === 'in_transit'
    && (me?.role === 'admin' || (me?.role === 'manager' && me?.shop_id === item.from_shop_id));

  const statusMeta = (s) => ({
    in_transit: ['warning', `🚚 ${t('tr_status_in')}`],
    received: ['success', `✓ ${t('tr_status_received')}`],
    cancelled: ['muted', `↩️ ${t('tr_status_cancelled')}`],
  }[s] ?? ['muted', s]);

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });
  let items = [];
  let shops = [];
  let products = null; // lazy, pour la modale de création

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      const [tRes, sRes] = await Promise.all([
        Api.get('/transfers'),
        Api.get('/shops').catch(() => ({ data: [] })),
      ]);
      items = tRes.data ?? [];
      shops = sRes.data ?? [];
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('🚚', t('tr_none'), t('tr_none_sub')));
      return;
    }
    const tbl = UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('po_number'), t('tr_from'), t('tr_to'), t('tr_items'), t('r_status'), t('tr_sent_at'), t('actions')]
          .map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((tr) => {
        const [tone, label] = statusMeta(tr.status);
        return UI.h('tr', { style: { cursor: 'pointer' }, onclick: () => openDetail(tr) },
          UI.h('td', { class: 'strong mono' }, Fmt.esc(tr.reference ?? `#${tr.id}`)),
          UI.h('td', {}, Fmt.esc(tr.from_name ?? '🏠')),
          UI.h('td', {}, Fmt.esc(tr.to_name ?? '🏠')),
          UI.h('td', { class: 'num' }, Fmt.num(tr.items_count ?? (tr.items?.length ?? 0))),
          UI.h('td', {}, UI.badge(tone, label)),
          UI.h('td', { class: 'muted' }, Fmt.dateTime(tr.sent_at ?? tr.created_at)));
      })));
    zone.appendChild(tbl);
  }

  // ---------- Détail + actions ----------
  async function openDetail(tr) {
    const body = UI.h('div', {}, UI.spinner());
    const { close } = UI.modal({ title: `🚚 ${tr.reference ?? `#${tr.id}`}`, width: 'lg', children: body });

    let full = tr;
    try {
      full = (await Api.get(`/transfers/${tr.id}`)).data ?? tr;
    } catch (e) {
      body.innerHTML = '';
      body.appendChild(UI.empty('⚠️', e.message));
      return;
    }

    const [tone, label] = statusMeta(full.status);
    body.innerHTML = '';
    body.append(
      UI.h('div', { class: 'form-row', style: { alignItems: 'center', marginBottom: '10px' } },
        UI.badge(tone, label),
        full.note ? UI.h('span', { class: 'muted' }, `📝 ${Fmt.esc(full.note)}`) : null),
      UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {}, UI.h('th', {}, t('m_product')), UI.h('th', {}, t('m_qty')))),
        UI.h('tbody', {}, (full.items ?? []).map((it) => UI.h('tr', {},
          UI.h('td', {}, Fmt.esc(it.product?.name ?? `#${it.product_id}`)),
          UI.h('td', { class: 'num strong' }, Fmt.num(it.quantity)))))),
      UI.h('div', { class: 'card', style: { marginTop: '12px', padding: '12px 14px' } },
        UI.kv(t('tr_from'), Fmt.esc(full.from_name ?? '🏠')),
        UI.kv(t('tr_to'), Fmt.esc(full.to_name ?? '🏠')),
        UI.kv(t('tr_sent_at'), Fmt.dateTime(full.sent_at ?? full.created_at)),
        full.received_at ? UI.kv(t('tr_received_at'), Fmt.dateTime(full.received_at)) : null,
        full.receiver?.name ? UI.kv(t('tr_received_by'), Fmt.esc(full.receiver.name)) : null,
        UI.kv(t('tr_by'), Fmt.esc(full.user?.name ?? '—'))));

    if (canManage && (canReceive(full) || canCancel(full))) {
      const busy = UI.h('span', { class: 'muted', style: { display: 'none' } }, '…');
      const row = UI.h('div', { class: 'form-row', style: { marginTop: '12px' } }, busy);
      if (canReceive(full)) {
        row.prepend(UI.h('button', {
          class: 'btn btn-success',
          onclick: async () => {
            if (!(await UI.confirm(t('tr_receive_q', { ref: full.reference ?? '' }), { okText: `✓ ${t('tr_receive')}` }))) return;
            busy.style.display = '';
            try {
              const res = await Api.post(`/transfers/${full.id}/receive`);
              UI.toast(res.message ?? t('tr_received_done'), 'var(--success)');
              close();
              load();
            } catch (e) { UI.toast(e.message, 'var(--danger)'); busy.style.display = 'none'; }
          },
        }, `✓ ${t('tr_receive')}`));
      }
      if (canCancel(full)) {
        row.append(UI.h('button', {
          class: 'btn btn-danger',
          onclick: async () => {
            if (!(await UI.confirm(t('tr_cancel_q', { ref: full.reference ?? '' }), { danger: true, okText: `↩️ ${t('tr_cancel_btn')}` }))) return;
            busy.style.display = '';
            try {
              const res = await Api.post(`/transfers/${full.id}/cancel`);
              UI.toast(res.message ?? t('tr_cancel_done'), 'var(--success)');
              close();
              load();
            } catch (e) { UI.toast(e.message, 'var(--danger)'); busy.style.display = 'none'; }
          },
        }, `↩️ ${t('tr_cancel_btn')}`));
      }
      body.appendChild(row);
    }
  }

  // ---------- Création ----------
  async function openCreate() {
    if (!products) {
      try {
        products = (await Api.get('/products', { all: 1, sort: 'name' })).data ?? [];
      } catch (e) { UI.toast(e.message, 'var(--danger)'); return; }
    }
    const shopOpts = [
      { value: '', label: `🏠 ${t('tr_hq')}` },
      ...shops.filter((s) => s.is_active !== false).map((s) => ({ value: s.id, label: `🏬 ${s.name}` })),
    ];
    const fromSel = UI.select({}, shopOpts);
    const toSel = UI.select({}, shopOpts);
    if (me?.shop_id) fromSel.value = me.shop_id;
    const note = UI.input({ placeholder: t('p_optional') });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const lines = []; // {product_id, name, quantity, max}
    const linesZone = UI.h('div', { style: { marginTop: '8px' } });

    // Mini-recherche produit (typeahead)
    const search = UI.input({ placeholder: t('s_search_ph') });
    const suggZone = UI.h('div');

    const maxFor = (p) => (fromSel.value === '' ? (p.quantity ?? 0) : (p.shop_stock ?? 0));

    function renderSuggestions() {
      suggZone.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) return;
      products
        .filter((p) => (p.name ?? '').toLowerCase().includes(q)
          || (p.sku ?? '').toLowerCase().includes(q)
          || (p.barcode ?? '').toLowerCase().includes(q))
        .filter((p) => !lines.some((l) => l.product_id === p.id))
        .slice(0, 6)
        .forEach((p) => {
          suggZone.appendChild(UI.h('div', {
            class: 'form-row', style: { alignItems: 'center', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px' },
            onclick: () => { addLine(p); },
          },
            UI.h('span', { style: { flex: 1 } }, Fmt.esc(p.name)),
            UI.h('span', { class: 'muted' }, `${t('m_stock')} ${maxFor(p)}`)));
        });
    }

    function addLine(p) {
      const max = maxFor(p);
      if (max <= 0) { UI.toast(`${p.name} — ${t('s_no_stock')}`, 'var(--warning)'); return; }
      lines.push({ product_id: p.id, name: p.name, quantity: 1, max });
      search.value = '';
      renderSuggestions();
      renderLines();
    }
    search.addEventListener('input', renderSuggestions);
    fromSel.addEventListener('change', () => {
      lines.forEach((l) => {
        const p = products.find((x) => x.id === l.product_id);
        l.max = p ? maxFor(p) : l.max;
        l.quantity = Math.min(l.quantity, Math.max(1, l.max));
      });
      renderLines();
      renderSuggestions();
    });

    function renderLines() {
      linesZone.innerHTML = '';
      lines.forEach((l, idx) => {
        const qtyLabel = UI.h('span', { class: 'strong', style: { minWidth: '30px', textAlign: 'center' } }, `${l.quantity}`);
        linesZone.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', marginBottom: '6px' } },
          UI.h('div', { style: { flex: 1 } },
            UI.h('div', { class: 'strong' }, Fmt.esc(l.name)),
            UI.h('div', { class: 'muted' }, `${t('tr_max')} : ${l.max}`)),
          UI.h('button', { class: 'btn btn-sm', onclick: () => { l.quantity = Math.max(1, l.quantity - 1); qtyLabel.textContent = `${l.quantity}`; } }, '−'),
          qtyLabel,
          UI.h('button', { class: 'btn btn-sm', onclick: () => { l.quantity = Math.min(l.max, l.quantity + 1); qtyLabel.textContent = `${l.quantity}`; } }, '＋'),
          UI.h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { lines.splice(idx, 1); renderLines(); } }, '✕')));
      });
    }

    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, `🚚 ${t('tr_send')}`);
    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (fromSel.value === toSel.value) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('tr_same'); return;
      }
      if (!lines.length) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('tr_no_lines'); return;
      }
      btn.disabled = true;
      try {
        const res = await Api.post('/transfers', {
          from_shop_id: fromSel.value === '' ? null : Number(fromSel.value),
          to_shop_id: toSel.value === '' ? null : Number(toSel.value),
          note: note.value.trim() || null,
          items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        });
        UI.toast(res.message ?? t('tr_done'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `🚚 ${t('tr_new')}`, width: 'lg',
      children: [
        errBox,
        UI.h('div', { class: 'form-row' },
          UI.field(t('tr_from'), fromSel),
          UI.field(t('tr_to'), toSel)),
        UI.field(t('tr_note'), note),
        UI.h('div', { class: 'field' }, UI.h('label', {}, t('tr_items')), search, suggZone, linesZone),
        UI.h('div', { class: 'form-row', style: { marginTop: '10px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
    renderLines();
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('tr_title')),
      UI.h('div', { class: 'page-sub' }, t('tr_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      canManage ? UI.h('button', { class: 'btn btn-primary', onclick: () => openCreate() }, `＋ ${t('tr_new')}`) : null),
    zone);

  load();
};
