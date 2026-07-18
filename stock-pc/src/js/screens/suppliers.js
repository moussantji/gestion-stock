// ============================================================
// 🚛 Fournisseurs — carnet d'adresses fournisseurs (CRUD).
// Suppression réservée admin/manager et seulement si 0 produit.
// ============================================================
window.Screens = window.Screens || {};

Screens.suppliers = async (view) => {
  const t = I18n.t;
  const canManage = App.hasRole('admin', 'manager');
  let items = [];

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      items = (await Api.get('/suppliers')).data ?? [];
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('🚛', t('sup_none'), t('sup_none_sub')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('sup_name'), t('c_phone'), t('email'), t('c_address'), '📦', t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((s) => UI.h('tr', {},
        UI.h('td', {}, UI.h('div', { class: 'strong' }, Fmt.esc(s.name))),
        UI.h('td', {}, s.phone ? UI.h('a', { href: `tel:${(s.phone || '').replace(/\s/g, '')}`, class: 'strong', style: { color: 'var(--accent)' } }, `📞 ${Fmt.esc(s.phone)}`) : UI.h('span', { class: 'muted' }, '—')),
        UI.h('td', { class: 'muted' }, Fmt.esc(s.email ?? '—')),
        UI.h('td', { class: 'muted' }, Fmt.esc(s.address ?? '—')),
        UI.h('td', { class: 'num' }, Fmt.num(s.products_count ?? 0)),
        UI.h('td', {},
          UI.h('button', { class: 'btn btn-sm', onclick: () => openForm(s) }, '✏️'),
          canManage && (s.products_count ?? 0) === 0
            ? UI.h('button', {
              class: 'btn btn-sm btn-ghost',
              onclick: async () => {
                if (!(await UI.confirm(t('sup_delete_msg', { name: s.name }), { danger: true, okText: t('delete') }))) return;
                try { await Api.delete(`/suppliers/${s.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '🗑')
            : null))))));
  }

  function openForm(s = null) {
    const name = UI.input({ value: s?.name ?? '', placeholder: t('sup_name_ph') });
    const phone = UI.input({ value: s?.phone ?? '', placeholder: '+223 70 00 00 00' });
    const email = UI.input({ type: 'email', value: s?.email ?? '', placeholder: t('p_optional') });
    const address = UI.input({ value: s?.address ?? '', placeholder: t('p_optional') });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, s ? t('save') : t('create'));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!name.value.trim()) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('req_name'); return; }
      const payload = {
        name: name.value.trim(),
        email: email.value.trim() || null,
        phone: phone.value.trim() || null,
        address: address.value.trim() || null,
      };
      btn.disabled = true;
      try {
        if (s) await Api.put(`/suppliers/${s.id}`, payload);
        else await Api.post('/suppliers', payload);
        UI.toast(t('sup_saved'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: s ? t('sup_edit') : t('sup_new'), icon: s ? '✏️' : '🚛',
      children: [
        errBox,
        UI.field(t('sup_name'), name),
        UI.h('div', { class: 'form-row' }, UI.field(t('c_phone'), phone), UI.field(t('email'), email)),
        UI.field(t('c_address'), address),
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
      UI.h('div', { class: 'page-title' }, t('sup_title')),
      UI.h('div', { class: 'page-sub' }, t('sup_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: () => openForm() }, `＋ ${t('sup_new')}`)),
    zone);

  load();
};
