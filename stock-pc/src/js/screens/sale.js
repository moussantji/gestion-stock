// ============================================================
// 🧾 Nouvelle vente — interface caisse PC (la raison d'être du desktop)
// Clavier-friendly, douchette code-barres (Enter = SKU/code exact),
// client Détail/Gros, 🎁 points fidélité, reçu PDF A5 / ticket 80 mm.
// ============================================================
window.Screens = window.Screens || {};

Screens.sale = async (view) => {
  const t = I18n.t;
  const shop = Api.shop() ?? {};
  const loyalty = shop.loyalty ?? { earn_per: 1000, point_value: 10 };
  const tvaCfg = shop.tva ?? null; // 🧮 v2.9 : config multi-TVA du /shop (absente → pas de ventilation)

  /** 🧮 v2.9 — estimation « dont TVA » du panier, groupée par taux (prix TTC). */
  const tvaLines = () => {
    if (!tvaCfg?.enabled) return [];
    const per = new Map();
    for (const l of cart.values()) {
      const ttc = linePrice(l.product) * l.qty;
      if (ttc <= 0) continue;
      let rate = Number(tvaCfg.products?.[String(l.product.id)]
        ?? tvaCfg.categories?.[String(l.product.category_id)]
        ?? tvaCfg.default_rate ?? 0) || 0; // produit → catégorie → défaut
      if (rate > 0) per.set(rate, (per.get(rate) ?? 0) + Math.round(ttc - ttc / (1 + rate / 100)));
    }
    return [...per.entries()].sort((a, b) => a[0] - b[0]); // taux croissants (lecture comptable)
  };

  // Catalogue complet (en cache local — recherche instantanée)
  // 📡 v1.2 : hors ligne, on retombe sur le dernier catalogue synchronisé
  let products; let customers;
  try {
    products = (await Api.get('/products', { all: 1, sort: 'name' }))?.data ?? [];
    customers = (await Api.get('/customers').catch(() => ({ data: [] })))?.data ?? [];
    OfflineSales.saveCatalog(products, customers);
  } catch (e) {
    const cached = OfflineSales.readCatalog();
    if (!e.network || !cached) throw e; // jamais été en ligne → erreur normale
    products = cached.products ?? [];
    customers = cached.customers ?? [];
    UI.toast(t('off_mode_cached'), 'var(--warning)', 6000);
  }

  const effQty = (p) => (p.shop_stock ?? p.quantity);
  const cart = new Map(); // product_id -> {product, qty}
  let customer = null; // client sélectionné (ou null = passage)
  let usePoints = false;

  const searchInput = UI.input({ placeholder: t('s_search_ph'), autocomplete: 'off' });
  const resultsZone = UI.h('div', { class: 'grid grid-cols-3', style: { marginTop: '12px' } });
  const cartZone = UI.h('div', {});
  const totalZone = UI.h('div', {});

  // ---------- Prix effectif d'une ligne (👥 tier) ----------
  function linePrice(p) {
    // 🏷️ v2.11 : promo ACTIVE = prix promo (détail uniquement — le gros garde son prix)
    return window.Promo.effectivePrice(p, customer?.price_tier === 'wholesale');
  }

  const cartTotal = () => [...cart.values()].reduce((s, l) => s + linePrice(l.product) * l.qty, 0);
  const maxRedeemable = () => {
    if (!customer || !customer.loyalty_points) return 0;
    const cap = Math.floor(cartTotal() / loyalty.point_value);
    return Math.min(customer.loyalty_points, Math.max(0, cap));
  };
  const pointsUsed = () => (usePoints ? maxRedeemable() : 0);
  const discount = () => pointsUsed() * loyalty.point_value;
  const netTotal = () => Math.max(0, cartTotal() - discount());

  // ---------- Recherche + scan douchette ----------
  function findMatches(q) {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(s)
        || (p.sku ?? '').toLowerCase().includes(s)
        || (p.barcode ?? '') === q.trim())
      .slice(0, 9);
  }

  function addToCart(p, silent = false) {
    const line = cart.get(p.id);
    const max = effQty(p);
    if (max <= 0 || (line && line.qty >= max)) {
      if (!silent) UI.toast(`${Fmt.esc(p.name)} — ${t('s_no_stock')}`, 'var(--danger)');
      searchInput.focus();
      return;
    }
    cart.set(p.id, { product: p, qty: (line?.qty ?? 0) + 1 });
    renderCart();
    searchInput.value = '';
    renderResults('');
    searchInput.focus();
  }

  function renderResults(q) {
    resultsZone.innerHTML = '';
    const list = q.trim().length >= 1 ? findMatches(q) : products.filter((p) => effQty(p) > 0).slice(0, 12);
    if (!list.length) {
      resultsZone.appendChild(UI.empty('🔎', t('empty')));
      return;
    }
    list.forEach((p) => {
      const qty = effQty(p);
      resultsZone.appendChild(UI.h('button', {
        class: 'btn', disabled: qty <= 0,
        style: {
          flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
          padding: '11px 13px', textAlign: 'left', height: 'auto',
          opacity: qty <= 0 ? 0.45 : 1,
        },
        onclick: () => addToCart(p),
      },
        UI.h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, // 📸 v2.9 : vignette en caisse
          p.image_url
            ? UI.h('img', { src: p.image_url, loading: 'lazy', style: { width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', flexShrink: '0' } })
            : UI.h('span', { style: { fontSize: '17px' } }, '📦'),
          UI.h('div', { class: 'strong', style: { fontSize: '13px' } }, Fmt.esc(p.name))),
        UI.h('div', { class: 'muted mono', style: { fontSize: '11px' } }, Fmt.esc(p.sku)),
        UI.h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' } },
          UI.h('b', { style: { color: 'var(--accent)', fontSize: '13px' } },
            Fmt.money(linePrice(p)),
            window.Promo.promoActive(p) && customer?.price_tier !== 'wholesale'
              ? UI.h('s', { class: 'muted', style: { fontSize: '11px', marginLeft: '5px' } }, Fmt.money(p.sale_price))
              : null),
          window.Promo.promoActive(p) && customer?.price_tier !== 'wholesale'
            ? UI.badge('warning', `🏷️ ${t('pr_badge')}`)
            : null,
          qty <= 3 ? UI.badge(qty === 0 ? 'danger' : 'warning', `${qty}`) : null)));
    });
  }

  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // Douchette : correspondance exacte SKU ou code-barres → ajout immédiat
    const q = searchInput.value.trim().toLowerCase();
    const exact = products.find((p) => (p.sku ?? '').toLowerCase() === q || (p.barcode ?? '').toLowerCase() === q);
    if (exact) { window.ScanBeep?.ok(); addToCart(exact); } // 🔊 v1.8
    else {
      const matches = findMatches(searchInput.value);
      if (matches.length === 1) { window.ScanBeep?.ok(); addToCart(matches[0]); }
    }
  });

  // 📸 v2.4 : webcam — code détecté → même logique que la douchette (le bip est dans scan.js)
  function onCameraCode(code) {
    const q = String(code).trim().toLowerCase();
    const exact = products.find((p) => (p.sku ?? '').toLowerCase() === q || (p.barcode ?? '').toLowerCase() === q);
    if (exact) { addToCart(exact); return; }
    const matches = findMatches(code);
    if (matches.length === 1) addToCart(matches[0]);
    else UI.toast(t('inv_scan_miss'), 'var(--warning)', 1500);
  }
  const camBtn = UI.h('button', {
    class: 'btn', title: t('sc_btn'), style: { marginLeft: '8px' },
    onclick: () => window.ScanCamera?.open({ onCode: onCameraCode, continuous: true }),
  }, '📸');

  // ---------- Panier ----------
  function stepQty(id, delta) {
    const l = cart.get(id);
    if (!l) return;
    const max = effQty(l.product);
    l.qty = Math.min(max, Math.max(1, l.qty + delta));
    renderCart();
  }

  function renderCart() {
    cartZone.innerHTML = '';
    if (!cart.size) {
      cartZone.appendChild(UI.empty('🛒', t('s_cart_empty'), t('s_cart_empty_sub')));
    } else {
      const tbl = UI.h('table', { class: 'tbl' },
        UI.h('tbody', {}, [...cart.values()].map((l) => UI.h('tr', {},
          UI.h('td', {},
            UI.h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, // 📸 v2.9 : vignette ligne panier
              l.product.image_url
                ? UI.h('img', { src: l.product.image_url, loading: 'lazy', style: { width: '26px', height: '26px', borderRadius: '7px', objectFit: 'cover', flexShrink: '0' } })
                : UI.h('span', { style: { fontSize: '14px' } }, '📦'),
              UI.h('div', {},
                UI.h('div', { class: 'strong', style: { fontSize: '13px' } }, Fmt.esc(l.product.name)),
                UI.h('div', { class: 'muted', style: { fontSize: '11.5px' } },
                  `${Fmt.money(linePrice(l.product))} × ${l.qty}`)))),
          UI.h('td', { style: { whiteSpace: 'nowrap' } },
            UI.h('button', { class: 'btn btn-sm btn-ghost', onclick: () => stepQty(l.product.id, -1) }, '−'),
            UI.h('b', { style: { margin: '0 8px' } }, String(l.qty)),
            UI.h('button', { class: 'btn btn-sm btn-ghost', onclick: () => stepQty(l.product.id, 1) }, '＋')),
          UI.h('td', { class: 'num strong' }, Fmt.money(linePrice(l.product) * l.qty)),
          UI.h('td', {}, UI.h('button', {
            class: 'btn btn-sm btn-ghost', style: { color: 'var(--danger)' },
            onclick: () => { cart.delete(l.product.id); renderCart(); },
          }, '✕'))))));
      cartZone.appendChild(tbl);
    }
    renderTotals();
  }

  // ---------- Client + fidélité + paiement ----------
  const customerSelect = UI.select({},
    [{ value: '', label: `👤 ${t('s_walkin')}` },
      ...customers.map((c) => ({
        value: c.id,
        label: `${c.name}${c.price_tier === 'wholesale' ? ' 🏷' : ''}${c.loyalty_points ? ` · 🎁${c.loyalty_points}` : ''}`,
      }))]);

  customerSelect.addEventListener('change', () => {
    customer = customers.find((c) => String(c.id) === customerSelect.value) ?? null;
    usePoints = false;
    renderCart(); // repricing tier éventuel + bloc points
  });

  const paidInput = UI.input({ type: 'number', min: 0, style: { textAlign: 'right', fontWeight: 800 } });

  function renderTotals() {
    totalZone.innerHTML = '';
    const total = cartTotal();
    if (!cart.size) { paidInput.value = ''; return; }

    const redeemable = maxRedeemable();
    if (redeemable > 0) {
      const row = UI.h('label', {
        style: { display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', padding: '8px 0', fontSize: '13px', fontWeight: 700 },
      },
        UI.h('input', {
          type: 'checkbox', ...(usePoints ? { checked: '' } : {}),
          onchange: (e) => { usePoints = e.target.checked; renderTotals(); },
        }),
        `🎁 ${t('s_points', { n: redeemable, amount: Fmt.num(discount() || redeemable * loyalty.point_value) })}`);
      totalZone.appendChild(row);
    }

    totalZone.appendChild(UI.h('div', {},
      UI.kv(t('s_total'), Fmt.money(total)),
      // 🧮 v2.9 : ventilation TVA estimée (config active uniquement, prix TTC)
      ...tvaLines().map(([rate, amt]) => UI.h('div', {
        class: 'muted', style: { display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '1px 0' },
      },
        UI.h('span', {}, t('tva_incl', { rate })),
        UI.h('span', {}, Fmt.money(amt)))),
      discount() > 0 ? UI.kv(t('s_discount'), `− ${Fmt.money(discount())}`) : null,
      UI.h('div', {
        style: { display: 'flex', justifyContent: 'space-between', margin: '8px 0 10px', alignItems: 'baseline' },
      },
        UI.h('b', { style: { fontSize: '14px' } }, t('s_net')),
        UI.h('b', { style: { fontSize: '26px', color: 'var(--accent)' } }, Fmt.money(netTotal()))),
      UI.h('div', { class: 'chips', style: { marginBottom: '8px' } },
        UI.h('button', { class: 'chip', onclick: () => { paidInput.value = netTotal(); } }, t('s_full')),
        UI.h('button', { class: 'chip', onclick: () => { paidInput.value = Math.round(netTotal() / 2); } }, t('s_half')),
        UI.h('button', { class: 'chip', onclick: () => { paidInput.value = 0; } }, `💳 ${t('s_credit')}`)),
      UI.field(t('s_paid'), paidInput)));
    paidInput.value = netTotal();
  }

  // ---------- 🧾 v2.10 : Devis / proforma LOCAUX (zéro serveur) ----------
  let quoteSeq = 1;

  /** Enregistre le panier courant comme brouillon de devis → PDF A5 offert. */
  async function saveQuoteDraft() {
    if (!cart.size) { UI.toast(t('q_empty'), 'var(--warning)'); return; }
    const lines = [...cart.values()].map((l) => ({ product_id: l.product.id, name: l.product.name, qty: l.qty, unit_price: linePrice(l.product) }));
    const q = Quotes.save(lines, { customer });
    if (!q) { UI.toast(t('q_empty'), 'var(--warning)'); return; }
    UI.toast(`${t('q_saved')} ${q.id}`, 'var(--success)', 4500);
    openQuotePreview(q);
  }

  /** Aperçu d'un devis : actions PDF / texte / charger / imprimer. */
  function openQuotePreview(q) {
    const body = UI.h('div', {},
      UI.h('div', { class: 'muted', style: { fontSize: '12.5px', marginBottom: '8px' } },
        `${new Date(q.created_at).toLocaleString('fr-FR')} · ${q.lines.length} article(s) · `,
        UI.h('b', {}, Fmt.money(q.total))),
      q.customer?.name ? UI.h('div', { style: { marginBottom: '8px' } }, `👥 ${Fmt.esc(q.customer.name)}`) : null,
      UI.h('div', { class: 'form-row', style: { flexWrap: 'wrap', gap: '8px' } },
        UI.h('button', { class: 'btn btn-primary', onclick: async (e) => { // 📄 PDF A5 immédiat
          e.target.disabled = true;
          try { const r = await Quotes.savePdf(q, t); if (r?.path) UI.toast(t('q_pdf_saved', { name: r.path.split('/').pop() }), 'var(--success)'); }
          catch (err) { UI.toast(err.message, 'var(--danger)', 4500); }
          finally { e.target.disabled = false; }
        } }, `📄 ${t('q_pdf')}`),
        UI.h('button', { class: 'btn', onclick: async () => { // 📋 texte → coller dans WhatsApp
          try { await Quotes.copyText(q, t); UI.toast(t('q_copied'), 'var(--success)', 4500); }
          catch (err) { UI.toast(String(err?.message ?? err), 'var(--danger)'); }
        } }, `📋 ${t('q_copy')}`),
        Thermal.isConfigured?.() ? UI.h('button', { class: 'btn', onclick: async () => { // 🖨 thermique 80 mm
          try { await Thermal.printQuote(q); UI.toast(t('th_quote_sent'), 'var(--success)'); }
          catch (err) { UI.toast(String(err?.message ?? err), 'var(--danger)', 4500); }
        } }, `🖨 ${t('q_print')}`) : null,
        UI.h('button', { class: 'btn btn-success', onclick: () => { close(); loadQuoteIntoCart(q); } }, `↩️ ${t('q_load')}`),
        UI.h('button', { class: 'btn', style: { color: 'var(--danger)' }, onclick: () => {
          Quotes.remove(q.id); UI.toast(`${t('q_deleted')} ${q.id}`); close();
        } }, '🗑')));
    const { close } = UI.modal({ title: `${t('q_number')} ${q.id}`, icon: '🧾', width: 'lg', children: body });
  }

  /** Liste des brouillons locaux (les plus récents d'abord). */
  function openQuotesList() {
    const drafts = Quotes.list();
    const body = UI.h('div', {},
      UI.h('button', { class: 'btn btn-primary', style: { justifyContent: 'center', marginBottom: '10px' },
        onclick: () => { close(); saveQuoteDraft(); } }, `➕ ${t('q_save')}`),
      UI.h('div', { class: 'card-title' }, t('q_list', { n: drafts.length })),
      drafts.length === 0 ? UI.empty('🧾', t('q_none')) :
        UI.h('table', { class: 'tbl' }, UI.h('tbody', {}, drafts.map((q) => UI.h('tr', {},
          UI.h('td', {},
            UI.h('div', { class: 'strong' }, q.id),
            UI.h('div', { class: 'muted', style: { fontSize: '11.5px' } },
              `${new Date(q.created_at).toLocaleDateString('fr-FR')} · ${q.lines.length} art.${q.customer?.name ? ` · ${Fmt.esc(q.customer.name)}` : ''}`)),
          UI.h('td', { class: 'num strong' }, Fmt.money(q.total)),
          UI.h('td', {}, UI.h('button', { class: 'btn btn-sm', onclick: () => { close(); openQuotePreview(q); } }, '👁')))))));
    const { close } = UI.modal({ title: t('q_title'), icon: '🧾', width: 'lg', children: body });
  }

  /** ↩️ Conversion en vente : recharge le brouillon dans le panier. */
  async function loadQuoteIntoCart(q) {
    if (cart.size && !(await UI.confirm(t('q_confirm_replace')))) return;
    let missing = 0; let loaded = 0;
    cart.clear();
    q.lines.forEach((l) => {
      const p = products.find((x) => x.id === l.product_id);
      if (!p) { missing++; return; }
      cart.set(p.id, { product: p, qty: Math.min(l.qty, Math.max(1, effQty(p))) });
      loaded++;
    });
    if (q.customer?.id) {
      const c = (customers ?? []).find((x) => x.id === q.customer.id);
      if (c) { customer = c; customerSelect.value = String(c.id); }
    }
    renderCart();
    UI.toast(t('q_loaded', { n: loaded }), missing ? 'var(--warning)' : 'var(--success)');
    if (missing) UI.toast(t('q_missing', { n: missing }), 'var(--warning)', 6000);
  }

  // ---------- Validation ----------
  const validateBtn = UI.h('button', { class: 'btn btn-success btn-lg' }, `✓ ${t('s_validate')}`);
  validateBtn.addEventListener('click', async () => {
    if (!cart.size) return;
    validateBtn.disabled = true;

    const paid = Math.min(netTotal(), Math.max(0, Math.round(Number(paidInput.value) || 0)));
    const payload = {
      customer_id: customer?.id ?? null,
      client_uuid: OfflineSales.uuid(), // 📡 v1.2 : idempotent (file hors ligne + anti double-clic)
      amount_paid: paid,
      points_redeem: pointsUsed() || undefined,
      items: [...cart.values()].map((l) => ({
        product_id: l.product.id,
        quantity: l.qty,
        unit_price: linePrice(l.product),
      })),
    };
    const applyLocalStock = () => [...cart.values()].forEach((l) => {
      l.product.quantity = Math.max(0, (l.product.quantity ?? 0) - l.qty);
      if (l.product.shop_stock != null) l.product.shop_stock = Math.max(0, l.product.shop_stock - l.qty);
    });
    const resetCart = () => { cart.clear(); usePoints = false; renderCart(); renderResults(''); };

    try {
      const res = await Api.post('/receipts', payload);
      window.Auto?.afterSale(res.data); // 🤖 v1.4 : ticket auto sans bouton (fire & forget)
      showReceiptModal(res.data);
      applyLocalStock(); // Le niveau de stock a bougé → cache local à jour
      resetCart();
    } catch (e) {
      if (e.network) {
        // 📡 Hors ligne : la vente part en file, synchronisée en arrière-plan
        OfflineSales.enqueue(payload, { total: netTotal(), client: customer?.name ?? t('s_walkin') });
        applyLocalStock();
        OfflineSales.saveCatalog(products, customers);
        resetCart();
        UI.toast(t('off_queued'), 'var(--warning)', 6000);
      } else {
        UI.toast(e.message, 'var(--danger)', 4500);
      }
    } finally {
      validateBtn.disabled = false;
    }
  });

  function showReceiptModal(r) {
    const paid = Math.round(Number(r.amount_paid) || 0);
    const net = Math.round(Number(r.total) - Number(r.points_discount ?? 0));
    const fileBase = `recu-${r.number}`;
    UI.modal({
      title: t('s_done'), icon: '✅', width: '',
      children: [
        UI.kv(t('s_receipt', { number: '' }), UI.h('span', { class: 'mono strong' }, `#${r.number}`)),
        UI.kv(t('s_net'), UI.h('b', { style: { color: 'var(--accent)', fontSize: '17px' } }, Fmt.money(net))),
        UI.kv(t('s_paid'), Fmt.money(paid)),
        net - paid > 0 ? UI.kv('💳', UI.badge('warning', t('s_remaining', { amount: Fmt.num(net - paid) }))) : null,
        r.points_earned ? UI.h('div', { class: 'form-ok', style: { marginTop: '10px', marginBottom: 0 } },
          t('s_points_earned', { n: r.points_earned })) : null,
        UI.h('div', { class: 'grid grid-cols-2', style: { marginTop: '16px', gap: '9px' } },
          window.Thermal?.isConfigured() ? UI.h('button', {
            class: 'btn btn-success',
            onclick: () => Thermal.printById(r.id)
              .then(() => UI.toast(t('th_printed'), 'var(--success)'))
              .catch((e) => UI.toast(e.message, 'var(--danger)')),
          }, `🖨 ${t('th_ticket')}`) : null,
          UI.h('button', {
            class: 'btn',
            onclick: () => Api.download(`/receipts/${r.id}/pdf`, `${fileBase}.pdf`)
              .catch((e) => UI.toast(e.message, 'var(--danger)')),
          }, `📄 ${t('s_pdf')}`),
          UI.h('button', {
            class: 'btn',
            onclick: () => Api.download(`/receipts/${r.id}/ticket`, `${fileBase}-ticket.pdf`)
              .catch((e) => UI.toast(e.message, 'var(--danger)')),
          }, `🖨 ${t('s_ticket')}`),
          window.sfpc?.print ? UI.h('button', {
            class: 'btn', onclick: () => window.sfpc.print(),
          }, `🖨 ${t('s_print')}`) : null,
          UI.h('button', { class: 'btn btn-primary', onclick: () => closeAll() }, `＋ ${t('s_new')}`)),
      ],
      onClose: () => searchInput.focus(),
    });
    function closeAll() {
      document.querySelectorAll('.overlay').forEach((o) => o.remove());
      searchInput.focus();
    }
  }

  // ---------- Layout 2 colonnes ----------
  view.innerHTML = '';
  view.append(UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('s_title')),
      UI.h('div', { class: 'page-sub' }, t('s_sub'))),
    UI.h('div', { style: { display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '14px', alignItems: 'start' } },
      UI.h('div', { class: 'card' },
        UI.h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } },
          UI.h('div', { class: 'searchbar', style: { flex: 1, marginBottom: '0' } },
            UI.h('span', { class: 'ico' }, '🔎'), searchInput),
          camBtn),
        resultsZone),
      UI.h('div', { class: 'card' },
        UI.h('div', { class: 'card-title' }, '🛒 ', t('s_cart')),
        UI.field(t('s_customer'), customerSelect),
        cartZone,
        totalZone,
        UI.h('div', { style: { marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'stretch' } },
          UI.h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } }, validateBtn),
          UI.h('button', { class: 'btn btn-lg', title: t('q_hint'), onclick: openQuotesList }, `🧾 ${t('q_btn')}`))))); // 🧾 v2.10 : devis

  renderResults('');
  renderCart();
  searchInput.focus();
};
