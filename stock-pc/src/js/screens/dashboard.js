// ============================================================
// 🏠 Tableau de bord — stat cards + graphe 7 j + listes
// (même source GET /api/dashboard que l'app mobile)
// ============================================================
window.Screens = window.Screens || {};

Screens.dashboard = async (view) => {
  const t = I18n.t;
  const dash = await Api.get('/dashboard');
  const s = dash?.stats ?? {};
  view.innerHTML = '';

  // ---------- Stat cards ----------
  view.appendChild(UI.h('div', { class: 'page-head no-print' },
    UI.h('div', { class: 'page-title' }, t('dash_title')),
    UI.h('div', { class: 'page-sub' }, t('dash_sub'))));

  // ---------- ⚡ v1.5 : badge du jour EN DIRECT (admin/manager) ----------
  if (window.App?.hasRole?.('admin', 'manager')) {
    const amountEl = UI.h('b', { style: { fontSize: '30px', color: '#fff', letterSpacing: '.3px' } }, '…');
    const deltaEl = UI.h('span', {
      class: 'live-delta', style: { display: 'none' },
    });
    const timeEl = UI.h('span', { style: { fontSize: '10.5px', opacity: 0.8, display: 'block', textAlign: 'right' } });
    // 📦 v1.6 : chip alerte stock bas, cliquable → écran Alertes (en direct aussi)
    const alertChip = UI.h('button', {
      class: 'live-alertchip', type: 'button', style: { display: 'none' },
      title: I18n.t('nav_alerts'),
      onclick: () => { location.hash = '#/alerts'; },
    });
    const paintAlerts = (n) => {
      alertChip.textContent = `📦 ${I18n.t('db_alert_chip', { n })}`;
      alertChip.style.display = n > 0 ? '' : 'none';
    };
    paintAlerts((s.low_stock ?? 0) + (s.out_of_stock ?? 0)); // seed = données du chargement page
    // 📉 v2.8 : chip « ruptures imminentes (≤ 7 j) » — prévisions en surface (route restock-forecast v14, non bloquant)
    const fcChip = UI.h('button', {
      class: 'live-alertchip', type: 'button', style: { display: 'none' },
      title: I18n.t('a_tab_forecast'),
      onclick: () => { location.hash = '#/alerts'; },
    });
    const paintFc = (n) => {
      fcChip.textContent = `⏳ ${I18n.t('db_fc_chip', { n })}`;
      fcChip.style.display = n > 0 ? '' : 'none';
    };
    const countEl = UI.h('span', { style: { display: 'block', textAlign: 'right', fontSize: '12px', fontWeight: 700, opacity: 0.95 } }); // 🧾 v1.8 : nb ventes du jour
    // 👥 v1.9 : totaux du jour par vendeur (clé API sales_by_user_today ; absente sur ancien serveur → caché)
    const sellersBox = UI.h('div', { style: { display: 'none', textAlign: 'right', fontSize: '10.5px', opacity: 0.92, marginTop: '3px', lineHeight: '1.55' } });
    // 📊 v2.0 : comparatif « vs hier » (clé API sales_yesterday ; absente → masqué)
    const cmpEl = UI.h('span', { style: { display: 'none', textAlign: 'right', fontSize: '11px', fontWeight: 800, marginTop: '1px' } });
    const paintCmp = (v, y) => {
      const yv = Number(y);
      if (y == null || !(yv > 0)) { cmpEl.style.display = 'none'; return; }
      const pct = Math.round(((v - yv) / yv) * 100);
      if (pct === 0) { cmpEl.textContent = I18n.t('db_cmp_flat'); cmpEl.style.color = 'rgba(255,255,255,.92)'; }
      else if (pct > 0) { cmpEl.textContent = I18n.t('db_cmp_up', { pct }); cmpEl.style.color = '#86EFAC'; }
      else { cmpEl.textContent = I18n.t('db_cmp_down', { pct: Fmt.num(Math.abs(pct)) }); cmpEl.style.color = '#FCA5A5'; }
      cmpEl.style.display = 'block';
    };
    const paintSellers = (list) => {
      const rows = (Array.isArray(list) ? list : []).slice(0, 3);
      sellersBox.innerHTML = '';
      if (!rows.length) { sellersBox.style.display = 'none'; return; }
      rows.forEach((u) => sellersBox.appendChild(UI.h('div', {}, `👤 ${t('db_seller_line', {
        name: String(u?.name ?? '—'), n: Math.round(Number(u?.count ?? 0)), total: Fmt.num(u?.total ?? 0),
      })}`)));
      sellersBox.style.display = 'block';
    };
    let lastVal = null;
    async function refresh() {
      try {
        const [sm, dg, rf] = await Promise.all([
          Api.get('/cash-ops/summary'),
          Api.get('/dashboard').catch(() => null), // 📦 v1.6 : alertes stock en direct (non bloquant)
          Api.get('/products/restock-forecast').catch(() => null), // 📉 v2.8 : imminentes ≤ 7 j (non bloquant)
        ]);
        if (dg?.stats) paintAlerts((dg.stats.low_stock ?? 0) + (dg.stats.out_of_stock ?? 0));
        paintFc((rf?.data ?? []).filter((r) => Number(r?.days_left ?? 99) <= 7).length);
        // 🐞 v1.8 : le vrai champ API est sales_collected_today (fallback ancien nom)
        const v = Math.round(Number(sm?.sales_collected_today ?? sm?.sales_today ?? 0));
        countEl.textContent = t('db_receipts_count', { n: Math.round(Number(sm?.sales_count_today ?? 0)) }); // 🧾
        paintSellers(sm?.sales_by_user_today); // 👥 v1.9 (undefined = ancien serveur → masqué)
        paintCmp(v, sm?.sales_yesterday ?? null); // 📊 v2.0 : « J vs J-1 »
        const grew = lastVal != null && v > lastVal;
        amountEl.textContent = Fmt.moneyFull(v);
        amountEl.style.color = grew ? '#86EFAC' : '#fff'; // 🟢 flash à la nouvelle vente
        if (grew) {
          deltaEl.textContent = `+${Fmt.num(v - lastVal)} F 🎉`;
          deltaEl.style.display = '';
          setTimeout(() => { deltaEl.style.display = 'none'; amountEl.style.color = '#fff'; }, 6000);
        }
        lastVal = v;
        timeEl.textContent = t('db_updated', {
          time: new Date().toLocaleTimeString(I18n.getLang() === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } catch { /* badge non vital : repli silencieux (403 employé, réseau…) */ }
    }
    const card = UI.h('div', {
      class: 'card no-print',
      style: {
        marginBottom: '14px', border: 'none', color: '#fff',
        background: 'linear-gradient(100deg, #5235E8, #7C5CFF 55%, #22D3EE)',
      },
    }, UI.h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' } },
      UI.h('div', { style: { fontSize: '26px' } }, '⚡'),
      UI.h('div', { style: { flex: 1, minWidth: '190px' } },
        UI.h('div', { style: { display: 'flex', alignItems: 'center', gap: '9px', fontWeight: 800, fontSize: '14px', flexWrap: 'wrap' } },
          t('db_today_title'),
          UI.h('span', { class: 'live-chip' }, UI.h('span', { class: 'live-dot' }), t('db_live')),
          alertChip, fcChip),
        UI.h('div', { style: { fontSize: '11.5px', opacity: 0.85, marginTop: '3px' } }, t('db_today_sub'))),
      UI.h('div', {}, amountEl, deltaEl, cmpEl, countEl, sellersBox, timeEl)));
    view.appendChild(card);
    refresh();
    const timer = setInterval(() => {
      if (!card.isConnected) { clearInterval(timer); return; } // écran quitté → stop
      refresh();
    }, 30000);
    timer.unref?.(); // Node/tests : ne pas garder le process vivant
  }

  const alertsCount = (s.low_stock ?? 0) + (s.out_of_stock ?? 0);
  view.appendChild(UI.h('div', { class: 'grid grid-cols-4' },
    UI.statCard('💰', Fmt.moneyFull(s.stock_value), t('dash_stock_value'), 'var(--accent)'),
    UI.statCard('📦', Fmt.num(s.products), t('dash_products'), 'var(--primary)'),
    UI.statCard('🔄', Fmt.num(s.movements_today), t('dash_movements'), 'var(--info)'),
    UI.h('div', {
      onclick: () => { location.hash = '#/alerts'; },
      style: { cursor: 'pointer' },
    }, UI.statCard('⚠️', Fmt.num(alertsCount),
      `${t('dash_alerts')}${s.out_of_stock ? ` · ${s.out_of_stock} ${t('dash_out_of_stock')}` : ''}`,
      alertsCount > 0 ? 'var(--warning)' : 'var(--success)'))));

  // ---------- Graphe 7 jours ----------
  const chart = dash?.chart ?? { labels: [], in: [], out: [] };
  view.appendChild(UI.h('div', { class: 'card', style: { marginTop: '14px' } },
    UI.h('div', { class: 'card-title' }, '📈 ', t('dash_week')),
    chart.labels.length
      ? UI.lineChart({
          labels: chart.labels,
          height: 170,
          series: [
            { name: t('dash_in'), color: '#34D399', values: chart.in },
            { name: t('dash_out'), color: '#F87171', values: chart.out },
          ],
        })
      : UI.empty('📊', t('empty'))));

  // ---------- 3 listes ----------
  const typeMeta = (type) => ({
    in: ['⬇️', 'var(--success)'], out: ['⬆️', 'var(--danger)'],
    transfer_in: ['↙️', 'var(--info)'], transfer_out: ['↗️', 'var(--info)'],
  }[type] || ['🔄', 'var(--muted)']);

  const lowList = (dash?.low_stock_products ?? []).map((p) =>
    UI.h('div', { class: 'kv' },
      UI.h('span', {}, Fmt.esc(p.name)),
      UI.badge(p.quantity === 0 ? 'danger' : 'warning',
        p.quantity === 0 ? t('p_out') : `${p.quantity} ${t('a_left')}`)));

  const recentList = (dash?.recent_movements ?? []).map((m) => {
    const [ico, color] = typeMeta(m.type);
    return UI.h('div', { class: 'kv' },
      UI.h('span', { style: { maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        `${ico} `, Fmt.esc(m.product?.name ?? '—')),
      UI.h('span', { class: 'muted' },
        UI.h('b', { style: { color } }, `${m.type === 'in' || m.type === 'transfer_in' ? '+' : '−'}${m.quantity}`),
        ` · ${Fmt.dateTime(m.created_at)}`));
  });

  const topList = (dash?.top_products ?? []).map((m, i) =>
    UI.h('div', { class: 'kv' },
      UI.h('span', {}, `${['🥇', '🥈', '🥉', ' 4.', ' 5.'][i] ?? `${i + 1}.`} ${Fmt.esc(m.product?.name ?? '—')}`),
      UI.h('b', {}, Fmt.num(m.total_moved))));

  view.appendChild(UI.h('div', { class: 'grid grid-cols-3', style: { marginTop: '14px' } },
    UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '⚠️ ', t('dash_low')),
      lowList.length ? lowList : UI.empty('🎉', t('a_none'))),
    UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '🕒 ', t('dash_recent')),
      recentList.length ? recentList : UI.empty('🔄', t('m_none'))),
    UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title' }, '🏆 ', t('dash_top')),
      topList.length ? topList : UI.empty('📦', t('empty')))));
};
