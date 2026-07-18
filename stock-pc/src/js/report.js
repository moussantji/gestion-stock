// ============================================================
// 📄 Rapport d'activité « patron » (v1.3) — rendu HTML A4 léger,
// converti en vrai fichier PDF par Electron (webContents.printToPDF)
// + boîte d'enregistrement native. Zéro changement backend :
// les données viennent de /stats/* et /shop existants.
// ============================================================
const StatReport = (() => {

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(Math.round(Number(n) || 0))} FCFA`;
  const now = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  function kpi(label, value, color = '#7C5CFF') {
    return `<td><div class="kpi" style="border-top-color:${color}">
      <div class="kpi-v">${value}</div><div class="kpi-l">${label}</div></div></td>`;
  }

  function table(head, rows) {
    if (!rows.length) return `<p class="muted">${I18n.t('rp_empty')}</p>`;
    return `<table><thead><tr>${head.map((h, i) => `<th class="${i > 1 ? 'r' : ''}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody></table>`;
  }

  /** HTML A4 complet (données = réponses de /stats/sales & /stats/margins) */
  function buildHtml({ period, sales, margins, shop, user, placeName }) {
    const t = I18n.t;
    const tt = sales?.totals ?? {};
    const mt = margins?.totals ?? null;
    const products = sales?.products ?? [];
    const sellers = sales?.sellers ?? [];
    const categories = sales?.categories ?? [];
    const mProducts = margins?.products ?? [];

    const maxRev = Math.max(...products.map((p) => Number(p.revenue ?? 0)), 1);
    const bar = (v, c = '#7C5CFF') =>
      `<div class="barwrap"><div class="bar" style="width:${Math.max(3, (Number(v) / maxRev) * 100)}%;background:${c}"></div></div>`;
    const FmtNum = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);

    const topRows = products.slice(0, 10).map((p, i) =>
      `<tr><td>${i + 1}</td><td><b>${esc(p.name ?? '—')}</b>${bar(p.revenue)}</td>
        <td class="r">${FmtNum(p.qty)} · ${p.share ?? 0}%</td><td class="r b">${money(p.revenue)}</td></tr>`);
    const sellerRows = sellers.slice(0, 10).map((s, i) =>
      `<tr><td>${i + 1}</td><td><b>${esc(s.name ?? '—')}</b></td>
        <td class="r">${FmtNum(s.receipts_count ?? 0)} ${t('rp_receipts')}</td><td class="r b">${money(s.revenue)}</td></tr>`);
    const catRows = categories.slice(0, 10).map((c, i) =>
      `<tr><td>${i + 1}</td><td><b>${esc(c.name ?? t('st_nocat'))}</b></td>
        <td class="r">${FmtNum(c.qty)} ${t('rp_sold')}</td><td class="r b">${money(c.revenue)}</td></tr>`);
    const marginRows = mProducts.slice(0, 12).map((p, i) => {
      const m = Number(p.margin ?? 0);
      const col = m >= 0 ? '#0e9f6e' : '#c81e1e';
      return `<tr><td>${i + 1}</td><td><b>${esc(p.name ?? '—')}</b></td>
        <td class="r">${FmtNum(p.qty)} ${t('rp_sold')} · ${p.rate ?? 0}%</td>
        <td class="r b" style="color:${col}">${money(m)}</td></tr>`;
    });

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2233; padding: 36px 44px; font-size: 12px; }
      .band { background: linear-gradient(100deg, #6846F0, #7C5CFF 60%, #22D3EE); border-radius: 12px;
        color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
      .band img { height: 44px; border-radius: 8px; background: #fff; padding: 3px; }
      .band .ttl { font-size: 21px; font-weight: 800; }
      .band .sub { opacity: .92; font-size: 11.5px; margin-top: 3px; }
      .meta { display: flex; justify-content: space-between; color: #6b7691; font-size: 10.5px; margin: 10px 2px 0; }
      h2 { font-size: 14px; margin: 22px 0 8px; color: #6846F0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; color: #6b7691; font-weight: 700; font-size: 10.5px; text-transform: uppercase;
        letter-spacing: .4px; padding: 6px 8px; border-bottom: 2px solid #e5e9f5; }
      th.r, td.r { text-align: right; }
      td { padding: 6px 8px; border-bottom: 1px solid #eef1f9; }
      tr:nth-child(even) td { background: #f8f9ff; }
      .b { font-weight: 700; }
      table.kpis td { border: none; padding: 4px; }
      .kpi { border: 1px solid #e5e9f5; border-top: 3px solid #7C5CFF; border-radius: 10px; padding: 10px 12px; }
      .kpi-v { font-size: 17px; font-weight: 800; }
      .kpi-l { color: #6b7691; font-size: 10px; margin-top: 3px; text-transform: uppercase; letter-spacing: .4px; }
      .muted { color: #8a94ad; font-style: italic; }
      .barwrap { background: #eef1f9; border-radius: 4px; height: 5px; margin-top: 4px; }
      .bar { border-radius: 4px; height: 5px; }
      .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e9f5; color: #8a94ad;
        font-size: 10px; display: flex; justify-content: space-between; }
      </style></head><body>

      <div class="band">
        ${shop?.logo_url ? `<img src="${esc(shop.logo_url)}" alt="">` : ''}
        <div>
          <div class="ttl">${esc(shop?.name ?? 'StockFlow')} — ${t('rp_title')}</div>
          <div class="sub">${t('rp_period')} : <b>${period}</b>${placeName ? ` · ${esc(placeName)}` : ''}${shop?.address ? ` · ${esc(shop.address)}` : ''}${shop?.phone ? ` · ${esc(shop.phone)}` : ''}</div>
        </div>
      </div>
      <div class="meta"><span>${t('rp_generated')} ${now()}</span><span>${t('rp_by')} ${esc(user?.name ?? '—')} (${t(`role_${user?.role ?? 'admin'}`)})</span></div>

      <h2>① ${t('rp_summary')}</h2>
      <table class="kpis"><tr>
        ${kpi(t('st_revenue'), money(tt.revenue ?? 0), '#22a06b')}
        ${kpi(t('st_receipts'), FmtNum(tt.receipts ?? 0))}
        ${kpi(t('st_items'), FmtNum(tt.items ?? 0), '#22D3EE')}
        ${kpi(t('st_avg'), money(tt.avg_basket ?? 0), '#e8a13d')}
      </tr>${mt ? `<tr>
        ${kpi(t('mg_cost'), money(mt.cost ?? 0), '#e05252')}
        ${kpi(t('mg_margin'), money(mt.margin ?? 0), '#6846F0')}
        ${kpi(t('mg_rate'), `${mt.rate ?? 0} %`, '#22D3EE')}
        ${kpi('', '')}
      </tr>` : ''}</table>

      <h2>② ${t('st_top_products')} (Top 10)</h2>
      ${table(['#', t('rp_product'), t('rp_qtyshare'), t('st_revenue')], topRows)}

      <h2>③ ${t('st_sellers')}</h2>
      ${table(['#', t('rp_seller'), t('st_receipts'), t('st_revenue')], sellerRows)}

      <h2>④ ${t('st_categories')}</h2>
      ${table(['#', t('p_category'), t('rp_qty'), t('st_revenue')], catRows)}

      ${mt ? `<h2>⑤ ${t('mg_title')}</h2>${table(['#', t('rp_product'), t('rp_qtyrate'), t('mg_margin')], marginRows)}` : ''}

      <div class="foot">
        <span>StockFlow PC — ${t('rp_indicative')}</span>
        <span>◆ StockFlow</span>
      </div>
      </body></html>`;
  }

  /** Génère et enregistre le PDF (Electron uniquement).
   *  opts.auto = true → 🤖 v1.4 : aucun dialogue, fichier du jour écrasé
   *  (le main écrit dans Documents/StockFlow/Rapports). */
  async function save(periodKey, opts = {}) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    const auto = opts.auto === true;
    const [sales, margins, shopRes] = await Promise.all([
      Api.get('/stats/sales', { period: periodKey }),
      Api.get('/stats/margins', { period: periodKey }).catch(() => null),
      Api.get('/shop').catch(() => null),
    ]);
    const picked = Api.pickedShop?.();
    const placeName = picked?.name ? `🏬 ${picked.name}` : (shopRes?.shop?.my_shop?.name ? `🏬 ${shopRes.shop.my_shop.name}` : null);
    const html = buildHtml({
      period: I18n.t(`st_period_${periodKey}`),
      sales, margins, shop: shopRes?.shop ?? Api.shop() ?? {},
      user: Api.user(), placeName,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const res = await window.sfpc.pdf.save({
      html,
      defaultName: auto
        ? `rapport-stockflow-${stamp}.pdf` // 🤖 clôture : 1 fichier / jour (remplacé si refait)
        : `rapport-stockflow-${periodKey}-${stamp}.pdf`,
      auto,
    });
    return res; // {saved:true,path} | {saved:false}
  }

  // ---------- 📄 Récap mensuel comptable (v1.7) ----------
  const monthLabel = (month) => {
    const [y, m] = String(month).split('-').map(Number);
    const loc = I18n.getLang?.() === 'en' ? 'en-GB' : 'fr-FR';
    const lbl = new Date(y, (m || 1) - 1, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
    return lbl.charAt(0).toUpperCase() + lbl.slice(1);
  };

  /** « vendredi 17 juillet 2026 » (localisé) — utilisé par le pack du jour v1.9 */
  const dayLabel = (iso) => {
    const loc = I18n.getLang?.() === 'en' ? 'en-GB' : 'fr-FR';
    const d = iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00') : new Date();
    return d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  /**
   * A4 générique d'un récap : KPIs + journal des Z (données = /accounting/summary).
   * v2.1 : factorisé — utilisé par le récap MENSUEL (v1.7) et le bilan HEBDO (lundi).
   */
  function buildRecapHtml({ title, periodLabel, recap, shop, user, placeName }) {
    const t = I18n.t;
    const rc = recap?.receipts ?? {};
    const cash = recap?.cash ?? {};
    const cl = recap?.closings ?? {};
    const days = cl.days ?? [];
    const remaining = Math.max(0, (rc.total ?? 0) - (rc.paid ?? 0) - (rc.points_discount ?? 0));

    // 🏬 v2.7 : détail par boutique sur la période (hebdo/mensuel) — clé additive
    // `by_shop` (serveur ≥ v2.7) ; vieux serveur ou < 2 boutiques → section absente.
    const shopRows0 = Array.isArray(recap?.by_shop) ? recap.by_shop : [];
    const shopRows = shopRows0.map((u, i) =>
      `<tr><td>${i + 1}</td><td><b>🏬 ${esc(u?.name ?? '—')}</b></td>
        <td class="r">${new Intl.NumberFormat('fr-FR').format(Number(u?.count ?? 0) || 0)}</td>
        <td class="r b">${money(u?.total ?? 0)}</td>
        <td class="r">${u?.share ?? 0} %</td></tr>`);
    const shopsBlock = shopRows.length >= 2
      ? `<h2>① bis — ${t('rp_shops')}</h2>
        ${table(['#', t('st_shops'), t('st_receipts'), t('st_revenue'), t('st_share')],
          [...shopRows, `<tr class="b" style="background:#eef1f9">
            <td></td><td>${t('mx_total')}</td>
            <td class="r">${new Intl.NumberFormat('fr-FR').format(shopRows0.reduce((s, u) => s + Number(u?.count ?? 0), 0))}</td>
            <td class="r">${money(shopRows0.reduce((s, u) => s + Number(u?.total ?? 0), 0))}</td>
            <td class="r">100 %</td></tr>`])}`
      : '';

    const dayRows = days.map((d) => `<tr>
      <td>${esc(d.date)}</td>
      <td class="r b">${money(d.sales_collected)}</td>
      <td class="r">+${money(d.total_in)}</td>
      <td class="r">−${money(d.total_out)}</td>
      <td class="r">${money(d.balance)}</td>
      <td>${esc(d.cashier ?? '')}</td></tr>`);
    const totalsRow = days.length ? `<tr class="b" style="background:#eef1f9">
      <td>${t('mx_total')}</td>
      <td class="r">${money(cl.sales ?? 0)}</td>
      <td class="r">+${money(days.reduce((s, d) => s + (d.total_in ?? 0), 0))}</td>
      <td class="r">−${money(days.reduce((s, d) => s + (d.total_out ?? 0), 0))}</td>
      <td class="r">${money(cl.end_balance ?? 0)}</td>
      <td></td></tr>` : '';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2233; padding: 36px 44px; font-size: 12px; }
      .band { background: linear-gradient(100deg, #6846F0, #7C5CFF 60%, #22D3EE); border-radius: 12px;
        color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
      .band img { height: 44px; border-radius: 8px; background: #fff; padding: 3px; }
      .band .ttl { font-size: 21px; font-weight: 800; }
      .band .sub { opacity: .92; font-size: 11.5px; margin-top: 3px; }
      .meta { display: flex; justify-content: space-between; color: #6b7691; font-size: 10.5px; margin: 10px 2px 0; }
      h2 { font-size: 14px; margin: 22px 0 8px; color: #6846F0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; color: #6b7691; font-weight: 700; font-size: 10.5px; text-transform: uppercase;
        letter-spacing: .4px; padding: 6px 8px; border-bottom: 2px solid #e5e9f5; }
      th.r, td.r { text-align: right; }
      td { padding: 6px 8px; border-bottom: 1px solid #eef1f9; }
      tr:nth-child(even) td { background: #f8f9ff; }
      .b { font-weight: 700; }
      table.kpis td { border: none; padding: 4px; }
      .kpi { border: 1px solid #e5e9f5; border-top: 3px solid #7C5CFF; border-radius: 10px; padding: 10px 12px; }
      .kpi-v { font-size: 17px; font-weight: 800; }
      .kpi-l { color: #6b7691; font-size: 10px; margin-top: 3px; text-transform: uppercase; letter-spacing: .4px; }
      .muted { color: #8a94ad; font-style: italic; }
      .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e9f5; color: #8a94ad;
        font-size: 10px; display: flex; justify-content: space-between; }
      </style></head><body>

      <div class="band">
        ${shop?.logo_url ? `<img src="${esc(shop.logo_url)}" alt="">` : ''}
        <div>
          <div class="ttl">${esc(shop?.name ?? 'StockFlow')} — ${title}</div>
          <div class="sub">${t('rp_period')} : <b>${periodLabel}</b>${placeName ? ` · ${esc(placeName)}` : ''}${shop?.address ? ` · ${esc(shop.address)}` : ''}${shop?.phone ? ` · ${esc(shop.phone)}` : ''}</div>
        </div>
      </div>
      <div class="meta"><span>${t('rp_generated')} ${now()}</span><span>${t('rp_by')} ${esc(user?.name ?? '—')}</span></div>

      <h2>① ${t('rp_summary')}</h2>
      <table class="kpis"><tr>
        ${kpi(t('mx_ca'), money(rc.total ?? 0), '#22a06b')}
        ${kpi(t('st_receipts'), String(rc.count ?? 0))}
        ${kpi(t('mx_paid'), money(rc.paid ?? 0), '#22D3EE')}
        ${kpi(t('mx_remaining'), money(remaining), '#e8a13d')}
      </tr><tr>
        ${kpi(t('mx_cash_in'), `+${money(cash.in ?? 0)}`, '#22a06b')}
        ${kpi(t('mx_cash_out'), `−${money(cash.out ?? 0)}`, '#e05252')}
        ${kpi(t('mx_end_balance'), money(cl.end_balance ?? 0), '#6846F0')}
        ${kpi(t('mx_z_count'), String(cl.count ?? 0), '#22D3EE')}
      </tr><tr>
        ${kpi(t('mx_points'), money(rc.points_discount ?? 0), '#e8a13d')}
        ${kpi(t('r_status_refunded'), money(rc.refunds_total ?? 0), '#e05252')}
        ${kpi(t('k_ops'), `${cash.ops ?? 0}`, '#7C5CFF')}
        ${kpi('', '')}
      </tr></table>

      ${shopsBlock}

      <h2>② ${t('mx_z_table')}</h2>
      ${days.length
        ? `<table><thead><tr>${[t('kz_date'), t('k_sales_today'), t('k_in_today'), t('k_out_today'), t('k_balance'), t('r_by')]
            .map((h, i) => `<th class="${i > 0 && i < 5 ? 'r' : ''}">${h}</th>`).join('')}</tr></thead>
          <tbody>${dayRows.join('')}${totalsRow}</tbody></table>`
        : `<p class="muted">${t('kz_none')}</p>`}

      ${(() => { // 👥 v2.9 : commissions vendeurs de la période (clé additive ; pct 0/absent = masquée)
        const com = recap?.commissions ?? null;
        const rows = (com?.sellers ?? []).map((s, i) =>
          `<tr><td>${i + 1}</td><td>${esc(s.name ?? '—')}</td><td class="r">${money(s.revenue ?? 0)}</td>
            <td class="r">${com.pct} %</td><td class="r"><b>${money(s.commission ?? 0)}</b></td></tr>`);
        if (!com?.pct || !rows.length) return '';
        return `<h2>② bis — ${t('com_title', { pct: com.pct })}</h2>
          ${table(['#', t('rp_seller'), t('st_revenue'), '%', t('com_due')],
            [...rows, `<tr class="b" style="background:#eef1f9"><td></td><td>${t('mx_total')}</td><td class="r">${money((com.sellers ?? []).reduce((s2, u) => s2 + Number(u?.revenue ?? 0), 0))}</td><td class="r">${com.pct} %</td><td class="r">${money(com.total ?? 0)}</td></tr>`])}`;
      })()}

      <div class="foot">
        <span>StockFlow PC — ${t('rp_indicative')}</span>
        <span>◆ StockFlow</span>
      </div>
      </body></html>`;
  }

  /** Récap mensuel → PDF. opts.auto = true → récap auto du 1er (zéro dialogue, v1.8). */
  async function saveMonthly(month, opts = {}) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    const auto = opts.auto === true;
    const [res, shopRes] = await Promise.all([
      Api.get('/accounting/summary', { month }),
      Api.get('/shop').catch(() => null),
    ]);
    const picked = Api.pickedShop?.();
    const placeName = picked?.name ? `🏬 ${picked.name}` : (shopRes?.shop?.my_shop?.name ? `🏬 ${shopRes.shop.my_shop.name}` : null);
    const html = buildMonthlyHtml({
      month, recap: res?.data ?? {},
      shop: shopRes?.shop ?? Api.shop() ?? {}, user: Api.user(), placeName,
    });
    return window.sfpc.pdf.save({ html, defaultName: `recapitulatif-${month}.pdf`, auto });
  }

  /** Rétro-compatibilité v1.7 : signature inchangée, délègue au moteur factorisé. */
  function buildMonthlyHtml({ month, recap, shop, user, placeName }) {
    return buildRecapHtml({
      title: I18n.t('mx_title'), periodLabel: monthLabel(month), recap, shop, user, placeName,
    });
  }

  // ---------- 🧮 Bilan hebdo (v2.1) — semaine lun→dim, mêmes agrégats /accounting/summary ----------
  function buildWeeklyHtml({ from, to, recap, shop, user, placeName }) {
    return buildRecapHtml({
      title: I18n.t('wk_title'),
      periodLabel: `${dayLabel(from)} → ${dayLabel(to)}`,
      recap, shop, user, placeName,
    });
  }

  /** Bilan hebdo → PDF. opts.auto = true → bilan auto du lundi (zéro dialogue, v2.1). */
  async function saveWeekly(from, to, opts = {}) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    const auto = opts.auto === true;
    const [res, shopRes] = await Promise.all([
      Api.get('/accounting/summary', { from, to }), // 🧮 mode plage v2.1
      Api.get('/shop').catch(() => null),
    ]);
    const picked = Api.pickedShop?.();
    const placeName = picked?.name ? `🏬 ${picked.name}` : (shopRes?.shop?.my_shop?.name ? `🏬 ${shopRes.shop.my_shop.name}` : null);
    const html = buildWeeklyHtml({
      from, to, recap: res?.data ?? {},
      shop: shopRes?.shop ?? Api.shop() ?? {}, user: Api.user(), placeName,
    });
    return window.sfpc.pdf.save({ html, defaultName: `bilan-hebdo-${from}_au_${to}.pdf`, auto });
  }

  // ---------- 📦 Pack du jour (v1.9) — PDF récap quotidien à la clôture ----------
  /** A4 du jour : KPIs (CA, nb ventes, panier moyen, caisse) + vendeurs + bloc Z.
   *  Données : clôture (Z) fraîche + /cash-ops/summary (zéro nouvel endpoint). */
  function buildDayPackHtml({ closing, summary, shop, user, placeName }) {
    const t = I18n.t;
    const FmtNum = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
    const sellers = Array.isArray(summary?.sales_by_user_today) ? summary.sales_by_user_today : [];
    // 🏬📊 v2.2 : comparatif boutiques du jour (si plusieurs boutiques actives)
    const shopRows0 = Array.isArray(summary?.sales_by_shop_today) ? summary.sales_by_shop_today : [];
    const shopRows = shopRows0.map((u, i) =>
      `<tr><td>${i + 1}</td><td><b>🏬 ${esc(u?.name ?? '—')}</b></td>
        <td class="r">${FmtNum(u?.count ?? 0)}</td><td class="r b">${money(u?.total ?? 0)}</td></tr>`);
    const shopsTotal = shopRows.length ? `<tr class="b" style="background:#eef1f9">
      <td></td><td>${t('mx_total')}</td>
      <td class="r">${FmtNum(shopRows0.reduce((s, u) => s + Number(u?.count ?? 0), 0))}</td>
      <td class="r">${money(shopRows0.reduce((s, u) => s + Number(u?.total ?? 0), 0))}</td></tr>` : '';
    // 📊 v2.0 : « vs hier » (clé absente sur ancien serveur → rien affiché)
    const y = summary?.sales_yesterday;
    const cmpLine = (() => {
      const yv = Number(y);
      if (y == null || !(yv > 0)) return '';
      const pct0 = Math.round(((Number(summary?.sales_collected_today ?? closing?.sales_collected ?? 0) - yv) / yv) * 100);
      const txt = pct0 === 0 ? t('db_cmp_flat') : pct0 > 0 ? t('db_cmp_up', { pct: pct0 }) : t('db_cmp_down', { pct: Math.abs(pct0) });
      return `<p class="muted" style="margin-top:6px">${txt}</p>`;
    })();
    const collected = Number(summary?.sales_collected_today ?? closing?.sales_collected ?? 0);
    const count = Number(summary?.sales_count_today ?? 0);
    const avg = count > 0 ? Math.round(collected / count) : 0;
    const dateStr = dayLabel(closing?.closing_date);

    const sellerRows = sellers.map((u, i) =>
      `<tr><td>${i + 1}</td><td><b>${esc(u?.name ?? '—')}</b></td>
        <td class="r">${FmtNum(u?.count ?? 0)} ${t('st_receipts').toLowerCase()}</td>
        <td class="r b">${money(u?.total ?? 0)}</td></tr>`);
    const sellerTotal = sellers.length ? `<tr class="b" style="background:#eef1f9">
      <td></td><td>${t('mx_total')}</td>
      <td class="r">${FmtNum(sellers.reduce((s, u) => s + Number(u?.count ?? 0), 0))}</td>
      <td class="r">${money(sellers.reduce((s, u) => s + Number(u?.total ?? 0), 0))}</td></tr>` : '';

    const zRows = closing ? `<table><tbody>
      <tr><td>${t('kz_date')}</td><td class="r b">${esc(dateStr)}</td></tr>
      <tr><td>${t('r_by')}</td><td class="r">${esc(closing.user?.name ?? '—')}</td></tr>
      <tr><td>${t('k_sales_today')}</td><td class="r b">${money(closing.sales_collected ?? 0)}</td></tr>
      <tr><td>${t('k_in_today')}</td><td class="r">+${money(closing.total_in ?? 0)}</td></tr>
      <tr><td>${t('k_out_today')}</td><td class="r">−${money(closing.total_out ?? 0)}</td></tr>
      <tr class="b" style="background:#eef1f9"><td>${t('k_balance')}</td><td class="r">${money(closing.balance ?? 0)}</td></tr>
      ${closing.notes ? `<tr><td>Note</td><td class="r">${esc(closing.notes)}</td></tr>` : ''}
    </tbody></table>
    <p style="margin-top:26px">${t('pk_signature')} : ______________________</p>` : `<p class="muted">${t('kz_none')}</p>`;

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2233; padding: 36px 44px; font-size: 12px; }
      .band { background: linear-gradient(100deg, #6846F0, #7C5CFF 60%, #22D3EE); border-radius: 12px;
        color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
      .band img { height: 44px; border-radius: 8px; background: #fff; padding: 3px; }
      .band .ttl { font-size: 21px; font-weight: 800; }
      .band .sub { opacity: .92; font-size: 11.5px; margin-top: 3px; }
      .meta { display: flex; justify-content: space-between; color: #6b7691; font-size: 10.5px; margin: 10px 2px 0; }
      h2 { font-size: 14px; margin: 22px 0 8px; color: #6846F0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; color: #6b7691; font-weight: 700; font-size: 10.5px; text-transform: uppercase;
        letter-spacing: .4px; padding: 6px 8px; border-bottom: 2px solid #e5e9f5; }
      th.r, td.r { text-align: right; }
      td { padding: 6px 8px; border-bottom: 1px solid #eef1f9; }
      tr:nth-child(even) td { background: #f8f9ff; }
      .b { font-weight: 700; }
      table.kpis td { border: none; padding: 4px; }
      .kpi { border: 1px solid #e5e9f5; border-top: 3px solid #7C5CFF; border-radius: 10px; padding: 10px 12px; }
      .kpi-v { font-size: 17px; font-weight: 800; }
      .kpi-l { color: #6b7691; font-size: 10px; margin-top: 3px; text-transform: uppercase; letter-spacing: .4px; }
      .muted { color: #8a94ad; font-style: italic; }
      .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e9f5; color: #8a94ad;
        font-size: 10px; display: flex; justify-content: space-between; }
      </style></head><body>

      <div class="band">
        ${shop?.logo_url ? `<img src="${esc(shop.logo_url)}" alt="">` : ''}
        <div>
          <div class="ttl">${esc(shop?.name ?? 'StockFlow')} — 📦 ${t('pk_title')}</div>
          <div class="sub">${t('rp_period')} : <b>${esc(dateStr)}</b>${placeName ? ` · ${esc(placeName)}` : ''}${shop?.address ? ` · ${esc(shop.address)}` : ''}${shop?.phone ? ` · ${esc(shop.phone)}` : ''}</div>
        </div>
      </div>
      <div class="meta"><span>${t('rp_generated')} ${now()}</span><span>${t('rp_by')} ${esc(user?.name ?? '—')}</span></div>

      <h2>① ${t('rp_summary')}</h2>
      <table class="kpis"><tr>
        ${kpi(t('k_sales_today'), money(collected), '#22a06b')}
        ${kpi(t('st_receipts'), FmtNum(count))}
        ${kpi(t('st_avg'), money(avg), '#e8a13d')}
        ${kpi(t('k_balance'), money(closing?.balance ?? 0), '#6846F0')}
      </tr><tr>
        ${kpi(t('k_in_today'), `+${money(closing?.total_in ?? 0)}`, '#22a06b')}
        ${kpi(t('k_out_today'), `−${money(closing?.total_out ?? 0)}`, '#e05252')}
        ${kpi('', '')}
        ${kpi('', '')}
      </tr></table>
      ${cmpLine}

      <h2>② ${t('pk_sellers')}</h2>
      ${sellers.length
        ? table(['#', t('rp_seller'), t('st_receipts'), t('st_revenue')], [...sellerRows, ...(sellerTotal ? [sellerTotal] : [])])
        : `<p class="muted">${t('pk_sellers_none')}</p>`}

      ${shopRows.length > 1 ? `<h2>② bis — ${t('pk_shops')}</h2>
      ${table(['#', t('pk_shop_col'), t('st_receipts'), t('st_revenue')], [...shopRows, ...(shopsTotal ? [shopsTotal] : [])])}` : ''}

      <h2>③ ${t('pk_z_block')}</h2>
      ${zRows}

      <div class="foot">
        <span>StockFlow PC — ${t('rp_indicative')}</span>
        <span>◆ StockFlow</span>
      </div>
      </body></html>`;
  }

  /** Pack jour → PDF (Electron). opts.auto = true → clôture : zéro dialogue, 1 fichier/jour. */
  async function saveDayPack(closing, opts = {}) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    const auto = opts.auto === true;
    const [summary, shopRes] = await Promise.all([
      Api.get('/cash-ops/summary').catch(() => null), // vendeurs du jour v1.9 (fallback ancien serveur : clé absente)
      Api.get('/shop').catch(() => null),
    ]);
    const picked = Api.pickedShop?.();
    const placeName = opts.placeName
      ?? (picked?.name ? `🏬 ${picked.name}` : (shopRes?.shop?.my_shop?.name ? `🏬 ${shopRes.shop.my_shop.name}` : null));
    const html = buildDayPackHtml({
      closing, summary,
      shop: shopRes?.shop ?? Api.shop() ?? {}, user: Api.user(), placeName,
    });
    const stamp = String(closing?.closing_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    return window.sfpc.pdf.save({ html, defaultName: `pack-jour-${stamp}.pdf`, auto });
  }

  // ---------- 📤 CSV des ventes du jour (v2.0) — le 2ᵉ fichier du pack ----------
  /** Échappement CSV : guillemets doublés + quoting si « ; », retour ligne ou « " » */
  const csvEsc = (v) => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  /**
   * Construit le CSV (BOM UTF-8 + « ; », conventions exports v1.6) des reçus du jour.
   * Fonction PURE (testable) : filtre sur created_at == dayStr, montants entiers pour Excel.
   */
  function buildDayCsv(receipts, dayStr) {
    const t = I18n.t;
    const rows = (Array.isArray(receipts) ? receipts : [])
      .filter((r) => String(r?.created_at ?? '').slice(0, 10) === dayStr);
    const head = [t('r_number'), t('kz_date'), t('ex_time'), t('rp_seller'), t('ex_customer'), t('ex_total'), t('ex_paid'), t('ex_remaining')];
    const lines = [head.map(csvEsc).join(';')];
    let st = 0; let sp = 0; let sr = 0;
    rows.forEach((r) => {
      const d = r.created_at ? new Date(r.created_at) : null;
      const time = d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      const remaining = Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0) - Number(r.points_discount ?? 0));
      st += Number(r.total ?? 0); sp += Number(r.amount_paid ?? 0); sr += remaining;
      lines.push([r.number ?? '', dayStr, time, r.user?.name ?? '', r.customer?.name ?? r.client_name ?? '',
        String(Number(r.total ?? 0)), String(Number(r.amount_paid ?? 0)), String(remaining)].map(csvEsc).join(';'));
    });
    if (rows.length) {
      lines.push([t('mx_total'), '', '', `${rows.length}`, '', String(st), String(sp), String(sr)].map(csvEsc).join(';'));
    }
    return '\uFEFF' + lines.join('\r\n');
  }

  /** CSV du jour → fichier (Electron). Pages /receipts re-tirées tant que le plus ancien reste dans le jour (max 4). */
  async function saveDayCsv(closing, opts = {}) {
    if (!window.sfpc?.file) throw new Error(I18n.t('rp_electron_only'));
    const auto = opts.auto === true;
    const dayStr = String(closing?.closing_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    let page = await Api.get('/receipts', { per_page: 250 });
    const receipts = [...(page?.data ?? [])];
    let p = 2;
    const maxPage = Math.min(4, Number(page?.last_page ?? 1)); // plafond : 1 000 reçus/jour
    while (p <= maxPage
      && receipts.length
      && String(receipts[receipts.length - 1]?.created_at ?? '').slice(0, 10) === dayStr) {
      page = await Api.get('/receipts', { per_page: 250, page: p }); // eslint-disable-line no-await-in-loop
      receipts.push(...(page?.data ?? []));
      p += 1;
    }
    const name = `ventes-jour-${dayStr}.csv`;
    const content = buildDayCsv(receipts, dayStr);
    const res = await window.sfpc.file.save({ name, content, auto });
    return { ...res, content, name }; // 📧 v2.1 : l'envoi email joint le CSV sans relire le disque
  }

  /** 📊 v2.10 — Libellé court d'un mois « AAAA-MM » selon la langue de l'app. */
  const monthShort = (ym) => {
    try {
      const [y, m] = String(ym).split('-').map(Number);
      return new Intl.DateTimeFormat(I18n.getLang?.() === 'en' ? 'en-GB' : 'fr-FR', { month: 'short', year: '2-digit' })
        .format(new Date(y, (m ?? 1) - 1, 1));
    } catch { return String(ym); }
  };

  /**
   * 📊 v2.10 — PDF patron « Rentabilité sur 12 mois » : KPIs + tableau mensuel
   * à double barre (CA clair vs marge foncée, mêmes gabarits maison).
   * @param rows [{ym, revenue, cost, margin, rate}] — clé additive by_month du serveur
   */
  function buildProfitHtml({ rows = [], shop, user, placeName }) {
    const t = I18n.t;
    const list = Array.isArray(rows) ? rows : [];
    const totalRev = list.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const totalMargin = list.reduce((s, r) => s + Number(r.margin ?? 0), 0);
    const avgRate = totalRev > 0 ? Math.round((totalMargin / totalRev) * 1000) / 10 : 0;
    const best = list.reduce((b, r) => (Number(r.margin ?? 0) > Number(b?.margin ?? -Infinity) ? r : b), null);
    const maxRev = Math.max(1, ...list.map((r) => Number(r.revenue ?? 0)));
    const lang = I18n.getLang?.() === 'en' ? 'en-GB' : 'fr-FR';
    const now = () => new Date().toLocaleString(lang, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const bodyRows = list.map((r) => {
      const wRev = Math.max(2, Math.round((Number(r.revenue ?? 0) / maxRev) * 100));
      const wMar = Math.max(0, Math.round((Math.max(0, Number(r.margin ?? 0)) / maxRev) * 100));
      return `<tr>
        <td><b>${esc(monthShort(r.ym))}</b></td>
        <td class="r">${money(r.revenue ?? 0)}</td>
        <td class="r">${money(r.cost ?? 0)}</td>
        <td class="r b" style="color:#22a06b">${money(r.margin ?? 0)}</td>
        <td class="r">${r.rate ?? 0} %</td>
        <td style="width:32%"><div style="background:#e6defe;border-radius:3px;height:7px;width:${wRev}%"></div>
          <div style="background:#22a06b;border-radius:3px;height:7px;width:${wMar}%;margin-top:2px"></div></td></tr>`;
    });
    const totalsRow = list.length ? `<tr class="b" style="background:#eef1f9">
      <td>${t('mx_total')}</td><td class="r">${money(totalRev)}</td><td class="r">${money(list.reduce((s, r) => s + Number(r.cost ?? 0), 0))}</td>
      <td class="r" style="color:#22a06b">${money(totalMargin)}</td><td class="r">${avgRate} %</td><td></td></tr>` : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2233; padding: 36px 44px; font-size: 12px; }
      .band { background: linear-gradient(100deg, #6846F0, #7C5CFF 60%, #22D3EE); border-radius: 12px;
        color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
      .band img { height: 44px; border-radius: 8px; background: #fff; padding: 3px; }
      .band .ttl { font-size: 21px; font-weight: 800; }
      .band .sub { opacity: .92; font-size: 11.5px; margin-top: 3px; }
      .meta { display: flex; justify-content: space-between; color: #6b7691; font-size: 10.5px; margin: 10px 2px 0; }
      h2 { font-size: 14px; margin: 22px 0 8px; color: #6846F0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; color: #6b7691; font-weight: 700; font-size: 10.5px; text-transform: uppercase;
        letter-spacing: .4px; padding: 6px 8px; border-bottom: 2px solid #e5e9f5; }
      th.r, td.r { text-align: right; }
      td { padding: 6px 8px; border-bottom: 1px solid #eef1f9; }
      tr:nth-child(even) td { background: #f8f9ff; }
      .b { font-weight: 700; }
      table.kpis td { border: none; padding: 4px; }
      .kpi { border: 1px solid #e5e9f5; border-top: 3px solid #7C5CFF; border-radius: 10px; padding: 10px 12px; }
      .kpi-v { font-size: 17px; font-weight: 800; }
      .kpi-l { color: #6b7691; font-size: 10px; margin-top: 3px; text-transform: uppercase; letter-spacing: .4px; }
      .muted { color: #8a94ad; font-style: italic; }
      .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e9f5; color: #8a94ad;
        font-size: 10px; display: flex; justify-content: space-between; }
      </style></head><body>
      <div class="band">
        ${shop?.logo_url ? `<img src="${esc(shop.logo_url)}" alt="">` : ''}
        <div>
          <div class="ttl">${esc(shop?.name ?? 'StockFlow')} — ${t('pf_title')}</div>
          <div class="sub">${t('pf_sub')}${placeName ? ` · ${esc(placeName)}` : ''}${shop?.address ? ` · ${esc(shop.address)}` : ''}${shop?.phone ? ` · ${esc(shop.phone)}` : ''}</div>
        </div>
      </div>
      <div class="meta"><span>${t('rp_generated')} ${now()}</span><span>${t('rp_by')} ${esc(user?.name ?? '—')}</span></div>
      <table class="kpis" style="margin-top:14px"><tr>
        ${kpi(t('mg_margin'), money(totalMargin), '#22a06b')}
        ${kpi(t('mg_rate'), `${avgRate} %`, '#6846F0')}
        ${kpi(t('mg_revenue'), money(totalRev), '#22D3EE')}
        ${best ? kpi(t('pf_best'), `${monthShort(best.ym)} · ${money(best.margin ?? 0)}`, '#e8a13d') : kpi('', '')}
      </tr></table>
      <h2>① ${t('pf_table')}</h2>
      <table><thead><tr>${[t('pf_month'), t('st_revenue'), t('mg_cost'), t('pf_margin'), t('mg_rate'), '']
        .map((h, i) => `<th class="${i >= 1 && i <= 4 ? 'r' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${list.length ? bodyRows.join('') + totalsRow : `<tr><td colspan="6" class="muted">${t('pf_none')}</td></tr>`}</tbody></table>
      <div class="foot"><span>StockFlow PC — ${t('rp_indicative')}</span><span>◆ StockFlow</span></div>
      </body></html>`;
  }

  /** 📊 v2.10 — PDF rentabilité → Documents/StockFlow/Rapports (Electron). */
  async function saveProfit(rows) {
    if (!window.sfpc?.pdf) throw new Error(I18n.t('rp_electron_only'));
    const shopRes = await Api.get('/shop').catch(() => null);
    const picked = Api.pickedShop?.();
    const placeName = picked?.name ? `🏬 ${picked.name}` : (shopRes?.shop?.my_shop?.name ? `🏬 ${shopRes.shop.my_shop.name}` : null);
    const stamp = new Date().toISOString().slice(0, 10);
    const html = buildProfitHtml({ rows, shop: shopRes?.shop ?? Api.shop() ?? {}, user: Api.user(), placeName });
    return window.sfpc.pdf.save({ html, defaultName: `rentabilite-12mois-${stamp}.pdf` });
  }

  return { buildHtml, save, buildRecapHtml, buildMonthlyHtml, saveMonthly, monthLabel, dayLabel, buildDayPackHtml, saveDayPack, csvEsc, buildDayCsv, saveDayCsv, buildWeeklyHtml, saveWeekly, monthShort, buildProfitHtml, saveProfit };
})();

if (typeof window !== 'undefined') window.StatReport = StatReport;
