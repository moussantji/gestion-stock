// ============================================================
// 💵 Caisse — solde, ops du jour, courbe 30 j, Z de caisse
// Réservé admin/manager (garde déjà dans App/ROUTES).
// ============================================================
window.Screens = window.Screens || {};

Screens.cash = async (view) => {
  const t = I18n.t;
  const zone = UI.h('div', {});
  view.innerHTML = '';

  async function load() {
    zone.innerHTML = ''; zone.appendChild(UI.spinner());
    const [summary, chart, ops, closings] = await Promise.all([
      Api.get('/cash-ops/summary'),
      Api.get('/cash-ops/chart', { days: 30 }),
      Api.get('/cash-ops', { per_page: 15 }),
      Api.get('/cash-ops/closings').catch(() => ({ data: [] })), // 🔒 v1.3 : historique des Z
    ]);
    zone.innerHTML = '';

    // ---------- Cartes ----------
    zone.appendChild(UI.h('div', { class: 'grid grid-cols-4' },
      UI.statCard('💰', Fmt.moneyFull(summary.balance), t('k_balance'),
        summary.balance >= 0 ? 'var(--success)' : 'var(--danger)'),
      UI.statCard('⬇️', Fmt.money(summary.today_in), t('k_in_today'), 'var(--success)'),
      UI.statCard('⬆️', Fmt.money(summary.today_out), t('k_out_today'), 'var(--danger)'),
      UI.statCard('🧾', Fmt.money(summary.sales_collected_today ?? summary.sales_today ?? 0), t('k_sales_today'), 'var(--info)'))); // 🐞 v1.8 : vrai champ API

    // ---------- Courbe 30 j ----------
    const points = chart?.data ?? chart ?? [];
    const labels = points.map((p) => (p.day ?? '').slice(5));
    const values = points.map((p) => Number(p.balance ?? 0));
    zone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '14px' } },
      UI.h('div', { class: 'card-title' }, '📊 ', t('k_chart')),
      values.length
        ? UI.lineChart({ labels, height: 160, series: [{ name: t('k_balance'), color: '#7C5CFF', values }] })
        : UI.empty('📊', t('empty'))));

    // ---------- Table des opérations ----------
    const rows = ops.data ?? [];
    zone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '14px', padding: '14px 14px 6px' } },
      UI.h('div', { class: 'card-title' }, `🧾 ${t('k_ops')}`),
      rows.length
        ? UI.h('table', { class: 'tbl' },
            UI.h('thead', {}, UI.h('tr', {},
              ...['', t('k_category'), t('k_amount'), t('k_reason'), t('m_user'), t('m_date')].map((x) => UI.h('th', {}, x)))),
            UI.h('tbody', {}, rows.map((o) => UI.h('tr', {},
              UI.h('td', {}, UI.badge(o.type === 'in' ? 'success' : 'danger', o.type === 'in' ? '⬇️' : '⬆️')),
              UI.h('td', { class: 'muted' }, Fmt.esc(o.category ?? '—')),
              UI.h('td', { class: 'num strong', style: { color: o.type === 'in' ? 'var(--success)' : 'var(--danger)' } },
                `${o.type === 'in' ? '+' : '−'}${Fmt.money(o.amount)}`),
              UI.h('td', { class: 'muted', style: { maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                Fmt.esc(o.reason ?? '—')),
              UI.h('td', { class: 'muted' }, Fmt.esc(o.user?.name ?? '—')),
              UI.h('td', { class: 'muted' }, Fmt.dateTime(o.created_at))))))
        : UI.empty('💵', t('k_none'))));

    // ---------- 🔒 Historique des Z (v1.3) ----------
    const zs = closings?.data ?? [];
    const placeName = Api.pickedShop?.()?.name ?? Api.shop()?.my_shop?.name ?? null;
    zone.appendChild(UI.h('div', { class: 'card', style: { marginTop: '14px', padding: '14px 14px 6px' } },
      UI.h('div', { class: 'card-title' }, `🔒 ${t('kz_history')}`),
      zs.length
        ? UI.h('table', { class: 'tbl' },
          UI.h('thead', {}, UI.h('tr', {},
            ...[t('kz_date'), t('k_sales_today'), t('k_in_today'), t('k_out_today'), t('k_balance'), t('r_by'), t('actions')]
              .map((x) => UI.h('th', {}, x)))),
          UI.h('tbody', {}, zs.map((z) => UI.h('tr', {},
            UI.h('td', { class: 'strong' }, Fmt.date(z.closing_date)),
            UI.h('td', { class: 'num', style: { color: 'var(--info)' } }, Fmt.money(z.sales_collected ?? 0)),
            UI.h('td', { class: 'num', style: { color: 'var(--success)' } }, `+${Fmt.money(z.total_in ?? 0)}`),
            UI.h('td', { class: 'num', style: { color: 'var(--danger)' } }, `−${Fmt.money(z.total_out ?? 0)}`),
            UI.h('td', { class: 'num strong' }, Fmt.money(z.balance ?? 0)),
            UI.h('td', { class: 'muted' }, Fmt.esc(z.user?.name ?? '—')),
            UI.h('td', {},
              window.Thermal?.isConfigured() ? UI.h('button', {
                class: 'btn btn-sm btn-success', title: t('kz_t'),
                onclick: () => Thermal.printZ(z, placeName)
                  .then(() => UI.toast(t('kz_printed'), 'var(--success)'))
                  .catch((e) => UI.toast(e.message, 'var(--danger)')),
              }, '🖨') : null,
              UI.h('button', {
                class: 'btn btn-sm', title: t('k_z_pdf'),
                onclick: () => Api.download(`/cash-closings/${z.id}/pdf`, `Z-${z.closing_date ?? z.id}.pdf`)
                  .catch((e) => UI.toast(e.message, 'var(--danger)')),
              }, '📄'))))))
        : UI.empty('🔒', t('kz_none'))));
  }

  /** Modal d'actions sur un Z : 🖨 thermique / 📄 PDF */
  function openZActions(z) {
    const placeName = Api.pickedShop?.()?.name ?? Api.shop()?.my_shop?.name ?? null;
    const { close } = UI.modal({
      title: t('kz_title', { date: Fmt.date(z.closing_date) }), icon: '🔒',
      children: [
        UI.h('div', { class: 'card', style: { padding: '12px 14px' } },
          UI.kv(t('k_sales_today'), Fmt.moneyFull(z.sales_collected ?? 0)),
          UI.kv(t('k_in_today'), `+ ${Fmt.money(z.total_in ?? 0)}`),
          UI.kv(t('k_out_today'), `− ${Fmt.money(z.total_out ?? 0)}`),
          UI.kv(t('k_balance'), Fmt.moneyFull(z.balance ?? 0))),
        UI.h('div', { class: 'grid grid-cols-2', style: { marginTop: '12px', gap: '9px' } },
          window.Thermal?.isConfigured() ? UI.h('button', {
            class: 'btn btn-success',
            onclick: () => Thermal.printZ(z, placeName)
              .then(() => { UI.toast(t('kz_printed'), 'var(--success)'); close(); })
              .catch((e) => UI.toast(e.message, 'var(--danger)')),
          }, `🖨 ${t('kz_t')}`) : null,
          UI.h('button', {
            class: 'btn',
            onclick: () => Api.download(`/cash-closings/${z.id}/pdf`, `Z-${z.closing_date ?? z.id}.pdf`)
              .then(() => close())
              .catch((e) => UI.toast(e.message, 'var(--danger)')),
          }, `📄 ${t('k_z_pdf')}`),
          UI.h('button', { class: 'btn btn-primary', onclick: () => close() }, 'OK')),
      ],
    });
  }

  // ---------- Nouvelle opération ----------
  function openForm(type) {
    const cats = [t('k_cat_salary'), t('k_cat_rent'), t('k_cat_transport'), t('k_cat_other')];
    const amount = UI.input({ type: 'number', min: 1 });
    const reason = UI.input({});
    const catChips = UI.h('div', { class: 'chips', style: { marginBottom: '8px' } });
    let category = '';
    cats.forEach((c) => {
      catChips.appendChild(UI.h('button', {
        class: 'chip',
        onclick: (e) => {
          category = c;
          catChips.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
          e.currentTarget.classList.add('active');
        },
      }, c));
    });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: `btn ${type === 'in' ? 'btn-success' : 'btn-danger'}`, style: { flex: 1 } }, t('save'));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!(Number(amount.value) > 0) || !reason.value.trim()) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = `${t('k_amount')} + ${t('k_reason')}…`;
        return;
      }
      btn.disabled = true;
      try {
        await Api.post('/cash-ops', {
          type, amount: Number(amount.value), reason: reason.value.trim(),
          category: category || undefined,
        });
        UI.toast(t('k_saved'), 'var(--success)');
        close(); load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: type === 'in' ? t('k_new_in') : t('k_new_out'),
      icon: type === 'in' ? '⬇️' : '⬆️',
      children: [
        errBox, catChips,
        UI.field(t('k_amount'), amount),
        UI.field(t('k_reason'), reason),
        UI.h('div', { class: 'form-row', style: { marginTop: '6px' } },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')), btn),
      ],
    });
  }

  // ---------- Z de caisse ----------
  async function closeDay() {
    if (!(await UI.confirm(t('k_close_msg'), { okText: t('yes') }))) return;
    try {
      await Api.post('/cash-ops/close', {});
      UI.toast(t('k_closed'), 'var(--success)', 4200);
      const closings = await Api.get('/cash-ops/closings').catch(() => ({ data: [] }));
      const last = (closings?.data ?? [])[0];
      load(); // refresh historique + soldes
      if (last?.id) {
        const placeName = Api.pickedShop?.()?.name ?? Api.shop()?.my_shop?.name ?? null;
        window.Auto?.afterClose(); // 🤖 v1.4 : rapport patron PDF auto (fichier du jour)
        window.Auto?.afterCloseZ(last, placeName); // 🖨 v1.5 : Z thermique auto
        window.Auto?.afterClosePack(last, placeName); // 📦 v1.9 : pack jour PDF auto
        openZActions(last); // 🖨 v1.3 : propose thermique + PDF (réimpression manuelle)
      }
    } catch (e) {
      UI.toast(e.message, 'var(--danger)', 4500);
    }
  }

  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('k_title')),
      UI.h('div', { class: 'page-sub' }, t('k_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('button', { class: 'btn btn-success', onclick: () => openForm('in') }, t('k_new_in')),
      UI.h('button', { class: 'btn btn-danger', onclick: () => openForm('out') }, t('k_new_out')),
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn', onclick: closeDay }, t('k_close'))),
    zone);
  load();
};
