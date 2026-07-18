// ============================================================
// StockFlow PC — client API (fetch + token Sanctum)
// Token et URL persistés en localStorage. 401 → déconnexion.
// ============================================================
const Api = (() => {
  const LS_TOKEN = 'sfpc.token';
  const LS_URL = 'sfpc.api';
  const LS_USER = 'sfpc.user';
  const LS_SUB = 'sfpc.subscription'; // 👤 v2.14 : abonnement du compte client (persisté)
  const LS_SHOP = 'sfpc.shop';
  const LS_PICK = 'sfpc.shop_pick';   // 🏬 v1.3 : point de vente du poste (persisté)
  let pickMemory = null;              // choix « session seule » (non mémorisé)

  const getUrl = () => (localStorage.getItem(LS_URL) || SFPC_CONFIG.DEFAULT_API_URL).replace(/\/$/, '');
  const setUrl = (u) => localStorage.setItem(LS_URL, u);
  const token = () => localStorage.getItem(LS_TOKEN);

  // 📡 v1.2 : signale à offline.js l'état du réseau (garde-fou try/catch pour les tests)
  const fire = (name) => {
    try { window.dispatchEvent(new CustomEvent(name)); } catch { /* hors navigateur */ }
  };

  function saveSession(tok, user, subscription = null) {
    localStorage.setItem(LS_TOKEN, tok);
    localStorage.setItem(LS_USER, JSON.stringify(user));
    localStorage.setItem(LS_SUB, JSON.stringify(subscription));
  }
  // 👤 v2.14 : abonnement courant (comptes clients uniquement — null pour le staff)
  function subscription() {
    try { return JSON.parse(localStorage.getItem(LS_SUB)); } catch { return null; }
  }
  function saveSubscription(sub) { localStorage.setItem(LS_SUB, JSON.stringify(sub ?? null)); }
  /** URL du site (sans /api) — portail client, page Google, reçus. */
  function siteUrl() { return getUrl().replace(/\/api$/, ''); }
  function user() {
    try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; }
  }
  function saveShop(shop) { localStorage.setItem(LS_SHOP, JSON.stringify(shop)); }
  function shop() {
    try { return JSON.parse(localStorage.getItem(LS_SHOP)); } catch { return null; }
  }
  function clear() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_SUB);
    localStorage.removeItem(LS_SHOP);
    // 🏬 le point de vente du poste survit aux sessions (c'est LE poste de la boutique)
  }

  // 🏬 v1.3 — point de vente rattaché au poste (sélecteur au login)
  function pickedShop() {
    if (pickMemory) return pickMemory;
    try { return JSON.parse(localStorage.getItem(LS_PICK)); } catch { return null; }
  }
  function setPickedShop(pick, persist = true) {
    pickMemory = pick;
    if (persist) localStorage.setItem(LS_PICK, JSON.stringify(pick));
  }
  function clearPickedShop() {
    pickMemory = null;
    localStorage.removeItem(LS_PICK);
  }
  /** L'utilisateur doit-il choisir son point de vente ? (admin/manager non rattaché) */
  function needsShopPick() {
    const u = user();
    if (!u || u.shop_id) return false;
    if (!['admin', 'manager'].includes(u.role)) return false;
    return !pickedShop();
  }

  async function request(method, path, { body, form, params } = {}) {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
      : '';

    const headers = { Accept: 'application/json' };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    if (body && !form) headers['Content-Type'] = 'application/json';
    const pick = pickedShop(); // 🏬 v1.3 : boutique du poste → périmètre + créations taggées
    if (pick?.shop_id > 0) headers['X-Shop-Id'] = String(pick.shop_id);

    let res;
    try {
      res = await fetch(getUrl() + path + qs, {
        method,
        headers,
        body: form ? form : body ? JSON.stringify(body) : undefined,
      });
    } catch {
      fire('sfpc:netdown'); // 📡 serveur injoignable
      const e = new Error(I18n.t('err_network'));
      e.network = true;
      throw e;
    }
    fire('sfpc:netup'); // 📡 une réponse (même d'erreur) = réseau OK

    if (res.status === 401) {
      clear();
      location.hash = '#/login';
      throw new Error(I18n.t('err_session'));
    }

    let data = null;
    try { data = await res.json(); } catch { /* réponse vide */ }

    if (!res.ok) {
      // Messages de validation Laravel { errors: { champ: […] } } ou { message }
      let msg = data?.message || `${I18n.t('err_generic')} (${res.status})`;
      if (data?.errors) {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first) && first.length) msg = first[0];
      }
      throw new Error(msg);
    }
    return data;
  }

  /** Télécharge un binaire authentifié (PDF…) → déclenche la sauvegarde */
  async function download(path, filename) {
    const headers = { Authorization: `Bearer ${token()}`, Accept: 'application/pdf' };
    const pick = pickedShop();
    if (pick?.shop_id > 0) headers['X-Shop-Id'] = String(pick.shop_id);
    const res = await fetch(getUrl() + path, { headers });
    if (!res.ok) throw new Error(`${I18n.t('err_generic')} (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return {
    get: (p, params) => request('GET', p, { params }),
    post: (p, body) => request('POST', p, { body }),
    put: (p, body) => request('PUT', p, { body }),
    postForm: (p, form) => request('POST', p, { form }),
    delete: (p) => request('DELETE', p),
    download,
    saveSession, user, saveShop, shop, clear,
    getUrl, setUrl, token, siteUrl,
    subscription, saveSubscription,
    pickedShop, setPickedShop, clearPickedShop, needsShopPick,
  };
})();

// ⚠️ v1.7 : Api aussi doit être une propriété de window (const top-level ≠ window.*)
// — sans cela, StockNotifier (window.Api?.token) restait muet en vrai Electron.
if (typeof window !== 'undefined') window.Api = Api;
