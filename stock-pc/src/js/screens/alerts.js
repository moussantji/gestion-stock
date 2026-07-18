// ============================================================
// 🔔 Alertes — 3 onglets : ⚠️ Global · 📍 Emplacement · 📈 Prévisions
// (identique à l'app mobile v14)
// ============================================================
window.Screens = window.Screens || {};

Screens.alerts = async (view) => {
  const t = I18n.t;
  let tab = 'global';
  const chips = UI.h('div', { class: 'chips' });
  const zone = UI.h('div', { class: 'grid grid-cols-2', style: { marginTop: '14px' } });
  const caption = UI.h('div', { class: 'muted', style: { marginTop: '12px', fontSize: '12.5px' } });

  const TABS = [
    { key: 'global', label: t('a_tab_global') },
    { key: 'place', label: t('a_tab_place') },
    { key: 'forecast', label: t('a_tab_forecast') },
  ];
  TABS.forEach((tb) => {
    chips.appendChild(UI.h('button', {
      class: `chip ${tab === tb.key ? 'active' : ''}`,
      onclick: (e) => {
        tab = tb.key;
        chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        load();
      },
    }, tb.label));
  });

  function alertCard(item, locationName) {
    const isOut = item.quantity === 0;
    const ratio = item.alert_threshold > 0 ? Math.min(1, item.quantity / item.alert_threshold) : 1;
    return UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title', style: { fontSize: '13.5px' } }, Fmt.esc(item.name)),
      UI.h('div', { class: 'muted', style: { fontSize: '12px' } },
        `${Fmt.esc(item.sku)}${item.category?.name ? ` · ${Fmt.esc(item.category.name)}` : ''}`),
      UI.gauge(ratio, isOut ? 'var(--danger)' : 'var(--warning)'),
      UI.h('div', { style: { marginTop: '8px', fontSize: '12.5px', fontWeight: 700, color: isOut ? 'var(--danger)' : 'var(--warning)' } },
        isOut ? `🚫 ${t('p_out')} — ${t('a_threshold')} : ${item.alert_threshold}`
          : `${item.quantity} ${t('a_left')} — ${t('a_threshold')} : ${item.alert_threshold}`),
      item.global_quantity !== undefined && item.global_quantity !== item.quantity
        ? UI.h('div', { class: 'muted', style: { fontSize: '11px', marginTop: '3px' } },
            `🌍 global : ${item.global_quantity}`)
        : null);
  }

  function forecastCard(item, lead) {
    const urgent = item.days_left <= lead;
    const soon = !urgent && item.days_left <= lead * 2;
    const tone = urgent ? 'danger' : soon ? 'warning' : 'success';
    return UI.h('div', { class: 'card' },
      UI.h('div', { class: 'card-title', style: { fontSize: '13.5px' } }, Fmt.esc(item.name)),
      UI.h('div', { class: 'muted', style: { fontSize: '12px' } },
        `${Fmt.esc(item.sku)} · ${t('a_fc_velocity', { v: item.velocity })}`),
      UI.h('div', { style: { display: 'flex', gap: '8px', marginTop: '9px', flexWrap: 'wrap' } },
        UI.badge(tone, `⏳ ${t('a_fc_days', { n: item.days_left })}`),
        item.suggested_order > 0
          ? UI.badge('info', `📦 ${t('a_fc_suggest', { n: item.suggested_order })}`)
          : UI.badge('success', `✓ ${item.quantity}`)));
  }

  async function load() {
    zone.innerHTML = ''; caption.textContent = '';
    zone.appendChild(UI.spinner());
    try {
      if (tab === 'forecast') {
        const res = await Api.get('/products/restock-forecast');
        zone.innerHTML = '';
        const rows = res.data ?? [];
        caption.textContent = t('a_fc_hint', { days: res.window_days ?? 30, lead: res.lead_days ?? 14 });
        if (!rows.length) { zone.appendChild(UI.empty('📈', t('a_fc_none'))); return; }
        rows.forEach((r) => zone.appendChild(forecastCard(r, res.lead_days ?? 14)));
      } else if (tab === 'place') {
        const res = await Api.get('/stock-alerts');
        zone.innerHTML = '';
        const rows = res.data ?? [];
        caption.textContent = `📍 ${t('a_place', { place: res.location?.name ?? '—' })} — ${res.count ?? rows.length}`;
        if (!rows.length) { zone.appendChild(UI.empty('📍', t('a_none_place'))); return; }
        rows.forEach((r) => zone.appendChild(alertCard(r, res.location?.name)));
      } else {
        const res = await Api.get('/products/low-stock');
        zone.innerHTML = '';
        const rows = res.data ?? [];
        if (!rows.length) { zone.appendChild(UI.empty('🎉', t('a_none'))); return; }
        rows.forEach((r) => zone.appendChild(alertCard(r)));
      }
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message));
    }
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('a_title')),
      UI.h('div', { class: 'page-sub' }, t('a_sub'))),
    chips, caption, zone);
  load();
};
