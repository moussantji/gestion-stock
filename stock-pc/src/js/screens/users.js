// ============================================================
// 🧑‍🤝‍🧑 Utilisateurs — comptes staff (admin / gestionnaire /
// employé) + boutique de rattachement. Réservé admin.
// ============================================================
window.Screens = window.Screens || {};

Screens.users = async (view) => {
  const t = I18n.t;
  const me = Api.user();
  let items = [];
  let shops = [];

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  const ROLE_TONE = { admin: 'danger', manager: 'warning', employee: 'info' };

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      const [uRes, sRes] = await Promise.all([
        Api.get('/users'),
        Api.get('/shops').catch(() => ({ data: [] })),
      ]);
      items = uRes.data ?? [];
      shops = (sRes.data ?? []).filter((s) => s.is_active !== false);
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('👥', t('usr_none')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('usr_name'), t('email'), t('usr_role'), '🏬', t('usr_movements'), t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((u) => UI.h('tr', {},
        UI.h('td', {},
          UI.h('div', { class: 'form-row', style: { alignItems: 'center', gap: '8px' } },
            UI.h('div', { class: 'avatar' }, (u.name || '?').charAt(0).toUpperCase()),
            UI.h('span', { class: 'strong' }, `${Fmt.esc(u.name)}${u.id === me?.id ? ` ${t('usr_me')}` : ''}`))),
        UI.h('td', { class: 'muted' }, Fmt.esc(u.email)),
        UI.h('td', {}, UI.badge(ROLE_TONE[u.role] ?? 'muted', t(`role_${u.role}`))),
        UI.h('td', { class: 'muted' }, u.shop?.name ? `🏬 ${Fmt.esc(u.shop.name)}` : `🏠 ${t('g_hq')}`),
        UI.h('td', { class: 'num muted' }, Fmt.num(u.movements_count ?? 0)),
        UI.h('td', {}, u.id !== me?.id
          ? UI.h('button', {
            class: 'btn btn-sm btn-ghost',
            onclick: async () => {
              if (!(await UI.confirm(t('usr_delete_msg', { name: u.name }), { danger: true, okText: t('delete') }))) return;
              try { await Api.delete(`/users/${u.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
            },
          }, '🗑')
          : null))))));
  }

  function openCreate() {
    const name = UI.input({ placeholder: t('usr_name_ph') });
    const email = UI.input({ type: 'email', placeholder: 'utilisateur@stock.com' });
    const password = UI.input({ type: 'password', placeholder: '••••••••' });
    const confirm = UI.input({ type: 'password', placeholder: '••••••••' });
    const role = UI.select({}, [
      { value: 'employee', label: `👷 ${t('role_employee')}` },
      { value: 'manager', label: `🧭 ${t('role_manager')}` },
      { value: 'admin', label: `👑 ${t('role_admin')}` },
    ]);
    const shop = UI.select({}, [
      { value: '', label: `🏠 ${t('g_hq')}` },
      ...shops.map((s) => ({ value: s.id, label: `🏬 ${s.name}` })),
    ]);
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, t('usr_create'));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!name.value.trim() || !email.value.trim() || !password.value) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('usr_fill'); return;
      }
      if (password.value !== confirm.value) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('usr_mismatch'); return;
      }
      btn.disabled = true;
      try {
        await Api.post('/users', {
          name: name.value.trim(),
          email: email.value.trim().toLowerCase(),
          password: password.value,
          password_confirmation: confirm.value,
          role: role.value,
          shop_id: shop.value === '' ? null : Number(shop.value),
        });
        UI.toast(t('usr_saved'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: `🧑‍🤝‍🧑 ${t('usr_new')}`,
      children: [
        errBox,
        UI.field(t('usr_name'), name),
        UI.field(t('email'), email),
        UI.h('div', { class: 'form-row' }, UI.field(t('usr_pwd'), password), UI.field(t('usr_confirm'), confirm)),
        UI.h('div', { class: 'form-row' }, UI.field(t('usr_role'), role), UI.field(t('usr_shop'), shop)),
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
      UI.h('div', { class: 'page-title' }, t('usr_title')),
      UI.h('div', { class: 'page-sub' }, t('usr_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: openCreate }, `＋ ${t('usr_new')}`)),
    zone);

  load();
};
