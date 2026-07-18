// ============================================================
// 🏬 Choix du point de vente du poste (v1.3)
// Affiché après le login (ou au démarrage) pour les
// admin/gestionnaires NON rattachés à une boutique :
// 🏠 Siège ou une boutique active → header X-Shop-Id partout.
// ============================================================
window.Screens = window.Screens || {};

Screens.shoppick = async (root, onDone) => {
  const t = I18n.t;
  root.innerHTML = '';

  const card = UI.h('div', { class: 'login-card' }, UI.spinner());
  root.appendChild(UI.h('div', { class: 'login-wrap' }, card));

  let shops = [];
  try { shops = (await Api.get('/shops'))?.data ?? []; } catch { shops = []; }
  const actives = shops.filter((s) => s.is_active !== false);

  // Aucune boutique secondaire → siège d'office, l'écran ne bloque rien
  if (!actives.length) {
    Api.setPickedShop({ shop_id: 0, name: null }, false);
    onDone?.();
    return;
  }

  let selected = null; // null = siège
  const remember = UI.input({ type: 'checkbox', checked: true });
  const errBox = UI.h('div', { style: { display: 'none' } });
  const listZone = UI.h('div', { style: { margin: '12px 0' } });

  function optionBtn(shop) {
    const isActive = () => (shop ? selected?.id === shop.id : selected === null);
    const btn = UI.h('button', {
      class: 'btn',
      style: {
        width: '100%', justifyContent: 'flex-start', gap: '10px',
        marginBottom: '8px', padding: '12px 14px', textAlign: 'left',
        borderColor: isActive() ? 'var(--primary)' : 'var(--border)',
        background: isActive() ? 'rgba(124,92,255,.14)' : undefined,
      },
      onclick: () => { selected = shop; renderList(); },
    },
      UI.h('span', { style: { fontSize: '20px' } }, shop ? '🏬' : '🏠'),
      UI.h('span', { style: { flex: 1 } },
        UI.h('div', { class: 'strong' }, shop ? Fmt.esc(shop.name) : t('sp_hq')),
        shop?.address ? UI.h('div', { class: 'muted', style: { fontSize: '11.5px' } }, Fmt.esc(shop.address)) : null),
      isActive() ? UI.h('span', { style: { color: 'var(--primary)', fontWeight: 800 } }, '✓') : null);
    return btn;
  }

  function renderList() {
    listZone.innerHTML = '';
    listZone.appendChild(optionBtn(null)); // 🏠 siège
    actives.forEach((s) => listZone.appendChild(optionBtn(s)));
  }

  const btn = UI.h('button', { class: 'btn btn-primary btn-lg' }, `✓ ${t('sp_continue')}`);
  btn.addEventListener('click', () => {
    const persisted = remember.checked;
    Api.setPickedShop(
      { shop_id: selected ? selected.id : 0, name: selected?.name ?? null },
      persisted);
    if (!persisted) localStorage.removeItem('sfpc.shop_pick'); // session seule
    UI.toast(
      selected ? t('sp_saved_shop', { name: selected.name }) : t('sp_saved_hq'),
      'var(--success)');
    onDone?.();
  });

  card.innerHTML = '';
  card.append(
    UI.h('div', { class: 'login-logo' }, '🏬'),
    UI.h('div', { class: 'login-title' }, t('sp_title')),
    UI.h('div', { class: 'login-sub' }, t('sp_sub')),
    errBox,
    listZone,
    UI.h('label', {
      style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, margin: '4px 0 12px', cursor: 'pointer' },
    }, remember, ` ${t('sp_remember')}`),
    btn,
    UI.h('div', { class: 'login-foot' }, t('sp_note')));

  renderList();
};
