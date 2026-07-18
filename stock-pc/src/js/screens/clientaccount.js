// ============================================================
// 👤 v2.14 — Écran COMPTE CLIENT : suivi d'abonnement dans l'app PC.
// Le client (acheteur d'une licence) suit/prolonge sa licence ici ;
// la caisse reste réservée aux comptes staff.
// ============================================================
window.Screens = window.Screens || {};

Screens.clientaccount = (root) => {
  const t = I18n.t;
  const user = Api.user();

  const STATE_COLORS = {
    active: '#34D399', expiring: '#FBBF24', grace: '#FB923C',
    expired: '#F87171', revoked: '#94A3B8',
  };

  async function doLogout() {
    if (!(await UI.confirm(t('confirm_logout'), { danger: true, okText: t('yes') }))) return;
    try { await Api.post('/logout', {}); } catch { /* déjà hors ligne */ }
    Api.clear();
    location.hash = '#/login';
  }

  function build() {
    root.innerHTML = '';
    const sub = Api.subscription();
    const state = sub?.state ?? null;
    const code = state?.code ?? null;
    const color = STATE_COLORS[code] ?? '#94A3B8';

    const refreshBtn = UI.h('button', { class: 'btn btn-ghost' }, t('cl_refresh'));
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        const res = await Api.get('/me');
        Api.saveSubscription(res.subscription ?? null);
        build(); // re-rendu avec l'état frais
      } catch (e) {
        UI.toast?.(e.message || t('err_generic'));
        refreshBtn.disabled = false;
      }
    });

    const renewBtn = UI.h('button', { class: 'btn btn-primary btn-lg' }, t('cl_renew'));
    renewBtn.addEventListener('click', () => window.open(`${Api.siteUrl()}/compte`, '_blank'));

    const logoutBtn = UI.h('button', { class: 'btn btn-ghost', style: { color: '#F87171' } }, `🚪 ${t('logout')}`);
    logoutBtn.addEventListener('click', doLogout);

    const statusBadge = sub && code
      ? UI.h('span', {
          class: 'role-chip',
          style: { background: 'rgba(148,163,184,.12)', color, fontSize: '14px', padding: '8px 16px' },
        }, t(`cl_status_${code}`))
      : null;

    root.appendChild(UI.h('div', { class: 'login-wrap' },
      UI.h('div', { class: 'login-card', style: { textAlign: 'center' } },
        UI.h('div', { class: 'login-logo' }, '👤'),
        UI.h('div', { class: 'login-title' }, t('cl_title')),
        UI.h('div', { class: 'login-sub' }, `${user?.name ?? ''} · ${user?.email ?? ''}`),

        sub && statusBadge ? UI.h('div', { style: { margin: '14px 0' } }, statusBadge) : null,

        sub ? UI.h('div', { class: 'card', style: { textAlign: 'left', marginTop: '4px' } },
          UI.h('div', { class: 'row', style: { display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(148,163,184,.12)' } },
            UI.h('span', { style: { color: 'var(--muted, #8b98b8)' } }, t('cl_plan')),
            UI.h('strong', {}, sub.plan_name ?? '—')),
          UI.h('div', { class: 'row', style: { display: 'flex', justifyContent: 'space-between', padding: '9px 0' } },
            UI.h('span', { style: { color: 'var(--muted, #8b98b8)' } }, code === 'expired' ? t('cl_expired_on') : t('cl_until')),
            UI.h('strong', { style: { color } }, sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('fr-FR') : '—')),
          code === 'active' || code === 'expiring'
            ? UI.h('div', { style: { textAlign: 'center', color: 'var(--muted, #8b98b8)', fontSize: '12.5px', marginTop: '8px' } },
                `⏳ ${t('cl_days_left', { count: state.days_left })}`)
            : null,
          code === 'grace'
            ? UI.h('div', { class: 'form-error', style: { background: 'rgba(251,191,36,.14)', color: '#FBBF24', marginTop: '10px' } },
                `⚠️ ${t('cl_grace_left', { count: state.grace_left })}`)
            : null,
          code === 'expired'
            ? UI.h('div', { class: 'form-error', style: { marginTop: '10px' } }, `🔒 ${t('cl_blocked')}`)
            : null)
        : UI.h('div', { class: 'card', style: { marginTop: '4px', padding: '18px' } },
            UI.h('div', { style: { fontSize: '30px' } }, '🌱'),
            UI.h('div', { style: { fontWeight: 800, marginTop: '6px' } }, t('cl_no_sub')),
            UI.h('div', { style: { color: 'var(--muted, #8b98b8)', fontSize: '12.5px', marginTop: '6px' } }, t('cl_no_sub_hint'))),

        renewBtn,
        refreshBtn,
        UI.h('div', { style: { height: '10px' } }),
        logoutBtn,
        UI.h('div', { class: 'login-foot' }, SFPC_CONFIG.APP_VERSION))));
  }

  build();
};
