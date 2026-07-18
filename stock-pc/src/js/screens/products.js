// ============================================================
// 📦 Produits — catalogue, recherche, filtres, CRUD + photo
// (multipart FormData, comme l'app mobile)
// ============================================================
window.Screens = window.Screens || {};

Screens.products = async (view) => {
  const t = I18n.t;
  let page = 1, lastPage = 1, search = '', filter = '', catId = '';
  let lastItems = []; // 🏷️ v2.3 : liste affichée → rafale d'étiquettes

  const cats = (await Api.get('/categories').catch(() => ({ data: [] })))?.data ?? [];
  const suppliers = (await Api.get('/suppliers').catch(() => ({ data: [] })))?.data ?? [];

  const searchInput = UI.input({ placeholder: t('search'), style: { width: '260px' } });
  const catSelect = UI.select({}, [
    { value: '', label: `— ${t('p_category')} —` },
    ...cats.map((c) => ({ value: c.id, label: c.name })),
  ]);
  const filterChips = UI.h('div', { class: 'chips' });
  const tableZone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });
  const pager = UI.h('div', { class: 'form-row', style: { justifyContent: 'center', marginTop: '12px', alignItems: 'center' } });

  const FILTERS = [
    { key: '', label: `📦 ${t('p_filter_all')}` },
    { key: 'low_stock', label: `⚠️ ${t('p_filter_low')}` },
    { key: 'out_of_stock', label: `🚫 ${t('p_filter_out')}` },
  ];

  function stockBadge(p) {
    const eff = p.shop_stock ?? p.quantity; // 🏬📦 stock de mon emplacement si dispo
    if (eff === 0) return UI.badge('danger', `0 · ${t('p_out')}`);
    if (p.is_low_stock) return UI.badge('warning', `${eff} · ${t('p_low')}`);
    const b = UI.badge('success', `${eff} · ${t('p_in_stock')}`);
    if (p.shop_stock != null) b.title = `🏬 ${t('p_shop_stock')} · global ${p.quantity}`;
    return b;
  }

  // ---------- 📥 v2.13 : import CSV en masse (fichier OU collage direct) ----------
  function openImport() {
    const fileInput = UI.input({ type: 'file', accept: '.csv,.txt,text/csv' });
    const paste = UI.h('textarea', {
      class: 'input', rows: 8,
      placeholder: t('imp_paste_ph'),
      style: { width: '100%', fontFamily: 'monospace', fontSize: '12px', marginTop: '8px', resize: 'vertical' },
    });
    const createMissing = UI.input({ type: 'checkbox', style: { width: 'auto' } });
    createMissing.checked = true;
    const preview = UI.h('div', { style: { marginTop: '10px' } });
    const reportZone = UI.h('div', { style: { display: 'none', marginTop: '10px' } });
    let parsed = null;

    function refresh() {
      const text = paste.value ?? '';
      parsed = text.trim() ? window.CsvImport.parseProductsCsv(text) : null;
      preview.innerHTML = '';
      if (!parsed) { preview.appendChild(UI.h('div', { class: 'muted', style: { fontSize: '12px' } }, t('imp_empty'))); return; }
      const fatal = parsed.errors.find((e) => e.message === 'headers' || e.message === 'empty');
      if (fatal) {
        preview.appendChild(UI.h('div', { style: { color: 'var(--danger)', fontSize: '12px' } }, `⚠️ ${t('imp_headers_ko')}`));
        return;
      }
      preview.appendChild(UI.h('div', { style: { fontSize: '12px', marginBottom: '6px' } },
        UI.badge(parsed.rows.length ? 'success' : 'muted', `✅ ${parsed.rows.length}`), ' ',
        UI.badge(parsed.errors.length ? 'danger' : 'muted', `⚠️ ${parsed.errors.length} ${t('imp_errors')}`),
        parsed.ignored.length ? UI.h('span', { class: 'muted', style: { fontSize: '11px', marginLeft: '8px' } },
          t('imp_ignored', { cols: parsed.ignored.join(', ') })) : null));
      // Aperçu : 6 premières lignes valides + 4 premières erreurs
      if (parsed.rows.length) {
        preview.appendChild(UI.h('div', { style: { fontSize: '11px', fontFamily: 'monospace', opacity: .85 } },
          parsed.rows.slice(0, 6).map((r) => UI.h('div', {},
            `• ${r.name} (${r.sku}) — ${Fmt.money(r.sale_price ?? 0)}${r.quantity != null ? ` · ×${r.quantity}` : ''}`))));
        if (parsed.rows.length > 6) preview.appendChild(UI.h('div', { class: 'muted', style: { fontSize: '11px' } }, `… +${parsed.rows.length - 6}`));
      }
      parsed.errors.slice(0, 4).forEach((e) => preview.appendChild(
        UI.h('div', { style: { color: 'var(--danger)', fontSize: '11px' } }, `⚠️ ${t('imp_err_line', { line: e.line, msg: e.message })}`)));
    }

    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { paste.value = String(reader.result ?? ''); refresh(); };
      reader.readAsText(f, 'utf-8'); // BOM géré par CsvImport
    });
    let deb = null;
    paste.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(refresh, 200); });

    const importBtn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, `📥 ${t('imp_btn')}`);
    importBtn.addEventListener('click', async () => {
      if (!parsed?.rows?.length) return;
      importBtn.disabled = true;
      reportZone.style.display = 'none';
      try {
        const res = await Api.post('/products/import', {
          rows: parsed.rows.slice(0, 300),
          create_missing: createMissing.checked ? 1 : 0,
        });
        reportZone.style.display = '';
        reportZone.innerHTML = '';
        reportZone.appendChild(UI.h('div', { style: { fontSize: '13px', marginBottom: '4px' } },
          t('imp_done', { created: res.created ?? 0, updated: res.updated ?? 0, errors: (res.errors ?? []).length })));
        (res.errors ?? []).slice(0, 10).forEach((e) => reportZone.appendChild(
          UI.h('div', { style: { color: 'var(--danger)', fontSize: '11px' } },
            `⚠️ ${t('imp_err_line', { line: e.line, msg: `${e.sku ? e.sku + ' — ' : ''}${e.message}` })}`)));
        UI.toast(t('imp_done', { created: res.created ?? 0, updated: res.updated ?? 0, errors: (res.errors ?? []).length }), 'var(--success)');
        load(); // rafraîchit le catalogue en arrière-plan
      } catch (e) {
        reportZone.style.display = '';
        reportZone.innerHTML = '';
        reportZone.appendChild(UI.h('div', { style: { color: 'var(--danger)', fontSize: '12px' } }, `⚠️ ${e.message}`));
      } finally {
        importBtn.disabled = false;
      }
    });

    UI.modal({
      title: t('imp_title'), icon: '📥', width: 'lg',
      children: [
        UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, t('imp_hint')),
        UI.h('div', { class: 'form-row', style: { alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          fileInput,
          UI.h('span', { class: 'muted', style: { fontSize: '12px' } }, t('imp_or'))),
        paste,
        UI.h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '8px', cursor: 'pointer' } },
          createMissing, UI.h('span', {}, t('imp_create_missing'))),
        preview,
        reportZone,
        UI.h('div', { class: 'form-row', style: { marginTop: '12px' } }, importBtn),
      ],
    });
    refresh();
  }

  async function load() {
    tableZone.innerHTML = '';
    tableZone.appendChild(UI.spinner());
    const params = { page, per_page: 15, sort: 'name' };
    if (search) params.search = search;
    if (catId) params.category_id = catId;
    if (filter) params[filter] = 1;

    let res;
    try { res = await Api.get('/products', params); } catch (e) {
      tableZone.innerHTML = '';
      tableZone.appendChild(UI.empty('⚠️', e.message));
      return;
    }
    const items = res.data ?? [];
    lastPage = res.last_page ?? 1;
    lastItems = items; // 🏷️ v2.3
    renderBurstBtn();
    tableZone.innerHTML = '';

    if (!items.length) {
      tableZone.appendChild(UI.empty('📦', t('p_none'), t('p_none_sub')));
    } else {
      const tbl = UI.h('table', { class: 'tbl' },
        UI.h('thead', {}, UI.h('tr', {},
          ...['', t('p_name'), t('p_category'), t('p_price'), t('p_stock'), t('actions')].map((x) => UI.h('th', {}, x)))),
        UI.h('tbody', {}, items.map((p) => UI.h('tr', {},
          UI.h('td', {}, p.image_url
            ? UI.h('img', { class: 'thumb', src: p.image_url, loading: 'lazy' })
            : UI.h('span', { class: 'thumb' }, '📦')),
          UI.h('td', {},
            UI.h('div', { class: 'strong' }, Fmt.esc(p.name)),
            UI.h('div', { class: 'muted mono' }, Fmt.esc(p.sku))),
          UI.h('td', { class: 'muted' }, Fmt.esc(p.category?.name ?? '—')),
          UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } },
            window.Promo.promoActive(p) // 🏷️ v2.11 : prix promo + prix normal barré
              ? UI.h('span', {}, Fmt.money(p.promo_price), ' ',
                  UI.h('s', { class: 'muted', style: { fontSize: '11px' } }, Fmt.money(p.sale_price)), ' ',
                  UI.badge('warning', t('pr_badge')))
              : Fmt.money(p.sale_price)),
          UI.h('td', {}, stockBadge(p)),
          UI.h('td', { style: { whiteSpace: 'nowrap' } },
            // 🏷️ v1.9 : étiquette thermique individuelle (visible seulement si la thermique est configurée)
            ...(window.Thermal?.isConfigured?.() ? [UI.h('button', {
              class: 'btn btn-sm', style: { marginRight: '4px' }, title: t('th_label_btn'),
              onclick: async (ev) => {
                const b = ev.currentTarget;
                b.disabled = true;
                try { await Thermal.printLabel(p); UI.toast(t('th_label_ok'), 'var(--success)'); }
                catch (e) { UI.toast(t('th_label_ko', { msg: e.message }), 'var(--danger)', 4500); }
                finally { b.disabled = false; }
              },
            }, '🏷️')] : []),
            UI.h('button', { class: 'btn btn-sm', onclick: () => openForm(p) }, '✏️'))))));
      tableZone.appendChild(tbl);
    }

    pager.innerHTML = '';
    if (lastPage > 1) {
      pager.append(
        UI.h('button', { class: 'btn btn-sm', disabled: page <= 1, onclick: () => { page--; load(); } }, t('m_prev')),
        UI.h('span', { class: 'muted' }, t('m_page', { a: page, b: lastPage })),
        UI.h('button', { class: 'btn btn-sm', disabled: page >= lastPage, onclick: () => { page++; load(); } }, t('m_next')));
    }
  }

  // ---------- Formulaire création / édition ----------
  function openForm(p = null) {
    const name = UI.input({ value: p?.name ?? '' });
    const sku = UI.input({ value: p?.sku ?? '' });
    const barcode = UI.input({ value: p?.barcode ?? '', placeholder: t('p_optional') });
    const cat = UI.select({}, [{ value: '', label: '—' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]);
    if (p?.category_id) cat.value = p.category_id;
    const sup = UI.select({}, [{ value: '', label: '—' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]);
    if (p?.supplier_id) sup.value = p.supplier_id;
    const purchase = UI.input({ type: 'number', min: 0, value: p?.purchase_price ?? '' });
    const sale = UI.input({ type: 'number', min: 0, value: p?.sale_price ?? '' });
    const wholesale = UI.input({ type: 'number', min: 0, value: p?.wholesale_price ?? '', placeholder: t('p_optional') });
    const threshold = UI.input({ type: 'number', min: 0, value: p?.alert_threshold ?? 0 });
    const qty = UI.input({ type: 'number', min: 0, value: 0, disabled: !!p });
    const photo = UI.input({ type: 'file', accept: 'image/*' });
    const errBox = UI.h('div', { style: { display: 'none' } });

    const submitBtn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } },
      p ? t('save') : t('create'));

    submitBtn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      const fd = new FormData();
      if (p) fd.append('_method', 'PUT'); // Laravel : PUT via POST multipart
      fd.append('name', name.value.trim());
      fd.append('sku', sku.value.trim());
      if (barcode.value.trim()) fd.append('barcode', barcode.value.trim());
      fd.append('purchase_price', purchase.value || '0');
      fd.append('sale_price', sale.value || '0');
      if (wholesale.value) fd.append('wholesale_price', wholesale.value);
      fd.append('alert_threshold', threshold.value || '0');
      if (cat.value) fd.append('category_id', cat.value);
      if (sup.value) fd.append('supplier_id', sup.value);
      if (!p) fd.append('quantity', qty.value || '0');
      if (photo.files[0]) fd.append('image', photo.files[0]);

      submitBtn.disabled = true;
      try {
        await Api.postForm(p ? `/products/${p.id}` : '/products', fd);
        UI.toast(t('p_saved'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        submitBtn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: p ? t('p_edit') : `📦 ${t('p_new')}`, icon: p ? '✏️' : '', width: 'lg',
      children: [
        errBox,
        UI.h('div', { class: 'form-row' }, UI.field(t('p_name'), name), UI.field(t('p_sku'), sku)),
        UI.h('div', { class: 'form-row' }, UI.field(t('p_barcode'), barcode), UI.field(t('p_category'), cat)),
        UI.h('div', { class: 'form-row' },
          UI.field(t('p_purchase'), purchase),
          UI.field(t('p_sale'), sale),
          UI.field(t('p_wholesale'), wholesale)),
        UI.h('div', { class: 'form-row' },
          UI.field(t('p_supplier'), sup),
          UI.field(t('p_threshold'), threshold),
          p ? UI.field(t('p_photo'), photo) : UI.field(t('p_qty_initial'), qty)),
        p ? null : UI.field(t('p_photo'), photo),
        UI.h('div', { class: 'form-row', style: { marginTop: '6px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          submitBtn),
      ],
    });
  }

  // ---------- 🏷️ Étiquettes code-barres (planche A4, v1.1) ----------
  async function openLabels() {
    let all = [];
    try { all = (await Api.get('/products', { all: 1, sort: 'name' })).data ?? []; }
    catch (e) { UI.toast(e.message, 'var(--danger)'); return; }

    const selected = new Set();
    const search = UI.input({ placeholder: t('search'), style: { flex: 1 } });
    const listZone = UI.h('div', { style: { maxHeight: '280px', overflowY: 'auto', margin: '8px 0' } });
    const countEl = UI.h('span', { class: 'muted' });
    const copies = UI.select({ style: { width: '70px' } }, [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}` })));
    const perRow = UI.select({ style: { width: '70px' } }, [2, 3, 4, 5].map((n) => ({ value: n, label: `${n}` })));
    perRow.value = '3';
    // 📦 v2.10 : toggle « copies = stock actuel » (désactive le sélecteur de copies)
    const stockChk = UI.input({ type: 'checkbox' });
    stockChk.addEventListener('change', () => { copies.disabled = stockChk.checked; copies.style.opacity = stockChk.checked ? 0.4 : 1; });

    function renderList() {
      listZone.innerHTML = '';
      countEl.textContent = t('lb_selected', { n: selected.size });
      const q = search.value.trim().toLowerCase();
      all
        .filter((p) => !q || (p.name ?? '').toLowerCase().includes(q)
          || (p.sku ?? '').toLowerCase().includes(q)
          || (p.barcode ?? '').toLowerCase().includes(q))
        .forEach((p) => {
          const on = selected.has(p.id);
          listZone.appendChild(UI.h('div', {
            class: 'check-row',
            onclick: () => { if (on) selected.delete(p.id); else selected.add(p.id); renderList(); },
          },
            UI.input({ type: 'checkbox', checked: on, style: { pointerEvents: 'none' } }),
            UI.h('span', { style: { flex: 1 } }, Fmt.esc(p.name)),
            UI.h('span', { class: 'muted mono' }, Fmt.esc(p.barcode || p.sku || '')),
            UI.h('span', { class: 'muted' }, Fmt.money(p.sale_price))));
        });
    }
    search.addEventListener('input', renderList);

    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, `🏷️ ${t('lb_generate')}`);
    btn.addEventListener('click', async () => {
      if (!selected.size) { UI.toast(t('lb_none_selected'), 'var(--warning)'); return; }
      if (selected.size > 60) { UI.toast(t('lb_too_many'), 'var(--warning)'); return; }
      btn.disabled = true;
      try {
        await Api.download(
          `/products-labels.pdf?ids=${[...selected].join(',')}&per_row=${perRow.value}&copies=${copies.value}${stockChk.checked ? '&stock_qty=1' : ''}`,
          'etiquettes.pdf');
        close();
      } catch (e) { UI.toast(e.message, 'var(--danger)'); btn.disabled = false; }
    });

    const { close } = UI.modal({
      title: `🏷️ ${t('lb_title')}`, width: 'lg',
      children: [
        UI.h('div', { class: 'muted', style: { marginBottom: '8px' } }, `💡 ${t('lb_hint')} (${t('lb_fallback')}.)`),
        UI.h('div', { class: 'form-row', style: { alignItems: 'center' } },
          search,
          UI.h('button', { class: 'btn btn-sm', onclick: () => { all.forEach((p) => selected.add(p.id)); renderList(); } }, t('lb_all')),
          UI.h('button', { class: 'btn btn-sm', onclick: () => { selected.clear(); renderList(); } }, t('lb_clear'))),
        listZone,
        // 📦 v2.10 : « copies = stock actuel de chaque produit » (param additif côté serveur)
        UI.h('label', { class: 'form-row', style: { alignItems: 'center', gap: '7px', marginTop: '6px', cursor: 'pointer' } },
          stockChk,
          UI.h('span', { style: { fontSize: '12.5px' } }, `📦 ${t('lb_a4_stock')}`)),
        UI.h('div', { class: 'form-row', style: { alignItems: 'center' } },
          countEl,
          UI.h('span', { style: { flex: 1 } }),
          UI.h('span', { class: 'muted' }, t('lb_copies')), copies,
          UI.h('span', { class: 'muted' }, t('lb_per_row')), perRow),
        UI.h('div', { class: 'form-row', style: { marginTop: '10px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
    renderList();
  }

  // ---------- 🏷️ Rafale thermique (v2.3) : tout le rayon listé, un coup ----------
  const burstBtn = UI.h('button', { class: 'btn', title: t('lb_burst_confirm', { n: '…' }) });
  function renderBurstBtn() {
    burstBtn.textContent = `🏷️ ${t('lb_burst')} (${lastItems.length})`;
    burstBtn.disabled = !lastItems.length;
    burstBtn.style.opacity = lastItems.length ? '1' : '.45';
  }
  renderBurstBtn();
  burstBtn.addEventListener('click', () => {
    const list = [...lastItems];
    if (!list.length) return;
    openBurstQty(list); // 🏷️ v2.5 : quantité par produit en saisie express
  });

  // ---------- ⚠️🏷️ v2.6 : rafale « ruptures de stock » — réassortir le rayon ----------
  const outBurstBtn = UI.h('button', { class: 'btn', title: t('lb_out_hint') }, `⚠️ ${t('lb_out')}`);
  outBurstBtn.addEventListener('click', async () => {
    outBurstBtn.disabled = true;
    outBurstBtn.style.opacity = '.55';
    try {
      // all=1 = sans pagination (plafond serveur 500) — zéro changement backend
      const res = await Api.get('/products', { out_of_stock: 1, all: 1 });
      const list = (res?.data ?? []).filter(Boolean);
      if (!list.length) { UI.toast(t('lb_out_none'), 'var(--success)', 5000); return; }
      openBurstQty(list); // 🏷️ même saisie express de quantité que la rafale classique
    } catch (e) {
      UI.toast(t('lb_out_ko', { msg: e.message }), 'var(--danger)', 4500);
    } finally {
      outBurstBtn.disabled = false;
      outBurstBtn.style.opacity = '1';
    }
  });

  /**
   * 🏷️ v2.5 — Modale « combien d'étiquettes par produit ? » (stepper − n ＋, 1..20).
   * Le bouton de validation affiche le TOTAL d'étiquettes (produits × copies).
   */
  function openBurstQty(list) {
    let copies = 1;
    let stockMode = false; // 📦 v2.10 : « 1 étiquette par unité en stock » (réassort)
    const stockQtyOf = (p) => Math.min(50, Math.max(1, Number(p.shop_stock ?? p.quantity ?? 0) || 0)); // garde-fous 1..50
    const stockList = () => { // expansion produit × son stock, plafond global 400 étiquettes
      const out = [];
      for (const p of list) for (let i = 0; i < stockQtyOf(p) && out.length < 400; i++) out.push(p);
      return out;
    };
    const qtyEl = UI.h('span', { class: 'strong', style: { minWidth: '36px', textAlign: 'center', fontSize: '18px' } }, String(copies));
    const totalNote = UI.h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '10px', textAlign: 'center' } });
    const goBtn = UI.h('button', { class: 'btn btn-primary', style: { justifyContent: 'center', marginTop: '12px' } });
    const stockChip = UI.h('button', { class: 'chip', onclick: () => {
      stockMode = !stockMode; stockChip.classList.toggle('active', stockMode); qtyEl.style.opacity = stockMode ? 0.35 : 1; renderQty();
    } }, `📦 ${t('lb_stock_chip')}`);
    const renderQty = () => {
      qtyEl.textContent = String(copies);
      if (stockMode) {
        const n = list.reduce((s, p) => s + stockQtyOf(p), 0);
        totalNote.textContent = t('lb_stock_hint', { n: Fmt.num(Math.min(n, 400)), products: list.length });
        goBtn.textContent = `🖨 ${t('lb_qty_go', { n: Fmt.num(Math.min(n, 400)) })}`;
      } else {
        totalNote.textContent = t('lb_qty_hint', { n: Fmt.num(list.length * copies), products: list.length, copies });
        goBtn.textContent = `🖨 ${t('lb_qty_go', { n: Fmt.num(list.length * copies) })}`;
      }
    };
    const step = (d) => { copies = Math.max(1, Math.min(20, copies + d)); stockMode = false; stockChip.classList.remove('active'); qtyEl.style.opacity = 1; renderQty(); };
    const { close } = UI.modal({
      title: t('lb_qty_title'), icon: '🏷️',
      children: UI.h('div', {},
        UI.h('div', { class: 'form-row', style: { justifyContent: 'center', alignItems: 'center', gap: '14px' } },
          UI.h('button', { class: 'btn', style: { minWidth: '44px', fontSize: '17px' }, onclick: () => step(-1) }, '−'),
          qtyEl,
          UI.h('button', { class: 'btn', style: { minWidth: '44px', fontSize: '17px' }, onclick: () => step(1) }, '＋')),
        UI.h('div', { class: 'form-row', style: { justifyContent: 'center', gap: '6px', marginTop: '10px' } },
          [1, 2, 3, 5, 10].map((q) => UI.h('button', {
            class: 'chip', onclick: () => { copies = q; stockMode = false; stockChip.classList.remove('active'); qtyEl.style.opacity = 1; renderQty(); },
          }, `× ${q}`)), stockChip),
        totalNote,
        goBtn),
    });
    goBtn.addEventListener('click', async () => {
      goBtn.disabled = true;
      close();
      try {
        if (stockMode) { // 📦 v2.10 : 1 étiquette par unité en stock, UN seul envoi
          const expanded = stockList();
          await Thermal.printLabels(expanded, 1);
          UI.toast(t('lb_stock_done', { n: expanded.length }), 'var(--success)');
        } else {
          await Thermal.printLabels(list, copies); // 🏷️ UN seul envoi : les étiquettes sortent à la file
          UI.toast(t('lb_burst_done', { n: list.length * copies }), 'var(--success)');
        }
      } catch (e) { UI.toast(t('th_label_ko', { msg: e.message }), 'var(--danger)', 4500); }
    });
    renderQty();
  }

  // ---------- Barre d'outils ----------
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { search = searchInput.value.trim(); page = 1; load(); }, 350);
  });
  catSelect.addEventListener('change', () => { catId = catSelect.value; page = 1; load(); });

  FILTERS.forEach((f) => {
    const chip = UI.h('button', { class: `chip ${filter === f.key ? 'active' : ''}` }, f.label);
    chip.addEventListener('click', () => {
      filter = f.key;
      filterChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      page = 1; load();
    });
    filterChips.appendChild(chip);
  });

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('p_title')),
      UI.h('div', { class: 'page-sub' }, t('p_sub'))),
    UI.h('div', { class: 'form-row no-print', style: { alignItems: 'center', flexWrap: 'wrap' } },
      UI.h('div', { class: 'searchbar', style: { flex: '0 0 280px' } }, UI.h('span', { class: 'ico' }, '🔎'), searchInput),
      catSelect,
      filterChips,
      UI.h('div', { style: { flex: 1 } }),
      ...(window.Thermal?.isConfigured?.() ? [burstBtn, outBurstBtn] : []), // 🏷️ v2.3 + ⚠️ v2.6 : thermique configurée seulement
      UI.h('button', { class: 'btn', onclick: openLabels }, `🏷️ ${t('lb_open')}`),
      UI.h('button', { class: 'btn', onclick: openImport, title: t('imp_hint') }, `📥 ${t('imp_open')}`), // 📥 v2.13
      UI.h('button', { class: 'btn btn-primary', onclick: () => openForm() }, `＋ ${t('p_new')}`)),
    tableZone,
    pager);

  load();
};
