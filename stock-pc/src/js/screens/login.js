// ============================================================
// 🔐 Écran de connexion — carte glass premium (comme le site)
// 👤 v2.14 : + « Continuer avec Google » (navigateur → code) pour les comptes clients
// ============================================================
window.Screens = window.Screens || {};

Screens.login = (root, onSuccess) => {
  const t = I18n.t;

  let busy = false;
  const errBox = UI.h('div', { style: { display: 'none' } });

  const email = UI.input({ type: 'email', placeholder: 'admin@stockflow.app', autocomplete: 'username' });
  const pwd = UI.input({ type: 'password', placeholder: '••••••••', autocomplete: 'current-password' });
  const btn = UI.h('button', { class: 'btn btn-primary btn-lg' }, t('signin'));

  function showError(msg) {
    errBox.className = 'form-error';
    errBox.style.display = '';
    errBox.textContent = msg;
  }

  // Après login réussi : compte client → écran abonnement, staff → caisse (via onSuccess)
  function afterLogin(res) {
    Api.saveSession(res.token, res.user, res.subscription ?? null);
    // 🏬 v1.3 : admin/gestionnaire non rattaché → choix du point de vente du poste
    if (Api.needsShopPick?.()) {
      Screens.shoppick(root, () => onSuccess?.());
      return;
    }
    onSuccess?.();
  }

  async function submit(e) {
    e?.preventDefault();
    if (busy) return;
    errBox.style.display = 'none';
    if (!email.value.trim() || !pwd.value) {
      showError(`${t('email')} & ${t('password')}…`);
      return;
    }
    busy = true; btn.disabled = true; btn.textContent = t('signing');
    try {
      const res = await Api.post('/login', { email: email.value.trim().toLowerCase(), password: pwd.value });
      afterLogin(res);
    } catch (e2) {
      // 403 abonnement expiré / identifiants incorrects → message serveur affiché tel quel
      showError(e2.message);
      busy = false; btn.disabled = false; btn.textContent = t('signin');
    }
  }

  btn.addEventListener('click', submit);
  pwd.addEventListener('keydown', (e) => e.key === 'Enter' && submit());

  // ---------- 🇬 v2.14 : connexion Google via navigateur → code à coller ----------
  const codeInput = UI.input({ type: 'text', placeholder: 'XXXX-XXXX', autocomplete: 'off' });
  codeInput.style.textTransform = 'uppercase';
  const codeBtn = UI.h('button', { class: 'btn btn-primary' }, t('lg_code_btn'));
  const codeBox = UI.h('div', { class: 'login-google-code', style: { display: 'none', marginTop: '12px' } },
    UI.h('div', { class: 'login-google-hint' }, t('lg_google_hint')),
    UI.field(t('lg_code_label'), codeInput),
    codeBtn);

  const googleBtn = UI.h('button', { class: 'btn btn-ghost', style: { width: '100%', marginTop: '10px' } },
    `🔵 ${t('lg_google')}`);

  googleBtn.addEventListener('click', () => {
    errBox.style.display = 'none';
    codeBox.style.display = '';
    codeInput.focus();
    // Ouvre le navigateur système (handler Electron → shell.openExternal)
    window.open(`${Api.siteUrl()}/auth/google/app`, '_blank');
  });

  let codeBusy = false;
  async function submitCode() {
    const code = codeInput.value.trim().toUpperCase();
    if (!code || codeBusy) return;
    errBox.style.display = 'none';
    codeBusy = true; codeBtn.disabled = true; codeBtn.textContent = t('signing');
    try {
      const res = await Api.post('/auth/google/exchange', { code });
      afterLogin(res);
    } catch (e2) {
      showError(e2.message);
      codeBusy = false; codeBtn.disabled = false; codeBtn.textContent = t('lg_code_btn');
    }
  }
  codeBtn.addEventListener('click', submitCode);
  codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && submitCode());

  const wrap = UI.h('div', { class: 'login-wrap' },
    UI.h('div', { class: 'login-card' },
      UI.h('div', { class: 'login-logo' }, '◆'),
      UI.h('div', { class: 'login-title' }, t('login_title')),
      UI.h('div', { class: 'login-sub' }, t('login_sub')),
      errBox,
      UI.field(t('email'), email),
      UI.field(t('password'), pwd),
      btn,
      googleBtn,
      codeBox,
      UI.h('div', { class: 'login-foot' },
        `${t('login_demo')}`,
        UI.h('br'), SFPC_CONFIG.APP_VERSION)));

  root.appendChild(wrap);
  email.focus();
};
