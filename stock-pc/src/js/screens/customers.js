// ============================================================
// 👥 Clients — CRM : tiers Détail/Gros, 🎁 fidélité, 💳 crédit
// ============================================================
window.Screens = window.Screens || {};

Screens.customers = async (view) => {
  const t = I18n.t;
  let items = [];
  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  // 💳 v2.13 : badge échéance planifiée (additif — vieux serveur : clé absente → null)
  function planBadge(c) {
    if (!c || c.next_payment_date == null || Number(c.credit_balance ?? 0) <= 0) return null;
    const d = Number(c.days_until ?? 0);
    if (d < 0) return UI.badge('danger', `📅 ${t('pl_due_late', { n: -d })}`);
    if (d === 0) return UI.badge('warning', `📅 ${t('pl_due_today')}`);
    if (d === 1) return UI.badge('warning', `📅 ${t('pl_due_tomorrow')}`);
    return UI.badge('muted', `📅 ${t('pl_due_in', { n: d })}`);
  }

  async function load() {
    zone.innerHTML = ''; zone.appendChild(UI.spinner());
    const res = await Api.get('/customers');
    items = res.data ?? [];
    zone.innerHTML = '';

    if (!items.length) { zone.appendChild(UI.empty('👥', t('c_none'), t('c_none_sub'))); return; }

    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('c_new'), t('c_phone'), t('c_tier'), '🎁', t('c_spent'), t('c_credit')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((c) => UI.h('tr', {
        style: { cursor: 'pointer' },
        onclick: () => openDetail(c.id),
      },
        UI.h('td', { class: 'strong' }, Fmt.esc(c.name)),
        UI.h('td', { class: 'muted' }, Fmt.esc(c.phone ?? '—')),
        UI.h('td', {}, c.price_tier === 'wholesale'
          ? UI.badge('primary', `🏷 ${t('c_tier_wholesale')}`)
          : UI.badge('muted', t('c_tier_retail'))),
        UI.h('td', { class: 'num' }, (c.loyalty_points ?? 0) > 0
          ? UI.badge('warning', `${c.loyalty_points} ${t('c_points')}`) : '—'),
        UI.h('td', { class: 'num muted' }, Fmt.money(c.spent_total)),
        UI.h('td', { class: 'num strong' },
          UI.h('span', { style: { color: c.credit_balance > 0 ? 'var(--danger)' : 'var(--success)' } },
            Fmt.money(c.credit_balance)),
          planBadge(c) ? [' ', planBadge(c)] : null))))));
  }

  async function openDetail(id) {
    const res = await Api.get(`/customers/${id}`);
    const c = res.data ?? {};
    const st = res.stats ?? {};
    const lc = res.loyalty_config ?? { earn_per: 1000, point_value: 10 };

    // ---------- 💳 v2.13 : échéancier planifié (clé additive — vieux serveur : carte masquée) ----------
    const planSupported = res.payment_plan !== undefined && res.payment_plan !== null;
    let plan = planSupported ? res.payment_plan : null;
    let planDirty = false;
    const planZone = UI.h('div', { class: 'card', style: { marginTop: '12px', padding: '10px 12px' } });
    const newDate = UI.input({ type: 'date', style: { maxWidth: '160px' } });

    async function savePlan(dates) {
      try {
        const r = await Api.put(`/customers/${id}`, { payment_plan: dates });
        plan = r.payment_plan ?? plan;
        planDirty = true;
        renderPlan();
        UI.toast(t('pl_saved'), 'var(--success)');
      } catch (e) { UI.toast(e.message, 'var(--danger)'); }
    }

    function planChipColor(d) {
      const today = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ → comparaison lexicale
      if (d < today) return 'badge-danger';
      return 'badge-muted';
    }

    function renderPlan() {
      planZone.innerHTML = '';
      planZone.appendChild(UI.h('div', { class: 'card-title' }, `💳 ${t('pl_title')}`));
      planZone.appendChild(UI.h('div', { class: 'muted', style: { fontSize: '11px', margin: '2px 0 8px' } }, t('pl_hint')));
      const dates = plan?.dates ?? [];
      if (!dates.length) {
        planZone.appendChild(UI.h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, t('pl_none')));
      } else {
        planZone.appendChild(UI.h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' } },
          dates.map((d) => UI.h('span', { class: `badge ${planChipColor(d)}`, style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
            `📅 ${String(d).split('-').reverse().join('/')}`, // JJ/MM/AAAA déterministe (pas de décalage fuseau)
            UI.h('button', {
              class: 'btn btn-sm', style: { padding: '0 4px', fontSize: '10px', lineHeight: 1 },
              title: t('delete'), onclick: () => savePlan(dates.filter((x) => x !== d)),
            }, '✕')))));
      }
      planZone.appendChild(UI.h('div', { class: 'form-row', style: { alignItems: 'center', gap: '8px' } },
        newDate,
        UI.h('button', {
          class: 'btn btn-sm', onclick: () => {
            const d = String(newDate.value ?? '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
            if (!(plan?.dates ?? []).includes(d)) savePlan([...(plan?.dates ?? []), d].sort());
          },
        }, `➕ ${t('pl_add')}`)));
    }
    if (planSupported) renderPlan();

    const loyaltyRows = (res.loyalty_history ?? []).map((l) =>
      UI.h('div', { class: 'kv' },
        UI.h('span', { class: 'muted', style: { fontSize: '12px' } },
          `${l.type === 'redeem' ? '🎁➖' : '🎁➕'} ${Fmt.dateTime(l.created_at)}`),
        UI.h('b', { style: { color: l.points >= 0 ? 'var(--success)' : 'var(--warning)' } },
          `${l.points >= 0 ? '+' : ''}${l.points}`)));

    const creditRows = (res.credits ?? []).map((r) =>
      UI.h('div', { class: 'kv' },
        UI.h('span', { class: 'mono' }, `#${r.number ?? r.id}`),
        UI.h('span', {}, `${Fmt.money(r.remaining ?? 0)} `,
          UI.badge('warning', `💳 ${Fmt.date(r.created_at)}`))));

    UI.modal({
      title: c.name ?? '', icon: '👤', width: 'lg',
      children: [
        UI.h('div', { class: 'grid grid-cols-4', style: { marginBottom: '12px' } },
          UI.statCard('🛍', Fmt.money(st.spent_total), t('c_spent'), 'var(--primary)'),
          UI.statCard('💵', Fmt.money(st.paid_total), t('c_paid'), 'var(--success)'),
          UI.statCard('💳', Fmt.money(st.credit_balance), t('c_credit'),
            st.credit_balance > 0 ? 'var(--danger)' : 'var(--success)'),
          UI.statCard('🎁', `${c.loyalty_points ?? 0}`, `${t('c_points')} · 1pt/${Fmt.num(lc.earn_per)}F`, 'var(--warning)')),
        c.phone ? UI.kv(t('c_phone'), Fmt.esc(c.phone)) : null,
        // 🔔 v2.11 : relance crédit pré-remplie (reste à payer) — 1 tap → WhatsApp
        c.phone && Number(st.credit_balance ?? 0) > 0
          ? UI.h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' } },
              UI.h('a', {
                class: 'btn btn-sm btn-primary', target: '_blank', rel: 'noopener',
                href: window.Promo.waLink(c.phone, t('cr_msg', {
                  name: c.name ?? '', amount: Fmt.money(st.credit_balance),
                  shop: Api.shop()?.name ?? '',
                })),
              }, `🔔 ${t('cr_remind')}`),
              UI.h('span', { class: 'muted', style: { fontSize: '11px' } }, t('cr_hint')))
          : null,
        UI.kv(t('c_tier'), c.price_tier === 'wholesale' ? `🏷 ${t('c_tier_wholesale')}` : t('c_tier_retail')),
        UI.kv('🧾', `${st.receipts_count ?? 0} ${t('c_receipts')}`),
        creditRows.length ? UI.h('div', { class: 'card-title', style: { marginTop: '12px' } }, '💳 ' + t('c_credit')) : null,
        creditRows,
        planSupported ? planZone : null, // 💳 v2.13 : échéancier (masqué vieux serveur)
        UI.h('div', { class: 'card-title', style: { marginTop: '12px' } }, `🎁 ${t('c_since')}`),
        loyaltyRows.length ? loyaltyRows : UI.h('div', { class: 'muted' }, t('empty')),
      ],
      onClose: planDirty ? () => load() : undefined, // 💳 v2.13 : badges liste à jour si dates touchées
    });
  }

  function openForm() {
    const name = UI.input({});
    const phone = UI.input({ placeholder: '+223 …' });
    const address = UI.input({ placeholder: t('p_optional') });
    const tier = UI.select({}, [
      { value: 'retail', label: t('c_tier_retail') },
      { value: 'wholesale', label: `🏷 ${t('c_tier_wholesale')}` },
    ]);
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('create'));
    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!name.value.trim()) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('p_name') + '…'; return;
      }
      btn.disabled = true;
      try {
        await Api.post('/customers', {
          name: name.value.trim(),
          phone: phone.value.trim() || undefined,
          address: address.value.trim() || undefined,
          price_tier: tier.value,
        });
        UI.toast(t('c_saved'), 'var(--success)');
        close(); load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: t('c_new'), icon: '👤',
      children: [
        errBox,
        UI.field(t('p_name'), name),
        UI.field(t('c_phone'), phone),
        UI.field(t('c_address'), address),
        UI.field(t('c_tier'), tier),
        UI.h('div', { class: 'form-row', style: { marginTop: '6px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')), btn),
      ],
    });
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('c_title')),
      UI.h('div', { class: 'page-sub' }, t('c_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: openForm }, `＋ ${t('c_new')}`)),
    zone);
  load();
};
