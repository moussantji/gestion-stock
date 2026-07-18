// ============================================================
// 🧾 Reçus — historique des ventes, crédits, versements,
// avoir total / partiel (mêmes endpoints que le mobile).
// ============================================================
window.Screens = window.Screens || {};

Screens.receipts = async (view) => {
  const t = I18n.t;
  let tab = 'receipts', page = 1, lastPage = 1;
  const canManage = App.hasRole('admin', 'manager');

  const chips = UI.h('div', { class: 'chips' });
  const banner = UI.h('div');
  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });
  const pager = UI.h('div', { class: 'form-row', style: { justifyContent: 'center', marginTop: '12px', alignItems: 'center' } });

  const TABS = [
    { key: 'receipts', label: `🧾 ${t('r_tab_receipts')}` },
    { key: 'credits', label: `💳 ${t('r_tab_credits')}` },
  ];

  const clientName = (r) => r.customer?.name ?? r.client_name ?? t('s_walkin');

  function statusBadge(r) {
    if (r.status === 'refunded') return UI.badge('danger', `↩️ ${t('r_status_refunded')}`);
    if (Number(r.remaining ?? 0) > 0) return UI.badge('warning', `💳 ${t('r_status_credit')}`);
    return UI.badge('success', `✓ ${t('r_status_paid')}`);
  }

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    banner.innerHTML = '';
    pager.innerHTML = '';

    try {
      if (tab === 'credits') {
        const res = await Api.get('/receipts/credits');
        const items = res.data ?? [];
        banner.appendChild(UI.h('div', { class: 'grid grid-cols-3', style: { marginBottom: '12px' } },
          UI.statCard('💳', Fmt.moneyFull(res.outstanding_total ?? 0), t('r_outstanding'), 'var(--warning)'),
          UI.statCard('🧾', Fmt.num(items.length), t('r_tab_credits'), 'var(--info)'),
          UI.statCard('👥', Fmt.num(new Set(items.map((r) => r.customer_id ?? r.client_name)).size), t('nav_customers'), 'var(--primary)')));
        render(items, null);
      } else {
        const res = await Api.get('/receipts', { page, per_page: 20 });
        lastPage = res.last_page ?? 1;
        render(res.data ?? [], true);
      }
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render(items, withPager) {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(tab === 'credits'
        ? UI.empty('🎉', t('r_none_credit'))
        : UI.empty('🧾', t('r_none'), t('r_none_sub')));
    } else {
      const tbl = UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {},
          ...[t('r_number'), t('r_client'), t('s_total'), t('r_remaining'), t('r_status'), t('r_since'), t('actions')]
            .map((x) => UI.h('th', {}, x)))),
        UI.h('tbody', {}, items.map((r) => UI.h('tr', {},
          UI.h('td', {},
            UI.h('div', { class: 'strong mono' }, Fmt.esc(r.number)),
            UI.h('div', { class: 'muted' }, `${r.items_count ?? 0} ${t('r_items')}`)),
          UI.h('td', {}, Fmt.esc(clientName(r))),
          UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(r.total)),
          UI.h('td', { class: 'num', style: { color: Number(r.remaining ?? 0) > 0 ? 'var(--warning)' : 'var(--muted)' } },
            Fmt.money(r.remaining ?? 0)),
          UI.h('td', {}, statusBadge(r)),
          UI.h('td', { class: 'muted' }, Fmt.dateTime(r.created_at)),
          UI.h('td', {}, UI.h('button', { class: 'btn btn-sm', onclick: () => openDetail(r) }, '👁'))))));
      zone.appendChild(tbl);
    }

    if (withPager && lastPage > 1) {
      pager.append(
        UI.h('button', { class: 'btn btn-sm', disabled: page <= 1, onclick: () => { page--; load(); } }, t('m_prev')),
        UI.h('span', { class: 'muted' }, t('m_page', { a: page, b: lastPage })),
        UI.h('button', { class: 'btn btn-sm', disabled: page >= lastPage, onclick: () => { page++; load(); } }, t('m_next')));
    }
  }

  // ---------- Détail d'un reçu ----------
  async function openDetail(r) {
    let full = r;
    const body = UI.h('div', {}, UI.spinner());
    const { close } = UI.modal({ title: t('r_receipt', { number: r.number }), icon: '🧾', width: 'lg', children: body });

    let tvaRes = null; // 🧮 v2.9 : ventilation TVA additive du serveur
    try {
      const res = await Api.get(`/receipts/${r.id}`);
      full = res.data ?? r;
      tvaRes = res.tva ?? null;
    } catch (e) {
      body.innerHTML = '';
      body.appendChild(UI.empty('⚠️', e.message));
      return;
    }

    body.innerHTML = '';
    const items = full.items ?? [];

    body.append(
      UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {},
          ...[t('m_product'), t('m_qty'), t('p_sale'), t('s_total')].map((x) => UI.h('th', {}, x)))),
        UI.h('tbody', {}, items.map((it) => UI.h('tr', {},
          UI.h('td', {},
            UI.h('div', { class: 'strong' }, Fmt.esc(it.product_name ?? '—'), it.promo ? ' ' : null, it.promo ? UI.badge('warning', `🏷️ ${t('pr_badge')}`) : null), // 🏷️ v2.11
            (it.refunded_qty ?? 0) > 0 ? UI.h('span', { class: 'badge badge-danger' }, `↩️ ${it.refunded_qty}`) : null),
          UI.h('td', { class: 'num' }, Fmt.num(it.quantity)),
          UI.h('td', { class: 'num muted' }, Fmt.money(it.unit_price)),
          UI.h('td', { class: 'num strong' }, Fmt.money((it.quantity ?? 0) * (it.unit_price ?? 0))))))),
      UI.h('div', { class: 'card', style: { marginTop: '12px', padding: '12px 14px' } },
        UI.kv(t('r_client'), Fmt.esc(full.customer?.name ?? full.client_name ?? t('s_walkin'))),
        UI.kv(t('s_total'), Fmt.moneyFull(full.total)),
        // 🧮 v2.9 : lignes « dont HT / dont TVA n% » — absentes si TVA désactivée ou vieux serveur
        ...(tvaRes?.enabled && (tvaRes.by_rate ?? []).length
          ? [UI.kv(t('tva_ht'), Fmt.moneyFull(tvaRes.total_ht)),
            ...tvaRes.by_rate.map((row) => UI.kv(t('tva_incl', { rate: row.rate }), Fmt.moneyFull(row.amount)))]
          : []),
        UI.kv(t('s_paid'), Fmt.moneyFull(full.amount_paid)),
        UI.kv(t('r_remaining'), Fmt.moneyFull(full.remaining ?? 0)),
        UI.kv(t('r_by'), Fmt.esc(full.user?.name ?? '—')),
        UI.kv(t('r_since'), Fmt.dateTime(full.created_at))),
      UI.h('div', { class: 'form-row', style: { marginTop: '12px' } },
        UI.h('button', {
          class: 'btn',
          onclick: async () => {
            // 🖨 v1.2 : impression thermique directe si configurée, sinon PDF navigateur
            if (window.Thermal?.isConfigured()) {
              try {
                await Thermal.printById(full.id);
                UI.toast(t('th_printed'), 'var(--success)');
              } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              return;
            }
            Api.download(`/receipts/${full.id}/ticket`, `${full.number}-ticket.pdf`)
              .catch((e) => UI.toast(e.message, 'var(--danger)'));
          },
        }, `🖨 ${window.Thermal?.isConfigured() ? t('th_ticket') : t('s_ticket')}`),
        UI.h('button', {
          class: 'btn',
          onclick: () => Api.download(`/receipts/${full.id}/pdf`, `${full.number}.pdf`)
            .catch((e) => UI.toast(e.message, 'var(--danger)')),
        }, `📄 ${t('s_pdf')}`),
        Number(full.remaining ?? 0) > 0 && full.status !== 'refunded'
          ? UI.h('button', { class: 'btn btn-success', onclick: () => { close(); openPayment(full); } }, `💳 ${t('r_pay')}`)
          : null,
        canManage && full.status !== 'refunded'
          ? UI.h('button', { class: 'btn btn-danger', onclick: () => { close(); openRefund(full); } }, `↩️ ${t('r_refund')}`)
          : null));
  }

  // ---------- 💳 Versement (crédit) ----------
  function openPayment(r) {
    const remaining = Number(r.remaining ?? 0);
    const amount = UI.input({ type: 'number', min: 1, max: remaining, value: remaining });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('save'));

    btn.addEventListener('click', async () => {
      const value = parseInt(amount.value, 10);
      if (!value || value <= 0) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('r_pay_invalid'); return; }
      btn.disabled = true;
      // 🔁 v2.1 : versement hors ligne → file locale, synchronisé au retour du réseau
      if (window.OfflineSales?.isDown?.()) {
        OfflineSales.enqueuePayment({ receiptId: r.id }, value, { client: clientName(r) });
        UI.toast(t('off_pay_queued'), 'var(--info)', 4500);
        close();
        return;
      }
      try {
        const res = await Api.post(`/receipts/${r.id}/payments`, { amount: value });
        const left = Number(res.data?.remaining ?? 0);
        UI.toast(left > 0 ? t('cr_added_msg', { remaining: Fmt.money(left) }) : t('cr_settled'), 'var(--success)');
        close();
        load();
      } catch (e) {
        if (e.network) { // le réseau vient de tomber : on bascule en file plutôt qu'en erreur
          OfflineSales.enqueuePayment({ receiptId: r.id }, value, { client: clientName(r) });
          UI.toast(t('off_pay_queued'), 'var(--info)', 4500);
          close();
          return;
        }
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `💳 ${t('r_pay')} — ${r.number}`,
      children: [
        errBox,
        UI.h('div', { class: 'muted', style: { marginBottom: '10px' } },
          `${Fmt.esc(clientName(r))} · ${t('r_remaining')} : ${Fmt.moneyFull(remaining)}`),
        UI.field(t('r_amount'), amount),
        UI.h('div', { class: 'form-row', style: { marginTop: '6px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
  }

  // ---------- ↩️ Avoir (total ou partiel) ----------
  async function openRefund(r) {
    let full;
    try {
      full = (await Api.get(`/receipts/${r.id}`)).data;
    } catch (e) { UI.toast(e.message, 'var(--danger)'); return; }

    const lines = (full?.items ?? [])
      .map((it) => ({
        id: it.id,
        name: it.product_name ?? '—',
        max: Math.max(0, (it.quantity ?? 0) - (it.refunded_qty ?? 0)),
        qty: 0,
      }))
      .filter((l) => l.max > 0);

    if (!lines.length) { UI.toast(t('avp_nothing'), 'var(--warning)'); return; }

    let mode = 'total';
    const refundCash = UI.input({ type: 'checkbox', checked: true });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const modeChips = UI.h('div', { class: 'chips', style: { marginBottom: '10px' } });
    const linesZone = UI.h('div');

    function renderLines() {
      linesZone.innerHTML = '';
      if (mode !== 'partial') return;
      lines.forEach((l) => {
        const qtyLabel = UI.h('span', { class: 'strong', style: { minWidth: '26px', textAlign: 'center' } }, String(l.qty));
        linesZone.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', marginBottom: '6px' } },
          UI.h('div', { style: { flex: 1 } },
            UI.h('div', { class: 'strong' }, Fmt.esc(l.name)),
            UI.h('div', { class: 'muted' }, `${t('r_refundable')} : ${l.max}`)),
          UI.h('button', {
            class: 'btn btn-sm', onclick: () => { l.qty = Math.max(0, l.qty - 1); qtyLabel.textContent = String(l.qty); },
          }, '−'),
          qtyLabel,
          UI.h('button', {
            class: 'btn btn-sm', onclick: () => { l.qty = Math.min(l.max, l.qty + 1); qtyLabel.textContent = String(l.qty); },
          }, '＋')));
      });
      linesZone.appendChild(UI.h('button', {
        class: 'btn btn-sm',
        onclick: () => { lines.forEach((l) => { l.qty = l.max; }); renderLines(); },
      }, t('r_all_lines')));
    }

    [['total', `↩️ ${t('r_refund_total')}`], ['partial', `✂️ ${t('r_refund_partial')}`]].forEach(([key, label]) => {
      const c = UI.h('button', { class: `chip ${mode === key ? 'active' : ''}` }, label);
      c.addEventListener('click', () => {
        mode = key;
        modeChips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
        c.classList.add('active');
        renderLines();
      });
      modeChips.appendChild(c);
    });

    const btn = UI.h('button', { class: 'btn btn-danger', style: { flex: 1 } }, `↩️ ${t('r_refund')}`);
    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      const payload = { refund_cash: refundCash.checked };
      if (mode === 'partial') {
        const selected = lines.filter((l) => l.qty > 0);
        if (!selected.length) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('r_pick'); return; }
        payload.items = selected.map((l) => ({ receipt_item_id: l.id, quantity: l.qty }));
      }
      btn.disabled = true;
      try {
        const res = await Api.post(`/receipts/${r.id}/refund`, payload);
        const count = lines.reduce((s, l) => s + l.qty, 0);
        const cashNote = res.summary?.cash_out ? ` · ${t('av_cash_done')}` : '';
        const isFull = res.summary?.fully_refunded;
        UI.toast((isFull || mode === 'total'
          ? t('av_done', { number: r.number })
          : t('avp_done', { count })) + cashNote, 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `↩️ ${t('r_refund')} — ${r.number}`,
      children: [
        errBox,
        modeChips,
        linesZone,
        UI.h('label', { class: 'muted', style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' } },
          refundCash, ` ${t('r_refund_cash')}`),
        UI.h('div', { class: 'form-row' },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
    renderLines();
  }

  // ---------- Onglets ----------
  TABS.forEach((tb) => {
    const chip = UI.h('button', { class: `chip ${tab === tb.key ? 'active' : ''}` }, tb.label);
    chip.addEventListener('click', () => {
      tab = tb.key; page = 1;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      load();
    });
    chips.appendChild(chip);
  });

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('r_title')),
      UI.h('div', { class: 'page-sub' }, t('r_sub'))),
    UI.h('div', { class: 'form-row no-print', style: { alignItems: 'center' } }, chips),
    banner,
    zone,
    pager);

  load();
};
