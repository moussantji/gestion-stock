// ============================================================
// 📋 Inventaires — snapshot du stock → comptage physique
// (produit par produit ou recherche) → validation = ajustement
// automatique des quantités (ShopStock::setLevel côté API).
// Réservé admin/manager.
// ============================================================
window.Screens = window.Screens || {};

Screens.inventories = async (view) => {
  const t = I18n.t;
  let items = [];
  const zone = UI.h('div', { style: { marginTop: '14px' } });

  // 📦 v2.11 : état du comptage tournant (n depuis /shop additif, catalogue pour la rotation)
  const cycle = { n: 0, products: [] };

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.h('div', { class: 'card' }, UI.spinner()));
    try {
      items = (await Api.get('/inventories'))?.data ?? [];
      // 📦 v2.11 : N produits/jour (0 ou clé absente = carte masquée, vieux serveur OK)
      cycle.n = Math.max(0, parseInt(Api.shop()?.cycle_count_daily, 10) || 0);
      if (cycle.n > 0) {
        cycle.products = (await Api.get('/products?all=1').catch(() => ({ data: [] })))?.data ?? [];
      }
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (cycle.n > 0) zone.appendChild(cycleCardEl()); // 📦 v2.11 : carte comptage tournant
    if (!items.length) {
      zone.appendChild(UI.empty('📋', t('inv_none'), t('inv_none_sub')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl', style: { background: 'var(--card)' } },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('inv_reference'), t('inv_name'), t('r_status'), '📊', t('r_since'), t('r_by'), t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((inv) => {
        const open = inv.status === 'in_progress';
        return UI.h('tr', {},
          UI.h('td', { class: 'strong mono' }, Fmt.esc(inv.reference ?? `#${inv.id}`)),
          UI.h('td', {}, Fmt.esc(inv.name ?? '—')),
          UI.h('td', {}, open
            ? UI.badge('warning', `🔄 ${t('inv_status_open')}`)
            : UI.badge('success', `✅ ${t('inv_status_done', { date: Fmt.date(inv.validated_at) })}`)),
          UI.h('td', { class: 'muted' }, `${Fmt.num(inv.counted_lines ?? 0)} / ${Fmt.num(inv.lines_count ?? 0)} ${t('inv_lines')}`),
          UI.h('td', { class: 'muted' }, Fmt.date(inv.created_at)),
          UI.h('td', { class: 'muted' }, Fmt.esc(inv.user?.name ?? '—')),
          UI.h('td', {},
            UI.h('button', { class: 'btn btn-sm', onclick: () => openDetail(inv) }, open ? '✏️' : '👁'),
            open ? UI.h('button', {
              class: 'btn btn-sm btn-ghost',
              onclick: async () => {
                if (!(await UI.confirm(t('inv_delete_msg', { name: inv.name ?? inv.reference }), { danger: true, okText: t('delete') }))) return;
                try { await Api.delete(`/inventories/${inv.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '🗑') : null));
      }))));
    zone.style.marginTop = '0';
  }

  // ---------- Création ----------
  // 📦 v2.11 : carte « Comptage du jour » — rotation déterministe partagée (Promo.cycleList)
  function cycleCardEl() {
    const todays = window.Promo.cycleList(cycle.products, cycle.n);
    const card = UI.h('div', { class: 'card', style: { marginBottom: '12px', borderLeft: '3px solid var(--accent)' } });
    card.appendChild(UI.h('div', { class: 'card-title' }, `📦 ${t('cc_title')}`));
    if (!todays.length) {
      card.appendChild(UI.h('div', { class: 'muted' }, t('cc_empty')));
      return card;
    }
    card.appendChild(UI.h('div', { class: 'muted', style: { margin: '4px 0 8px', fontSize: '12px' } }, t('cc_hint', { n: todays.length })));
    card.appendChild(UI.h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' } },
      todays.slice(0, 12).map((p) => UI.badge('primary', `${Fmt.esc(p.name ?? '')} · ${p.quantity ?? 0}`)),
      todays.length > 12 ? UI.badge('warning', `+${todays.length - 12}`) : null));
    const btn = UI.h('button', { class: 'btn btn-primary' }, `✏️ ${t('cc_start')}`);
    btn.addEventListener('click', () => createCycle(todays));
    card.appendChild(btn);
    return card;
  }

  async function createCycle(list) {
    try {
      const res = await Api.post('/inventories', {
        name: `${t('cc_name')} · ${Fmt.date(new Date())}`,
        product_ids: list.map((p) => p.id), // 📦 v2.11 : sous-ensemble additif (absent = tout le catalogue)
      });
      UI.toast(t('cc_created', { n: list.length }), 'var(--success)');
      const inv = res?.data ?? null;
      if (inv?.id) openDetail(inv); else load();
    } catch (e) {
      UI.toast(e.message, 'var(--danger)');
    }
  }

  function openCreate() {
    const name = UI.input({ placeholder: t('inv_name_ph') });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('create'));
    const errBox = UI.h('div', { style: { display: 'none' } });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await Api.post('/inventories', { name: name.value.trim() || null });
        UI.toast(t('inv_created'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `📋 ${t('inv_new')}`,
      children: [
        errBox,
        UI.field(t('inv_name'), name),
        UI.h('div', { class: 'form-row' },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
    name.focus();
  }

  // ---------- Comptage (détail) ----------
  async function openDetail(inv) {
    view.innerHTML = '';
    view.appendChild(UI.spinner());

    let data;
    try { data = await Api.get(`/inventories/${inv.id}`); }
    catch (e) {
      view.innerHTML = '';
      view.appendChild(UI.empty('⚠️', e.message));
      return;
    }

    const detail = data.inventory ?? inv;
    const lines = data.items ?? [];
    const open = detail.status === 'in_progress';
    let products = null;

    const linesZone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '12px' } });

    function renderLines() {
      linesZone.innerHTML = '';
      if (!lines.length) {
        linesZone.appendChild(UI.empty('📦', t('empty')));
        return;
      }
      linesZone.appendChild(UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {},
          ...[t('m_product'), t('inv_expected'), t('inv_counted_input'), open ? t('actions') : ''].filter(Boolean).map((x) => UI.h('th', {}, x)))),
        UI.h('tbody', {}, lines.map((l) => {
          const counted = Number(l.counted_quantity ?? 0);
          const expected = Number(l.expected_quantity ?? 0);
          const cells = [
            UI.h('td', {},
              UI.h('div', { class: 'strong' }, Fmt.esc(l.product?.name ?? `#${l.product_id}`)),
              UI.h('div', { class: 'muted mono' }, Fmt.esc(l.product?.barcode ?? ''))),
            UI.h('td', { class: 'num muted' }, Fmt.num(expected)),
          ];
          if (open) {
            const qty = UI.input({ type: 'number', min: 0, value: l.counted_quantity ?? '', style: { width: '90px' } });
            const saveBtn = UI.h('button', {
              class: 'btn btn-sm',
              onclick: async () => {
                try {
                  await Api.post(`/inventories/${detail.id}/count`, {
                    product_id: l.product_id,
                    quantity: Math.max(0, parseInt(qty.value, 10) || 0),
                    mode: 'set',
                  });
                  l.counted_quantity = Math.max(0, parseInt(qty.value, 10) || 0);
                  UI.toast(t('inv_saved'), 'var(--success)', 1500);
                  renderLines();
                } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '💾');
            const diff = UI.h('td', { class: 'num', style: { color: counted === expected ? 'var(--muted)' : 'var(--warning)' } }, counted === 0 && qty.value === '' ? '·' : `${counted - expected >= 0 ? '+' : ''}${counted - expected}`);
            cells.push(diff, UI.h('td', {}, UI.h('div', { class: 'form-row', style: { gap: '6px' } }, qty, saveBtn)));
          } else {
            cells.push(UI.h('td', { class: 'num strong' }, Fmt.num(counted)));
          }
          return UI.h('tr', {}, ...cells);
        }))));
    }

    // Zone recherche produit → comptage direct
    const search = UI.input({ placeholder: t('inv_search_ph'), style: { flex: 1 } });
    const suggZone = UI.h('div');
    const expectedOf = (p) => p.shop_stock ?? p.quantity ?? 0;

    async function ensureProducts() {
      if (products) return true;
      try { products = (await Api.get('/products', { all: 1, sort: 'name' })).data ?? []; return true; }
      catch (e) { UI.toast(e.message, 'var(--danger)'); return false; }
    }

    const matchList = (q) => (products ?? [])
      .filter((p) => (p.name ?? '').toLowerCase().includes(q)
        || (p.sku ?? '').toLowerCase().includes(q)
        || (p.barcode ?? '').toLowerCase().includes(q));

    function addSuggRow(p, focus = false) {
      const line = lines.find((l) => l.product_id === p.id);
      const qty = UI.input({ type: 'number', min: 0, value: line?.counted_quantity ?? '', placeholder: '0', style: { width: '80px' } });
      suggZone.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', padding: '5px 8px' } },
        UI.h('div', { style: { flex: 1 } },
          UI.h('div', { class: 'strong' }, Fmt.esc(p.name)),
          UI.h('div', { class: 'muted' }, `${t('inv_expected')} : ${line ? line.expected_quantity : expectedOf(p)}`)),
        qty,
        UI.h('button', {
          class: 'btn btn-sm btn-primary',
          onclick: async () => {
            try {
              await Api.post(`/inventories/${detail.id}/count`, {
                product_id: p.id,
                quantity: Math.max(0, parseInt(qty.value, 10) || 0),
                mode: 'set',
              });
              UI.toast(t('inv_saved'), 'var(--success)', 1500);
              // resync
              const fresh = await Api.get(`/inventories/${detail.id}`);
              lines.length = 0;
              (fresh.items ?? []).forEach((x) => lines.push(x));
              renderLines();
              renderSuggestions();
            } catch (e) { UI.toast(e.message, 'var(--danger)'); }
          },
        }, '✚')));
      if (focus) { qty.focus?.(); qty.select?.(); } // 🔫 scan : le comptage se tape direct
    }

    function renderSuggestions() {
      suggZone.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      if (q.length < 2 || !products) return;
      matchList(q).slice(0, 5).forEach((p) => addSuggRow(p));
    }
    search.addEventListener('input', async () => { if (await ensureProducts()) renderSuggestions(); });

    /** Traite un code tapé/scanné (douchette v1.7, caméra 📸 v2.4). beep=false quand la caméra a déjà bippé. */
    async function applyScannedCode(raw, { beep = true } = {}) {
      if (!(await ensureProducts())) return;
      const q = String(raw).trim().toLowerCase();
      if (!q) return;
      const exact = (products ?? []).find((p) => (p.barcode ?? '').toLowerCase() === q
        || (p.sku ?? '').toLowerCase() === q);
      const only = matchList(q);
      const pick = exact ?? (only.length === 1 ? only[0] : null);
      if (pick) {
        if (beep) window.ScanBeep?.ok(); // 🔊 v1.8
        suggZone.innerHTML = '';
        addSuggRow(pick, true);
        UI.toast(t('inv_scan_found', { name: pick.name }), 'var(--info)', 1800);
      } else {
        UI.toast(t('inv_scan_miss'), 'var(--warning)', 1800);
      }
    }

    // 🔫 v1.7 : douchette code-barres (Enter = correspondance exacte prioritaire,
    // sinon correspondance unique) → la bonne ligne s'ouvre, curseur dans le comptage
    search.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      await applyScannedCode(search.value);
    });

    // 📸 v2.4 : webcam (1 code → fermeture auto), même résultat que la douchette
    const camBtn = UI.h('button', {
      class: 'btn', title: t('sc_btn'), style: { marginLeft: '8px' },
      onclick: () => window.ScanCamera?.open({
        onCode: (code) => { applyScannedCode(code, { beep: false }); },
        continuous: false,
      }),
    }, '📸');

    view.innerHTML = '';
    view.append(
      UI.h('div', { class: 'page-head no-print' },
        UI.h('button', { class: 'btn btn-sm', onclick: () => Screens.inventories(view) }, `‹ ${t('inv_back')}`),
        UI.h('div', { class: 'page-title', style: { marginTop: '8px' } }, `📋 ${Fmt.esc(detail.name ?? detail.reference ?? '')}`),
        UI.h('div', { class: 'page-sub' }, open ? t('inv_sub') : t('inv_validated_readonly'))),
      open ? UI.h('div', { class: 'card no-print', style: { padding: '12px 14px' } },
        UI.h('div', { class: 'muted', style: { marginBottom: '8px' } }, `🔎 ${t('inv_add_hint')}`),
        UI.h('div', { class: 'form-row' }, search, camBtn),
        suggZone) : null,
      linesZone,
      open ? UI.h('div', { class: 'form-row no-print', style: { marginTop: '12px', justifyContent: 'flex-end' } },
        UI.h('button', {
          class: 'btn btn-success btn-lg',
          onclick: async () => {
            if (!(await UI.confirm(t('inv_finish_q'), { okText: `✅ ${t('inv_finish')}` }))) return;
            try {
              const res = await Api.post(`/inventories/${detail.id}/finish`);
              const s = res.summary ?? { adjusted: 0, delta: 0 };
              UI.toast(t('inv_done_msg', { adjusted: s.adjusted, delta: s.delta > 0 ? `+${s.delta}` : String(s.delta) }), 'var(--success)', 6000);
              Screens.inventories(view);
            } catch (e) { UI.toast(e.message, 'var(--danger)'); }
          },
        }, `✅ ${t('inv_finish')}`)) : null);

    renderLines();
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('inv_title')),
      UI.h('div', { class: 'page-sub' }, t('inv_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: openCreate }, `＋ ${t('inv_new')}`)),
    zone);

  load();
};
