// ============================================================
// 📊 Statistiques — CA, top produits / vendeurs / catégories,
// 💰 marges, détail par produit, exports Excel / CSV.
// Réservé admin/manager.
// ============================================================
window.Screens = window.Screens || {};

Screens.stats = async (view) => {
  const t = I18n.t;
  const PERIODS = ['7d', '30d', '90d', 'all'];
  let period = '30d';
  let saleData = null;
  let margins = null;

  const chips = UI.h('div', { class: 'chips' });
  const totalsZone = UI.h('div', { class: 'grid grid-cols-4' });
  const rankZone = UI.h('div');
  const marginZone = UI.h('div');
  const detailZone = UI.h('div');

  let custom = null; // 📅 v2.6 : { from, to } — période à dates libres (prioritaire sur `period`)
  const periodKey = () => (custom ? `${custom.from}_${custom.to}` : period); // pour les noms de fichiers

  async function load() {
    totalsZone.innerHTML = '';
    totalsZone.appendChild(UI.spinner());
    rankZone.innerHTML = '';
    marginZone.innerHTML = '';
    try {
      const params = custom ? { from: custom.from, to: custom.to } : { period };
      saleData = await Api.get('/stats/sales', params);
      margins = await Api.get('/stats/margins', { ...params, by_month: 1 }).catch(() => null); // 📊 v2.10 : rentabilité 12 mois (additif — vieux serveur : clé absente → carte masquée)
      renderAll();
    } catch (e) {
      totalsZone.innerHTML = '';
      totalsZone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function renderAll() {
    const totals = saleData?.totals ?? {};
    totalsZone.innerHTML = '';
    totalsZone.append(
      UI.statCard('💰', Fmt.moneyFull(totals.revenue ?? 0), t('st_revenue'), 'var(--success)'),
      UI.statCard('🧾', Fmt.num(totals.receipts ?? 0), t('st_receipts'), 'var(--primary)'),
      UI.statCard('📦', Fmt.num(totals.items ?? 0), t('st_items'), 'var(--accent)'),
      UI.statCard('🛒', Fmt.moneyFull(totals.avg_basket ?? 0), t('st_avg'), 'var(--warning)'));

    renderRanks();
    renderMargins();
    renderDetail();
  }

  // ---------- 🏆 Classements (barres) ----------
  function barList(icon, title, rows, getLabel, amountKey = 'revenue', color = 'var(--primary)') {
    const card = UI.h('div', { class: 'card', style: { marginTop: '14px' } },
      UI.h('div', { class: 'card-title' }, `${icon} ${title}`));
    if (!rows.length) {
      card.appendChild(UI.h('div', { class: 'muted', style: { padding: '8px 0' } }, t('st_none')));
      return card;
    }
    const max = Math.max(...rows.map((r) => Number(r[amountKey] ?? 0)), 1);
    rows.slice(0, 8).forEach((r, i) => {
      card.appendChild(UI.h('div', { style: { margin: '8px 0' } },
        UI.h('div', { class: 'form-row', style: { alignItems: 'baseline' } },
          UI.h('span', { class: 'muted', style: { width: '22px' } }, `${i + 1}.`),
          UI.h('span', { class: 'strong', style: { flex: 1 } }, Fmt.esc(getLabel(r) ?? '—')),
          r.qty !== undefined ? UI.h('span', { class: 'muted' }, `${t('st_qty', { qty: Fmt.num(r.qty) })} · ${r.share ?? 0}%`) : null,
          UI.h('span', { class: 'num strong', style: { color: 'var(--accent)', marginLeft: '8px' } }, Fmt.money(r[amountKey]))),
        UI.gauge(Number(r[amountKey] ?? 0) / max, color)));
    });
    return card;
  }

  function renderRanks() {
    rankZone.innerHTML = '';
    const products = saleData?.products ?? [];
    const sellers = saleData?.sellers ?? [];
    const categories = saleData?.categories ?? [];

    const cols = UI.h('div', { class: 'grid grid-cols-3', style: { gap: '12px' } });
    const pCard = barList('📦', t('st_top_products'), products, (r) => r.name, 'revenue', 'var(--primary)');
    const sCard = barList('👥', t('st_sellers'), sellers.map((s) => ({ ...s, qty: undefined })), (r) => r.name, 'revenue', 'var(--accent)');
    const cCard = barList('🏷️', t('st_categories'), categories, (r) => r.name ?? t('st_nocat'), 'revenue', 'var(--success)');
    [pCard, sCard, cCard].forEach((c) => { c.style.marginTop = '0'; cols.appendChild(c); });
    rankZone.appendChild(UI.h('div', { style: { marginTop: '14px' } }, cols));

    // ---------- ⚖️ v2.3 : comparatif vendeurs multi-postes (≥ 2 vendeurs) ----------
    if (sellers.length >= 2) rankZone.appendChild(buildSellersVersus(sellers));

    // ---------- 🏆 v2.8 : objectifs vendeurs du mois (réglage seller_monthly_target > 0) ----------
    const goals = saleData?.seller_goals ?? null;
    if (Number(goals?.target ?? 0) > 0 && (goals?.sellers ?? []).length >= 1) rankZone.appendChild(buildSellerGoals(goals));

    // ---------- 🏬 v2.5 : comparatif par boutique (≥ 2 boutiques ; clé absente = ancien serveur) ----------
    const shops = saleData?.by_shop ?? [];
    if (shops.length >= 2) rankZone.appendChild(buildShopsVersus(shops));

    // ---------- 📊🏬 v2.7 : heatmap croisée vendeurs × boutiques (≥ 2 × ≥ 2) ----------
    const cross = saleData?.cross ?? [];
    if (cross.length >= 2 && shops.length >= 2) rankZone.appendChild(buildCrossHeatmap(cross, shops));
  }

  /** 🏆 v2.8 — tableau d'avancement des objectifs vendeurs du mois calendaire en cours. */
  function buildSellerGoals(goals) {
    const comPct = Number(window.Api?.shop?.()?.commission_pct ?? 0); // 👥 v2.9 (additif /shop, 0 = masqué)
    const card = UI.h('div', { class: 'card', style: { marginTop: '12px' } },
      UI.h('div', { class: 'card-title' }, t('goal_title')),
      UI.h('div', { class: 'muted', style: { marginBottom: '8px', fontSize: '12px' } },
        t('goal_sub', { target: Fmt.money(goals.target) })));
    goals.sellers.slice(0, 8).forEach((g) => {
      const pct = Number(g.progress ?? 0);
      const reached = pct >= 100;
      const com = comPct > 0 ? Math.round(Number(g.revenue ?? 0) * comPct / 100) : 0;
      card.appendChild(UI.h('div', { style: { margin: '8px 0' } },
        UI.h('div', { class: 'form-row', style: { alignItems: 'baseline' } },
          UI.h('span', { class: 'strong', style: { flex: 1 } },
            `${reached ? '🏆' : '🎯'} ${Fmt.esc(g.name ?? '—')}`,
            reached ? UI.badge('success', ` ${t('goal_reached')}`) : null,
            com > 0 ? UI.h('span', { class: 'muted', style: { fontSize: '11px' } }, ` · 💰 ${t('com_month', { amt: Fmt.money(com) })}`) : null),
          UI.h('span', { class: 'num strong', style: { color: reached ? 'var(--success)' : 'var(--accent)', marginLeft: '8px' } },
            `${Fmt.money(Number(g.revenue ?? 0))} · ${Fmt.num(pct)}%`)),
        UI.gauge(Math.min(1, pct / 100), reached ? 'var(--success)' : 'var(--accent)'))); // 🎉 100 % : barre verte + badge
    });
    return card;
  }

  /** 📊🏬 v2.7 — matrice qui vend où : couleur d'autant plus foncée que le CA croisé est élevé. */
  function buildCrossHeatmap(cross, shops) {
    const cols = shops.slice(0, 6); // lisibilité avant tout
    const cellOf = (r, shopId) => Number((r.by_shop ?? [])
      .find((c) => (c.shop_id ?? null) === (shopId ?? null))?.revenue ?? 0);
    const maxCell = Math.max(1, ...cross.flatMap((r) => (r.by_shop ?? []).map((c) => Number(c.revenue ?? 0))));
    const MEDALS = ['🥇', '🥈', '🥉'];
    const heatCell = (v) => {
      if (!v) return UI.h('td', { class: 'num', style: { color: 'var(--muted)' } }, '·');
      const a = 0.10 + 0.65 * (v / maxCell); // 🎨 alpha 0.10 → 0.75
      return UI.h('td', { class: 'num', style: { background: `rgba(124, 92, 255, ${a.toFixed(2)})` } }, Fmt.money(v));
    };
    const card = UI.h('div', { class: 'card', style: { marginTop: '12px' } },
      UI.h('div', { class: 'card-title' }, t('st_cross_title')),
      UI.h('div', { class: 'muted', style: { marginBottom: '8px', fontSize: '12px' } }, t('st_cross_sub')));
    const totOf = (shopId) => cross.reduce((sum, r) => sum + cellOf(r, shopId), 0);
    card.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        UI.h('th', {}, t('rp_seller')),
        cols.map((s) => UI.h('th', { style: { textAlign: 'right' } }, `🏬 ${s.name ?? '—'}`)),
        UI.h('th', { style: { textAlign: 'right' } }, t('mx_total')))),
      UI.h('tbody', {},
        cross.slice(0, 8).map((r, i) => UI.h('tr', {},
          UI.h('td', { class: 'strong' }, `${MEDALS[i] ?? `${i + 1}.`} ${Fmt.esc(r.name ?? '—')}`),
          cols.map((s) => heatCell(cellOf(r, s.shop_id ?? null))),
          UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(r.total ?? 0)))),
        UI.h('tr', {},
          UI.h('td', { class: 'strong' }, t('mx_total')),
          cols.map((s) => UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(totOf(s.shop_id ?? null)))),
          UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } },
            Fmt.money(cross.reduce((sum, r) => sum + Number(r.total ?? 0), 0)))))));
    return card;
  }

  /** 📤 v2.5 — export « Excel » (CSV BOM + « ; ») du comparatif boutiques. */
  async function exportShopsCsv() {
    const rows = (saleData?.by_shop ?? []);
    if (!rows.length) return;
    const esc = StatReport.csvEsc;
    const head = ['#', t('st_shops'), t('st_receipts'), t('st_items'), `${t('st_avg')} (F)`, `${t('st_revenue')} (F)`, `${t('st_share')} (%)`];
    const lines = [head.map(esc).join(';')];
    rows.forEach((r, i) => {
      lines.push([String(i + 1), r.name ?? '', String(r.receipts_count ?? ''), String(r.items ?? ''),
        String(r.avg_basket ?? ''), String(Number(r.revenue ?? 0)), String(r.share ?? '')].map(esc).join(';'));
    });
    const content = '\uFEFF' + lines.join('\r\n');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const name = `comparatif-boutiques-${periodKey()}-${stamp}.csv`;
    try {
      if (window.sfpc?.file) {
        await window.sfpc.file.save({ name, content, auto: false }); // 📤 dialogue « Enregistrer sous »
      } else { // repli navigateur : téléchargement direct
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL?.(a.href);
      }
      UI.toast(t('st_vs_exported', { name }), 'var(--success)');
    } catch (e) {
      UI.toast(t('ap_csv_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
    }
  }

  /** 🏬 v2.5 — tableau comparatif des boutiques : ventes, articles, panier moyen, CA, part + barre. */
  function buildShopsVersus(shops) {
    const MEDALS = ['🥇', '🥈', '🥉'];
    const maxRev = Math.max(...shops.map((r) => Number(r.revenue ?? 0)), 1);
    const cell = (v) => (v === undefined || v === null ? '—' : v); // ancien serveur : repli doux
    const card = UI.h('div', { class: 'card', style: { marginTop: '12px' } },
      UI.h('div', { class: 'form-row', style: { justifyContent: 'space-between', alignItems: 'center' } },
        UI.h('div', { class: 'card-title' }, t('st_sh_title')),
        UI.h('button', { class: 'btn btn-sm', onclick: exportShopsCsv }, t('st_vs_export'))),
      UI.h('div', { class: 'muted', style: { marginBottom: '8px', fontSize: '12px' } }, t('st_sh_sub')));
    card.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        UI.h('th', {}, '#'),
        UI.h('th', {}, t('st_shops')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_receipts')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_items')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_avg')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_revenue')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_share')))),
      UI.h('tbody', {}, shops.map((r, i) => UI.h('tr', {},
        UI.h('td', {}, MEDALS[i] ?? `${i + 1}.`),
        UI.h('td', { class: 'strong' }, `🏬 ${Fmt.esc(r.name ?? '—')}`),
        UI.h('td', { class: 'num' }, cell(r.receipts_count !== undefined ? Fmt.num(r.receipts_count) : undefined)),
        UI.h('td', { class: 'num' }, cell(r.items !== undefined ? Fmt.num(r.items) : undefined)),
        UI.h('td', { class: 'num' }, cell(r.avg_basket !== undefined ? Fmt.money(r.avg_basket) : undefined)),
        UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(r.revenue ?? 0)),
        UI.h('td', { class: 'num' }, `${r.share ?? 0} %`),
        UI.h('td', { style: { minWidth: '110px' } }, UI.gauge(Number(r.revenue ?? 0) / maxRev, 'var(--success)')),
      )))));
    return card;
  }

  /** 📤 v2.4 — export « Excel » (CSV BOM + « ; ») du comparatif vendeurs. */
  async function exportSellersCsv() {
    const rows = (saleData?.sellers ?? []);
    if (!rows.length) return;
    const esc = StatReport.csvEsc;
    const head = ['#', t('st_sellers'), t('st_receipts'), t('st_items'), `${t('st_avg')} (F)`, `${t('st_revenue')} (F)`, `${t('st_share')} (%)`];
    const lines = [head.map(esc).join(';')];
    rows.forEach((r, i) => {
      lines.push([String(i + 1), r.name ?? '', String(r.receipts_count ?? ''), String(r.items ?? ''),
        String(r.avg_basket ?? ''), String(Number(r.revenue ?? 0)), String(r.share ?? '')].map(esc).join(';'));
    });
    const content = '\uFEFF' + lines.join('\r\n');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const name = `comparatif-vendeurs-${periodKey()}-${stamp}.csv`;
    try {
      if (window.sfpc?.file) {
        await window.sfpc.file.save({ name, content, auto: false }); // 📤 dialogue « Enregistrer sous »
      } else { // repli navigateur : téléchargement direct
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL?.(a.href);
      }
      UI.toast(t('st_vs_exported', { name }), 'var(--success)');
    } catch (e) {
      UI.toast(t('ap_csv_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
    }
  }

  /** ⚖️ v2.3 — tableau comparatif complet : ventes, articles, panier moyen, CA, part + barre. */
  function buildSellersVersus(sellers) {
    const MEDALS = ['🥇', '🥈', '🥉'];
    const maxRev = Math.max(...sellers.map((r) => Number(r.revenue ?? 0)), 1);
    const cell = (v) => (v === undefined || v === null ? '—' : v); // ancien serveur : repli doux
    const card = UI.h('div', { class: 'card', style: { marginTop: '12px' } },
      UI.h('div', { class: 'form-row', style: { justifyContent: 'space-between', alignItems: 'center' } },
        UI.h('div', { class: 'card-title' }, t('st_vs_title')),
        UI.h('button', { class: 'btn btn-sm', onclick: exportSellersCsv }, t('st_vs_export'))),
      UI.h('div', { class: 'muted', style: { marginBottom: '8px', fontSize: '12px' } }, t('st_vs_sub')));
    card.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        UI.h('th', {}, '#'),
        UI.h('th', {}, t('st_sellers')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_receipts')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_items')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_avg')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_revenue')),
        UI.h('th', { style: { textAlign: 'right' } }, t('st_share')))),
      UI.h('tbody', {}, sellers.map((r, i) => UI.h('tr', {},
        UI.h('td', {}, MEDALS[i] ?? `${i + 1}.`),
        UI.h('td', { class: 'strong' }, Fmt.esc(r.name ?? '—')),
        UI.h('td', { class: 'num' }, cell(r.receipts_count !== undefined ? Fmt.num(r.receipts_count) : undefined)),
        UI.h('td', { class: 'num' }, cell(r.items !== undefined ? Fmt.num(r.items) : undefined)),
        UI.h('td', { class: 'num' }, cell(r.avg_basket !== undefined ? Fmt.money(r.avg_basket) : undefined)),
        UI.h('td', { class: 'num strong', style: { color: 'var(--accent)' } }, Fmt.money(r.revenue ?? 0)),
        UI.h('td', { class: 'num' }, `${r.share ?? 0} %`),
        UI.h('td', { style: { minWidth: '110px' } }, UI.gauge(Number(r.revenue ?? 0) / maxRev, 'var(--primary)')),
      )))));
    return card;
  }

  // ---------- 💰 Marges ----------
  function renderMargins() {
    marginZone.innerHTML = '';
    if (!margins) return;
    const mt = margins.totals ?? {};
    marginZone.append(
      UI.h('div', { class: 'page-title', style: { margin: '18px 0 8px' } }, `💰 ${t('mg_title')}`),
      UI.h('div', { class: 'grid grid-cols-4' },
        UI.statCard('💰', Fmt.moneyFull(mt.revenue ?? 0), t('mg_revenue'), 'var(--success)'),
        UI.statCard('💸', Fmt.moneyFull(mt.cost ?? 0), t('mg_cost'), 'var(--danger)'),
        UI.statCard('🏆', Fmt.moneyFull(mt.margin ?? 0), t('mg_margin'), 'var(--primary)'),
        UI.statCard('📈', `${mt.rate ?? 0} %`, t('mg_rate'), 'var(--accent)')));

    const rows = margins.products ?? [];
    if (!rows.length) {
      marginZone.appendChild(UI.h('div', { class: 'muted', style: { marginTop: '8px' } }, t('mg_none')));
    } else {
      const maxM = Math.max(...rows.map((r) => Math.abs(Number(r.margin ?? 0))), 1);
      const card = UI.h('div', { class: 'card', style: { marginTop: '12px' } });
      rows.slice(0, 10).forEach((r) => {
        const m = Number(r.margin ?? 0);
        card.appendChild(UI.h('div', { style: { margin: '8px 0' } },
          UI.h('div', { class: 'form-row', style: { alignItems: 'baseline' } },
            UI.h('span', { class: 'strong', style: { flex: 1 } }, Fmt.esc(r.name ?? '—')),
            UI.h('span', { class: 'muted' }, `${t('st_qty', { qty: Fmt.num(r.qty ?? 0) })} · ${r.rate ?? 0} %`),
            UI.h('span', {
              class: 'num strong',
              style: { color: m >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: '8px' },
            }, Fmt.money(m))),
          UI.gauge(Math.abs(m) / maxM, m >= 0 ? 'var(--success)' : 'var(--danger)')));
      });
      marginZone.appendChild(card);
    }
    marginZone.appendChild(UI.h('div', { class: 'muted', style: { marginTop: '8px', fontSize: '12px' } }, `ℹ️ ${t('mg_hint')}`));
    renderProfitCard(marginZone); // 📊 v2.10
  }

  // ---------- 📊 v2.10 : Rentabilité sur 12 mois (clé additive by_month) ----------
  function renderProfitCard(zone) {
    const rows = margins?.by_month ?? [];
    if (rows.length < 2) return; // vieux serveur ou presque pas d'historique → masqué
    const maxRev = Math.max(1, ...rows.map((r) => Number(r.revenue ?? 0)));
    const totalRev = rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const totalMarg = rows.reduce((s, r) => s + Number(r.margin ?? 0), 0);
    const avgRate = totalRev > 0 ? Math.round((totalMarg / totalRev) * 1000) / 10 : 0;
    const best = rows.reduce((b, r) => (Number(r.margin ?? 0) > Number(b?.margin ?? -Infinity) ? r : b), null);
    const pdfBtn = UI.h('button', { class: 'btn', onclick: async () => {
      pdfBtn.disabled = true;
      try { const r = await StatReport.saveProfit(rows); if (r?.path) UI.toast(t('pf_pdf_saved', { name: r.path.split('/').pop() }), 'var(--success)', 5000); }
      catch (e) { UI.toast(e.message, 'var(--danger)', 4500); }
      finally { pdfBtn.disabled = false; }
    } }, `📈 ${t('pf_pdf')}`);
    zone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '12px' } },
      UI.h('div', { class: 'card-title' }, `📈 ${t('pf_title')}`),
      UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, t('pf_sub')),
      UI.h('div', { class: 'grid grid-cols-3', style: { marginBottom: '10px' } },
        UI.statCard('💰', Fmt.moneyFull(totalMarg), t('mg_margin'), 'var(--success)'),
        UI.statCard('📈', `${avgRate} %`, t('mg_rate'), 'var(--accent)'),
        UI.statCard('🏆', best ? StatReport.monthShort(best.ym) : '—', t('pf_best'), 'var(--warning)')),
      // Double barres : CA (lavande) vs marge (vert) par mois — divs pures, inspectables
      UI.h('div', { class: 'profit-chart', style: { display: 'flex', alignItems: 'flex-end', gap: '5px', height: '112px', padding: '4px 2px' } },
        rows.map((r) => {
          const hRev = Math.max(3, Math.round((Number(r.revenue ?? 0) / maxRev) * 92));
          const hMar = Math.max(2, Math.round((Math.max(0, Number(r.margin ?? 0)) / maxRev) * 92));
          return UI.h('div', { style: { flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', height: '100%' },
            title: `${StatReport.monthShort(r.ym)} — ${Fmt.money(Number(r.revenue ?? 0))} / ${Fmt.money(Number(r.margin ?? 0))}` },
            UI.h('div', { class: 'bar-rev', style: { width: '38%', height: `${hRev}px`, background: '#cdbcff', borderRadius: '3px 3px 0 0' } }),
            UI.h('div', { class: 'bar-margin', style: { width: '38%', height: `${hMar}px`, background: 'var(--success)', borderRadius: '3px 3px 0 0' } }));
        })),
      UI.h('div', { style: { display: 'flex', justifyContent: 'center', gap: '14px', fontSize: '11px', margin: '4px 0 2px' } },
        UI.h('span', { class: 'muted' }, '▪ ', t('st_revenue'), UI.h('i', { style: { background: '#cdbcff', display: 'inline-block', width: '9px', height: '9px', borderRadius: '2px', marginLeft: '5px' } })),
        UI.h('span', { class: 'muted' }, '▪ ', t('pf_margin'), UI.h('i', { style: { background: 'var(--success)', display: 'inline-block', width: '9px', height: '9px', borderRadius: '2px', marginLeft: '5px' } }))),
      UI.h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', margin: '2px 0 8px' } },
        rows.map((r) => UI.h('span', { class: 'muted', style: { fontSize: '9px', width: '8%', textAlign: 'center', whiteSpace: 'nowrap' } }, StatReport.monthShort(r.ym).replace(/[. ]/g, '')))),
      UI.h('div', { class: 'form-row', style: { justifyContent: 'center' } }, pdfBtn)));
  }

  // ---------- 🔎 Détail par produit ----------
  function renderDetail() {
    detailZone.innerHTML = '';
    const products = saleData?.products ?? [];
    if (!products.length) return;

    const select = UI.select({ style: { maxWidth: '320px' } }, [
      { value: '', label: `— ${t('st_detail_ph')} —` },
      ...products.map((p) => ({ value: p.product_id, label: p.name })),
    ]);
    const result = UI.h('div', { style: { marginTop: '10px' } });

    select.addEventListener('change', async () => {
      result.innerHTML = '';
      if (!select.value) return;
      result.appendChild(UI.spinner());
      try {
        const d = await Api.get('/stats/product-movements', { product_id: select.value, period });
        const tt = d.totals ?? {};
        result.innerHTML = '';
        result.append(
          UI.h('div', { class: 'grid grid-cols-4' },
            UI.statCard('⬇️', Fmt.num(tt.in ?? 0), t('st_in'), 'var(--success)'),
            UI.statCard('⬆️', Fmt.num(tt.out ?? 0), t('st_out'), 'var(--danger)'),
            UI.statCard('🛒', Fmt.num(tt.sold_qty ?? 0), t('st_sold'), 'var(--primary)'),
            UI.statCard('💰', Fmt.moneyFull(tt.sold_revenue ?? 0), t('st_revenue'), 'var(--accent)')));
      } catch (e) {
        result.innerHTML = '';
        result.appendChild(UI.h('div', { class: 'form-error' }, e.message));
      }
    });

    detailZone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '16px' } },
      UI.h('div', { class: 'card-title' }, `🔎 ${t('st_detail_title')}`),
      UI.h('div', { class: 'form-row', style: { marginTop: '8px' } }, select),
      result));
  }

  // ---------- Périodes + exports ----------
  // ---------- 📅 v2.6 : dates libres (Du … au …) ----------
  const rangeChip = UI.h('button', { class: 'chip', style: { display: 'none' } });
  const clearCustom = () => { custom = null; rangeChip.style.display = 'none'; };
  rangeChip.addEventListener('click', () => { // ✕ → retour à la période standard (30 j)
    clearCustom();
    period = '30d';
    chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chips.querySelector('.chip')?.classList.add('active');
    load();
  });

  PERIODS.forEach((p) => {
    const chip = UI.h('button', { class: `chip ${period === p ? 'active' : ''}` }, t(`st_period_${p}`));
    chip.addEventListener('click', () => {
      clearCustom();
      period = p;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      load();
    });
    chips.appendChild(chip);
  });

  const dateFrom = UI.input({ type: 'date', style: { maxWidth: '148px' } });
  const dateTo = UI.input({ type: 'date', style: { maxWidth: '148px' } });
  const applyRangeBtn = UI.h('button', { class: 'btn btn-sm' }, `📅 ${t('st_apply')}`);
  applyRangeBtn.addEventListener('click', () => {
    // 📅 v2.6 : YYYY-MM-DD garanti par <input type=date> ; le serveur permute si inversé
    if (!dateFrom.value || !dateTo.value) { UI.toast(t('st_pick_dates'), 'var(--warning)'); return; }
    custom = { from: dateFrom.value, to: dateTo.value };
    chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    rangeChip.textContent = `${t('st_du')} ${dateFrom.value} ${t('st_au')} ${dateTo.value} ✕`;
    rangeChip.classList.add('active');
    rangeChip.style.display = '';
    load();
  });
  chips.append(dateFrom, dateTo, applyRangeBtn, rangeChip);

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('st_title')),
      UI.h('div', { class: 'page-sub' }, t('st_sub'))),
    UI.h('div', { class: 'form-row no-print', style: { alignItems: 'center', flexWrap: 'wrap' } },
      chips,
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', {
        class: 'btn btn-primary',
        onclick: async (e) => {
          // 📄 v1.3 : rapport patron → vrai PDF A4 (Electron uniquement)
          const b = e.currentTarget;
          b.disabled = true;
          try {
            const res = await StatReport.save(period);
            if (res?.saved) UI.toast(t('rp_saved'), 'var(--success)', 6000);
            else UI.toast(t('rp_cancelled'), 'var(--info)');
          } catch (err) { UI.toast(err.message, 'var(--danger)'); }
          b.disabled = false;
        },
      }, `📄 ${t('rp_open')}`),
      UI.h('button', {
        class: 'btn',
        onclick: () => Api.download(`/stats/export.xlsx?period=${period}`, `stats-ventes-${period}.xlsx`)
          .catch((e) => UI.toast(e.message, 'var(--danger)')),
      }, `📊 ${t('st_export_xlsx')}`),
      UI.h('button', {
        class: 'btn btn-ghost',
        onclick: () => Api.download('/export/products', 'produits.csv')
          .catch((e) => UI.toast(e.message, 'var(--danger)')),
      }, `⬇️ ${t('st_export_products')}`),
      UI.h('button', {
        class: 'btn btn-ghost',
        onclick: () => Api.download('/export/movements', 'mouvements.csv')
          .catch((e) => UI.toast(e.message, 'var(--danger)')),
      }, `⬇️ ${t('st_export_movements')}`)),
    totalsZone,
    rankZone,
    marginZone,
    detailZone,
    accountingCard()); // 🧾 v1.6

  // ---------- 🧾 v1.6 : export comptable mensuel (CSV pour le comptable) ----------
  function accountingCard() {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthInput = UI.input({ type: 'month', value: curMonth, style: { maxWidth: '170px' } });
    const TYPES = ['receipts', 'cash', 'closings'];
    const FILES = (m) => ({ receipts: `ventes-${m}.csv`, cash: `caisse-${m}.csv`, closings: `z-caisse-${m}.csv` });

    const dl = (type) => {
      const m = monthInput.value || curMonth;
      return Api.download(`/accounting/export?type=${type}&month=${m}`, FILES(m)[type])
        .catch((e) => { UI.toast(e.message, 'var(--danger)'); throw e; });
    };
    const btn = (label, type) => UI.h('button', {
      class: 'btn', onclick: () => dl(type).catch(() => {}),
    }, label);

    const allBtn = UI.h('button', { class: 'btn btn-primary' }, `📦 ${t('ex_all')}`);
    allBtn.addEventListener('click', async () => {
      allBtn.disabled = true;
      let n = 0;
      for (const type of TYPES) { // séquentiel : 1 téléchargement à la fois
        try { await dl(type); n++; } catch { /* toast déjà affiché */ }
      }
      UI.toast(t('ex_done', { n }), n === TYPES.length ? 'var(--success)' : 'var(--warning)', 5000);
      allBtn.disabled = false;
    });

    return UI.h('div', { class: 'card', style: { marginTop: '14px' } },
      UI.h('div', { class: 'card-title' }, `🧾 ${t('ex_title')}`),
      UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '10px' } }, t('ex_sub')),
      UI.h('div', { class: 'form-row', style: { alignItems: 'flex-end', flexWrap: 'wrap' } },
        UI.field(t('ex_month'), monthInput),
        btn(`📜 ${t('ex_receipts')}`, 'receipts'),
        btn(`💵 ${t('ex_cash')}`, 'cash'),
        btn(`🔒 ${t('ex_closings')}`, 'closings'),
        UI.h('button', {
          class: 'btn',
          onclick: async (e) => {
            const b = e.currentTarget; b.disabled = true;
            try {
              const res = await StatReport.saveMonthly(monthInput.value || curMonth);
              if (res?.saved) UI.toast(t('rp_saved'), 'var(--success)', 6000);
              else UI.toast(t('rp_cancelled'), 'var(--info)');
            } catch (err) { UI.toast(err.message, 'var(--danger)'); }
            b.disabled = false;
          },
        }, `📄 ${t('ex_pdf')}`),
        allBtn));
  }

  load();
};
