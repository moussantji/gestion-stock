// ============================================================
// 🏷️ Catégories — groupement des produits. Suppression réservée
// admin/manager et seulement si la catégorie est vide.
// ============================================================
window.Screens = window.Screens || {};

Screens.categories = async (view) => {
  const t = I18n.t;
  const canManage = App.hasRole('admin', 'manager');
  let items = [];

  const zone = UI.h('div', { class: 'card', style: { padding: '6px 6px 2px', marginTop: '14px' } });

  async function load() {
    zone.innerHTML = '';
    zone.appendChild(UI.spinner());
    try {
      items = (await Api.get('/categories')).data ?? [];
      render();
    } catch (e) {
      zone.innerHTML = '';
      zone.appendChild(UI.empty('⚠️', e.message, e.network ? t('err_network') : null));
    }
  }

  function render() {
    zone.innerHTML = '';
    if (!items.length) {
      zone.appendChild(UI.empty('🏷️', t('cat_none'), t('cat_none_sub')));
      return;
    }
    zone.appendChild(UI.h('table', { class: 'tbl' },
      UI.h('thead', {}, UI.h('tr', {},
        ...[t('cat_name'), t('cat_desc'), '📦', t('actions')].map((x) => UI.h('th', {}, x)))),
      UI.h('tbody', {}, items.map((c) => UI.h('tr', {},
        UI.h('td', {}, UI.h('span', { class: 'strong' }, `🏷️ ${Fmt.esc(c.name)}`)),
        UI.h('td', { class: 'muted' }, Fmt.esc(c.description ?? '—')),
        UI.h('td', { class: 'num' }, `${Fmt.num(c.products_count ?? 0)} ${t('cat_products')}`),
        UI.h('td', {},
          UI.h('button', { class: 'btn btn-sm', onclick: () => openForm(c) }, '✏️'),
          canManage && (c.products_count ?? 0) === 0
            ? UI.h('button', {
              class: 'btn btn-sm btn-ghost',
              onclick: async () => {
                if (!(await UI.confirm(t('cat_delete_msg', { name: c.name }), { danger: true, okText: t('delete') }))) return;
                try { await Api.delete(`/categories/${c.id}`); load(); } catch (e) { UI.toast(e.message, 'var(--danger)'); }
              },
            }, '🗑')
            : null))))));
  }

  function openForm(c = null) {
    const name = UI.input({ value: c?.name ?? '', placeholder: t('cat_name_ph') });
    const desc = UI.input({ value: c?.description ?? '', placeholder: '…' });
    const errBox = UI.h('div', { style: { display: 'none' } });
    const btn = UI.h('button', { class: 'btn btn-primary', style: { flex: 1 } }, c ? t('save') : t('create'));

    btn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      if (!name.value.trim()) { errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = t('req_name'); return; }
      const payload = { name: name.value.trim(), description: desc.value.trim() || null };
      btn.disabled = true;
      try {
        if (c) await Api.put(`/categories/${c.id}`, payload);
        else await Api.post('/categories', payload);
        UI.toast(t('cat_saved'), 'var(--success)');
        close();
        load();
      } catch (e) {
        errBox.className = 'form-error'; errBox.style.display = ''; errBox.textContent = e.message;
        btn.disabled = false;
      }
    });

    const { close } = UI.modal({
      title: c ? t('cat_edit') : t('cat_new'), icon: c ? '✏️' : '🏷️',
      children: [
        errBox,
        UI.field(t('cat_name'), name),
        UI.field(t('cat_desc'), desc),
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
      UI.h('div', { class: 'page-title' }, t('cat_title')),
      UI.h('div', { class: 'page-sub' }, t('cat_sub'))),
    UI.h('div', { class: 'form-row no-print' },
      UI.h('div', { style: { flex: 1 } }),
      UI.h('button', { class: 'btn btn-primary', onclick: () => openForm() }, `＋ ${t('cat_new')}`)),
    zone);

  load();
};
