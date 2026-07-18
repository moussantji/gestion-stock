// ============================================================
// 🛒 Commandes fournisseurs — génération auto (prévisions de
// rupture), brouillon éditable, envoi, réception partielle, PDF.
// Réservé admin/manager.
// ============================================================
window.Screens = window.Screens || {};

Screens.orders = async (view) => {
  const t = I18n.t;
  let orders = [];
  let forecast = null; // 📊 v2.12 : prévisions d'achat par fournisseur (clé additive — null = masqué)

  const zone = UI.h('div', { style: { marginTop: '14px' } });

  const statusMeta = (s) => ({
    draft: ['muted', `📝 ${t('po_status_draft')}`],
    sent: ['info', `✉️ ${t('po_status_sent')}`],
    partial: ['warning', `📥 ${t('po_status_partial')}`],
    received: ['success', `✅ ${t('po_status_received')}`],
  }[s] ?? ['muted', s]);

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.h('div', { class: 'card' }, UI.spinner()));
    try {
      orders = (await Api.get('/purchase-orders', { per_page: 50 })).data ?? [];
      // 📊 v2.12 : prévisions par fournisseur (route existante, param additif — non bloquant)
      try {
        const fr = await Api.get('/products/restock-forecast', { days: 30, lead: 15, by_supplier: 1 });
        forecast = fr?.suppliers ?? null;
      } catch { forecast = null; }
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (forecast) zone.appendChild(forecastCard()); // 📊 v2.12
    if (!orders.length) {
      zone.appendChild(UI.empty('🛒', t('po_none'), t('po_none_sub')));
      return;
    }
    orders.forEach((po) => zone.appendChild(row(po)));
  }

  function row(po) {
    const [tone, label] = statusMeta(po.status);
    const open = po.status !== 'received';
    const detail = UI.h('div', { style: { display: 'none', padding: '0 14px 14px' } });

    const head = UI.h('div', {
      class: 'form-row', style: { alignItems: 'center', cursor: 'pointer', padding: '4px 14px' },
      onclick: () => toggle(po, detail),
    },
      UI.h('div', { style: { width: '200px' } },
        UI.h('div', { class: 'strong mono' }, Fmt.esc(po.number ?? `#${po.id}`)),
        UI.h('div', { class: 'muted' }, Fmt.date(po.created_at))),
      UI.h('div', { style: { flex: 1 } },
        UI.h('div', { class: 'strong' }, `🚛 ${Fmt.esc(po.supplier?.name ?? '—')}`),
        UI.h('div', { class: 'muted' }, `${Fmt.num(po.items_count ?? (po.items?.length ?? 0))} ${t('po_items')} · ${t('r_by')} ${Fmt.esc(po.user?.name ?? '—')}`)),
      UI.h('div', { class: 'num strong', style: { color: 'var(--accent)', marginRight: '12px' } }, Fmt.money(po.total_estimated ?? 0)),
      UI.badge(tone, label));

    const card = UI.h('div', { class: 'card', style: { padding: 0, marginBottom: '10px' } }, head, detail);

    if (!open) head.style.cursor = 'pointer'; // réceptionnée → détail lecture seule
    return card;
  }

  async function toggle(po, detail) {
    if (detail.style.display !== 'none') { detail.style.display = 'none'; return; }
    detail.style.display = '';
    detail.innerHTML = '';
    detail.appendChild(UI.spinner());

    let full = po;
    try {
      full = (await Api.get(`/purchase-orders/${po.id}`)).data ?? po;
      orders = orders.map((o) => (o.id === po.id ? { ...o, ...full } : o));
    } catch (e) {
      detail.innerHTML = '';
      detail.appendChild(UI.empty('⚠️', e.message));
      return;
    }

    detail.innerHTML = '';
    const isDraft = full.status === 'draft';

    detail.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('m_product'), t('p_purchase'), t('po_line_qty'), t('po_received_qty'), t('s_total')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, (full.items ?? []).map((it) => {
        const rcv = it.received_qty ?? 0;
        const cells = [
          UI.h('td', { class: 'strong' }, Fmt.esc(it.product_name ?? '—')),
          UI.h('td', { class: 'num muted' }, Fmt.money(it.unit_price ?? 0)),
        ];
        if (isDraft) {
          const qty = UI.input({ type: 'number', min: 1, value: it.quantity, style: { width: '84px' } });
          const saveBtn = UI.h('button', {
            class: 'btn btn-sm', title: t('save'),
            onclick: async () => {
              const v = Math.max(1, parseInt(qty.value, 10) || 1);
              try {
                const res = await Api.put(`/purchase-orders/${full.id}/items/${it.id}`, { quantity: v });
                Object.assign(full, res.data ?? {});
                UI.toast(t('po_qty_saved'), 'var(--success)');
                load();
              } catch (e) { UI.toast(e.message, 'var(--danger)'); }
            },
          }, '💾');
          cells.push(UI.h('td', {}, UI.h('div', { class: 'form-row', style: { alignItems: 'center', gap: '6px' } }, qty, saveBtn)));
        } else {
          cells.push(UI.h('td', { class: 'num' }, Fmt.num(it.quantity)));
        }
        cells.push(
          UI.h('td', { class: 'num', style: { color: rcv >= (it.quantity ?? 0) ? 'var(--success)' : 'var(--muted)' } },
            full.status === 'partial' || full.status === 'received' ? `${Fmt.num(rcv)} / ${Fmt.num(it.quantity)}` : '—'),
          UI.h('td', { class: 'num strong' }, Fmt.money(it.subtotal ?? 0)));
        return UI.h('tr', { style: rcv >= (it.quantity ?? 0) && full.status !== 'draft' ? { opacity: 0.55 } : null }, ...cells);
      }))));

    // Actions (selon statut)
    const actions = UI.h('div', { class: 'form-row', style: { marginTop: '12px' } });

    if (isDraft) {
      actions.appendChild(UI.h('div', { class: 'muted', style: { flex: 1, alignSelf: 'center' } }, `✏️ ${t('po_open_hint')}`));
      actions.appendChild(UI.h('button', {
        class: 'btn btn-primary',
        onclick: async () => {
          if (!(await UI.confirm(t('po_send_q', { number: full.number }), { okText: `✉️ ${t('po_send')}` }))) return;
          try { await Api.post(`/purchase-orders/${full.id}/send`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
        },
      }, `✉️ ${t('po_send')}`));
    }

    if (full.status === 'sent' || full.status === 'partial') {
      actions.appendChild(UI.h('div', { style: { flex: 1 } }));
      actions.appendChild(UI.h('button', {
        class: 'btn btn-success',
        onclick: () => openReceive(full),
      }, `📥 ${t('po_receive')}`));
    }

    actions.appendChild(UI.h('button', {
      class: 'btn',
      onclick: () => Api.download(`/purchase-orders/${full.id}/pdf`, `${full.number}.pdf`)
        .catch((e) => UI.toast(e.message, 'var(--danger)')),
    }, `📄 ${t('po_pdf')}`));

    if (full.status !== 'received') {
      actions.appendChild(UI.h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (!(await UI.confirm(t('po_cancel_q', { number: full.number }), { danger: true, okText: t('po_cancel') }))) return;
          try { await Api.delete(`/purchase-orders/${full.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
        },
      }, `🗑 ${t('po_cancel')}`));
    }

    detail.appendChild(actions);
  }

  // ---------- 📥 Réception (partielle possible) ----------
  function openReceive(po) {
    const items = po.items ?? [];
    const inputs = {}; // item_id -> {input, remaining}
    const rows = items.map((it) => {
      const remaining = Math.max(0, (it.quantity ?? 0) - (it.received_qty ?? 0));
      const qty = UI.input({ type: 'number', min: 0, max: remaining, value: remaining, style: { width: '90px' } });
      inputs[it.id] = { input: qty, remaining };
      return UI.h('tr', {},
        UI.h('td', { class: 'strong' }, Fmt.esc(it.product_name ?? '—')),
        UI.h('td', { class: 'num muted' }, `${Fmt.num(it.received_qty ?? 0)} / ${Fmt.num(it.quantity)}`),
        UI.h('td', {}, qty));
    });

    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, `📥 ${t('po_receive')}`);
    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      const payload = Object.entries(inputs)
        .map(([id, { input }]) => ({ item_id: Number(id), received_qty: Math.max(0, parseInt(input.value, 10) || 0) }))
        .filter((l) => l.received_qty > 0);
      if (!payload.length) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('po_rcv_none'); return; }
      btn.disabled = true;
      try {
        const res = await Api.post(`/purchase-orders/${po.id}/receive`, { items: payload });
        UI.toast(res.message ?? t('po_receive_done'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `📥 ${t('po_receive')} — ${po.number}`, width: 'lg',
      children: [
        errBox,
        UI.h('table', { class: 'tbl' },
          UI.h('thead', {}, UI.h('tr', {},
            UI.h('th', {}, t('m_product')), UI.h('th', {}, t('po_received_qty')), UI.h('th', {}, t('po_to_receive')))),
          UI.h('tbody', {}, rows)),
        UI.h('div', { class: 'form-row', style: { marginTop: '12px' } },
          UI.h('button', {
            class: 'btn',
            onclick: () => Object.values(inputs).forEach(({ input, remaining }) => { input.value = remaining; }),
          }, t('po_fill_all')),
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
  }

  // 📊 v2.12 : carte « Prévisions d'achat » — chez qui commander, et combien (15 j)
  function forecastCard() {
    const card = UI.h('div', { class: 'card', style: { marginBottom: '12px', borderLeft: '3px solid var(--primary)' } });
    card.appendChild(UI.h('div', { class: 'card-title' }, `📊 ${t('pf2_title')}`));
    card.appendChild(UI.h('div', { class: 'muted', style: { fontSize: '12px', margin: '3px 0 8px' } }, t('pf2_hint')));
    if (!forecast.length) {
      card.appendChild(UI.h('div', { class: 'muted' }, `✅ ${t('pf2_ok')}`));
      return card;
    }
    forecast.forEach((s) => {
      card.appendChild(UI.h('div', { class: 'kv', style: { alignItems: 'flex-start' } },
        UI.h('div', { style: { flex: 1 } },
          UI.h('div', { class: 'strong' }, `🚛 ${Fmt.esc(s.name ?? '—')}`),
          UI.h('div', { class: 'muted', style: { fontSize: '11.5px', marginTop: '2px' } },
            (s.lines ?? []).slice(0, 4).map((l) => `${Fmt.esc(l.name)} ×${l.suggested_order}${l.days_left != null ? ` (${l.days_left} j)` : ''}`).join(' · ')
              + ((s.lines ?? []).length > 4 ? ` · +${s.lines.length - 4}` : ''))),
        UI.badge('primary', t('pf2_qty', { qty: Fmt.num(s.total_qty ?? 0) }))));
    });
    return card;
  }

  // ---------- ✨ Génération auto ----------
  async function generate() {
    if (!(await UI.confirm(t('po_generate_q'), { okText: '✨ OK' }))) return;
    try {
      const res = await Api.post('/purchase-orders/generate');
      UI.toast(res.message ?? t('po_generated', { count: res.created ?? 0 }), res.created > 0 ? 'var(--success)' : 'var(--info)', 5000);
      load();
    } catch (e) { UI.toast(e.message, 'var(--danger)'); }
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('po_title')),
      UI.h('div', { class: 'page-sub' }, t('po_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: generate }, `✨ ${t('po_generate')}`)),
    zone);

  load();
};
