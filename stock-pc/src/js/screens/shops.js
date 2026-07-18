// ============================================================
// 🏬 Boutiques — points de vente (multi-boutiques v12+).
// Chaque boutique = un emplacement de stock (sceau v13+).
// Réservé admin (lecture pour tout le staff via /shops).
// ============================================================
window.Screens = window.Screens || {};

Screens.shops = async (view) => {
  const t = I18n.t;
  let items = [];

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      items = (await Api.get('/shops')).data ?? [];
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('🏬', t('sh_none'), t('sh_none_sub')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('sh_name'), t('c_phone'), t('c_address'), t('r_status'), t('sh_users'), t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((s) => UI.h('tr', {},
        UI.h('td', {}, UI.h('span', { class: 'strong' }, `🏬 ${Fmt.esc(s.name)}`)),
        UI.h('td', { class: 'muted' }, Fmt.esc(s.phone ?? '—')),
        UI.h('td', { class: 'muted' }, Fmt.esc(s.address ?? '—')),
        UI.h('td', {}, s.is_active === false
          ? UI.badge('muted', `⏸ ${t('sh_inactive')}`)
          : UI.badge('success', `✓ ${t('sh_active')}`)),
        UI.h('td', { class: 'num muted' }, `${Fmt.num(s.users_count ?? 0)} ${t('sh_users')}`),
        UI.h('td', {},
          UI.h('button', { class: 'btn btn-sm', onclick: () => openForm(s) }, '✏️'),
          UI.h('button', {
            class: 'btn btn-sm btn-ghost',
            onclick: async () => {
              if (!(await UI.confirm(t('sh_delete_msg', { name: s.name }), { danger: true, okText: t('delete') }))) return;
              try { await Api.delete(`/shops/${s.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
            },
          }, '🗑')))))));
  }

  function openForm(s = null) {
    const name = UI.input({ value: s?.name ?? '', placeholder: t('sh_name_ph') });
    const phone = UI.input({ value: s?.phone ?? '', placeholder: '+223 70 00 00 00' });
    const address = UI.input({ value: s?.address ?? '', placeholder: t('p_optional') });
    const active = UI.input({ type: 'checkbox', checked: s ? s.is_active !== false : true });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, s ? t('save') : t('create'));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!name.value.trim()) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('sh_name_required'); return; }
      const payload = {
        name: name.value.trim(),
        phone: phone.value.trim() || null,
        address: address.value.trim() || null,
        ...(s ? { is_active: active.checked } : {}),
      };
      btn.disabled = true;
      try {
        if (s) await Api.put(`/shops/${s.id}`, payload);
        else await Api.post('/shops', payload);
        UI.toast(t('sh_saved'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: s ? t('sh_edit') : t('sh_new'), icon: s ? '✏️' : '🏬',
      children: [
        errBox,
        UI.field(t('sh_name'), name),
        UI.h('div', { class: 'form-row' }, UI.field(t('c_phone'), phone), UI.field(t('c_address'), address)),
        s ? UI.h('label', { class: 'muted', style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          active, ` ${t('sh_active')}`) : null,
        UI.h('div', { class: 'form-row' },
          UI.h('button', { class: 'btn', onclick: () => close() }, t('cancel')),
          btn),
      ],
    });
    name.focus();
  }

  view.innerHTML = '';
  view.append(
    UI.h('div', { class: 'page-head no-print' },
      UI.h('div', { class: 'page-title' }, t('sh_title')),
      UI.h('div', { class: 'page-sub' }, t('sh_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: () => openForm() }, `＋ ${t('sh_new')}`)),
    zone);

  load();
};
