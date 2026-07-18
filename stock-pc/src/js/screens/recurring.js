// ============================================================
// 🔁 Ventes récurrentes — abonnements clients (hebdo/mensuel).
// L'API génère automatiquement les reçus échus (tâche planifiée)
// + lancement manuel possible. Réservé admin/manager.
// ============================================================
window.Screens = window.Screens || {};

Screens.recurring = async (view) => {
  const t = I18n.t;
  let items = [];
  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      items = (await Api.get('/recurring-sales'))?.data ?? [];
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  const freqLabel = (f) => (f === 'monthly' ? `📅 ${t('rs_monthly')}` : `📅 ${t('rs_weekly')}`);

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('🔁', t('rs_none'), t('rs_none_sub')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('rs_customer'), t('rs_frequency'), t('rs_next'), t('rs_total'), t('r_status'), t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((s) => {
        const active = s.status === 'active';
        return UI.h('tr', {},
          UI.h('td', {},
            UI.h('div', { class: 'strong' }, `👤 ${Fmt.esc(s.customer?.name ?? '—')}`),
            s.label ? UI.h('div', { class: 'muted' }, Fmt.esc(s.label)) : null,
            UI.h('div', { class: 'muted' }, `${Fmt.num((s.items ?? []).length)} ${t('po_items')}`)),
          UI.h('td', { class: 'muted' }, freqLabel(s.frequency)),
          UI.h('td', { class: 'muted' }, Fmt.date(s.next_run_at)),
          UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(s.total ?? 0)),
          UI.h('td', {}, active
            ? UI.badge('success', `✓ ${t('rs_status_active')}`)
            : UI.badge('muted', `⏸ ${t('rs_status_paused')}`)),
          UI.h('td', {},
            UI.h('button', {
              class: 'btn btn-sm btn-success', title: t('rs_run'),
              onclick: async () => {
                if (!(await UI.confirm(t('rs_run_q'), { okText: `▶️ ${t('rs_run')}` }))) return;
                try {
                  const res = await Api.post(`/recurring-sales/${s.id}/run`);
                  UI.toast(t('rs_run_ok', { number: res.data?.number ?? '' }), 'var(--success)', 5000);
                  load();
                } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '▶️'),
            UI.h('button', {
              class: 'btn btn-sm', title: active ? t('rs_pause') : t('rs_resume'),
              onclick: async () => {
                try {
                  await Api.put(`/recurring-sales/${s.id}`, { status: active ? 'paused' : 'active' });
                  load();
                } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, active ? '⏸' : '▶️'),
            UI.h('button', {
              class: 'btn btn-sm btn-ghost',
              onclick: async () => {
                if (!(await UI.confirm(t('rs_delete_msg'), { danger: true, okText: t('delete') }))) return;
                try { await Api.delete(`/recurring-sales/${s.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '🗑')));
      }))));
  }

  // ---------- Création ----------
  async function openCreate() {
    let customers = [];
    let products = [];
    try {
      const [cRes, pRes] = await Promise.all([
        Api.get('/customers', { all: 1 }),
        Api.get('/products', { per_page: 200 }).then((r) => ({ data: r.data?.data ?? r.data ?? [] })),
      ]);
      customers = cRes.data ?? [];
      products = pRes.data ?? [];
    } catch (e) { UI.toast(e.message, 'var(--danger)'); return; }

    const customer = UI.select({}, [
      { value: '', label: `— ${t('rs_customer')} —` },
      ...customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ' · ' + c.phone : ''}` })),
    ]);
    const label = UI.input({ placeholder: t('p_optional') });
    const firstDate = UI.input({ type: 'date' });
    let frequency = 'weekly';
    const freqChips = UI.h('div', { class: 'chips' });
    const lines = []; // {product_id, name, price, qty}
    const linesZone = UI.h('div', { style: { marginTop: '8px' } });
    const totalEl = UI.h('div', { class: 'strong', style: { color: 'var(--accent)', marginTop: '6px' } });
    const errBox = UI.h('div', { style: { display: 'none' } });

    [['weekly', `📅 ${t('rs_weekly')}`], ['monthly', `🗓 ${t('rs_monthly')}`]].forEach(([key, lab]) => {
      const c = UI.h('button', { class: `chip ${frequency === key ? 'active' : ''}` }, lab);
      c.addEventListener('click', () => {
        frequency = key;
        freqChips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
        c.classList.add('active');
      });
      freqChips.appendChild(c);
    });

    // Typeahead produit
    const search = UI.input({ placeholder: t('s_search_ph') });
    const suggZone = UI.h('div');

    function computeTotal() {
      const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
      totalEl.textContent = `${t('rs_total')} : ${Fmt.moneyFull(total)}`;
    }

    function renderSuggestions() {
      suggZone.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) return;
      products
        .filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
        .filter((p) => !lines.some((l) => l.product_id === p.id))
        .slice(0, 6)
        .forEach((p) => {
          suggZone.appendChild(UI.h('div', {
            class: 'form-row', style: { alignItems: 'center', cursor: 'pointer', padding: '6px 8px' },
            onclick: () => {
              lines.push({ product_id: p.id, name: p.name, price: Number(p.sale_price ?? 0), qty: 1 });
              search.value = '';
              renderSuggestions();
              renderLines();
            },
          },
            UI.h('span', { style: { flex: 1 } }, Fmt.esc(p.name)),
            UI.h('span', { class: 'muted' }, Fmt.money(p.sale_price))));
        });
    }
    search.addEventListener('input', renderSuggestions);

    function renderLines() {
      linesZone.innerHTML = '';
      lines.forEach((l, idx) => {
        const qtyLabel = UI.h('span', { class: 'strong', style: { minWidth: '26px', textAlign: 'center' } }, `${l.qty}`);
        linesZone.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', marginBottom: '6px' } },
          UI.h('div', { style: { flex: 1 } },
            UI.h('div', { class: 'strong' }, Fmt.esc(l.name)),
            UI.h('div', { class: 'muted' }, Fmt.money(l.price))),
          UI.h('button', { class: 'btn btn-sm', onclick: () => { l.qty = Math.max(1, l.qty - 1); qtyLabel.textContent = `${l.qty}`; computeTotal(); } }, '−'),
          qtyLabel,
          UI.h('button', { class: 'btn btn-sm', onclick: () => { l.qty += 1; qtyLabel.textContent = `${l.qty}`; computeTotal(); } }, '＋'),
          UI.h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { lines.splice(idx, 1); renderLines(); } }, '✕')));
      });
      computeTotal();
    }

    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('create'));
    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!customer.value) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('rs_need_customer'); return; }
      if (!lines.length) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('rs_no_lines'); return; }
      const dateVal = firstDate.value; // YYYY-MM-DD (input type=date)
      btn.disabled = true;
      try {
        await Api.post('/recurring-sales', {
          customer_id: Number(customer.value),
          label: label.value.trim() || undefined,
          frequency,
          next_run_at: dateVal || undefined,
          items: lines.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
        });
        UI.toast(t('rs_created'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `🔁 ${t('rs_new')}`, width: 'lg',
      children: [
        errBox,
        UI.h('div', { class: 'form-row' }, UI.field(t('rs_customer'), customer)),
        UI.h('div', { class: 'form-row' }, UI.field(t('rs_label'), label), UI.field(t('rs_first_date'), firstDate)),
        UI.h('div', { class: 'field' }, UI.h('label', {}, t('rs_frequency')), freqChips),
        UI.h('div', { class: 'field' }, UI.h('label', {}, t('rs_items')), search, suggZone, linesZone, totalEl),
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
      UI.h('div', { class: 'page-title' }, t('rs_title')),
      UI.h('div', { class: 'page-sub' }, t('rs_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: openCreate }, `＋ ${t('rs_new')}`)),
    zone);

  load();
};
