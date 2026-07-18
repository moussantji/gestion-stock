// ============================================================
// 📡 Mode hors ligne (v1.2)
// • Catalogue (produits + clients) mis en cache à chaque visite
//   de l'écran Vente → la caisse reste ouverte sans réseau.
// • Ventes validées hors ligne → file locale (client_uuid) →
//   synchronisation idempotente dès que le serveur revient
//   (le backend renvoie { duplicate: true } en double envoi).
// • 🔁 v2.1 : les VERSEMENTS crédit rejoignent la même file
//   (kind:'payment') — résolus par id serveur, ou par client_uuid
//   via /receipts/by-uuid/{uuid}/payments ; anti-double envoyé
//   côté serveur (même montant/caissier < 2 min → duplicate:true).
// ============================================================
const OfflineSales = (() => {
  const Q = 'sfpc.queue.v1';
  const CAT = 'sfpc.catalog.v1';
  let down = false;
  let syncing = false;

  // Évènement UI (re-rendu chip topbar / carte réglages)
  const fire = (name) => {
    try { window.dispatchEvent(new CustomEvent(name)); } catch { /* hors navigateur (tests) */ }
  };
  const notify = () => fire('sfpc:offline-change');

  // Ponts avec api.js : tout fetch qui aboutit = serveur joignable
  const on = (evt, fn) => { try { window.addEventListener(evt, fn); } catch { /* tests */ } };
  on('sfpc:netdown', () => { if (!down) { down = true; notify(); } });
  on('sfpc:netup', () => { if (down) { down = false; notify(); } });
  on('offline', () => { down = true; notify(); });
  on('online', () => { down = false; notify(); });

  const isDown = () => down
    || (typeof navigator !== 'undefined' && navigator.onLine === false);

  // ---------- File d'attente ----------
  function queue() {
    try { return JSON.parse(localStorage.getItem(Q)) ?? []; } catch { return []; }
  }
  function save(q) { localStorage.setItem(Q, JSON.stringify(q)); notify(); }
  const queueCount = () => queue().length;

  function uuid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function enqueue(payload, meta = {}) {
    const q = queue();
    q.push({
      id: uuid(),
      at: new Date().toISOString(),
      meta: { client: meta.client ?? null, total: meta.total ?? 0 },
      payload,
      error: null,
    });
    save(q);
  }
  /**
   * 🔁 v2.1 : versement crédit enregistré hors ligne.
   * @param {{receiptId?: number, saleUuid?: string}} ref — id serveur si connu,
   *   sinon client_uuid de la vente hors ligne (résolu à la synchro).
   */
  function enqueuePayment(ref, amount, meta = {}) {
    const q = queue();
    q.push({
      id: uuid(),
      at: new Date().toISOString(),
      kind: 'payment',
      ref: { receipt_id: ref?.receiptId ?? null, sale_uuid: ref?.saleUuid ?? null },
      payload: { amount: Math.max(1, Math.round(Number(amount) || 0)) },
      meta: { client: meta.client ?? null, total: Math.max(1, Math.round(Number(amount) || 0)) },
      error: null,
    });
    save(q);
  }
  const queueByKind = () => ({
    sales: queue().filter((x) => x.kind !== 'payment').length,
    payments: queue().filter((x) => x.kind === 'payment').length,
  });

  function remove(id) { save(queue().filter((x) => x.id !== id)); }
  function markError(id, msg) {
    save(queue().map((x) => (x.id === id ? { ...x, error: msg } : x)));
  }
  function clear() { save([]); }

  // ---------- Catalogue en cache ----------
  function saveCatalog(products, customers) {
    if (!products?.length) return; // ne jamais écraser par du vide
    try {
      localStorage.setItem(CAT, JSON.stringify({
        at: new Date().toISOString(),
        products,
        customers: customers ?? [],
      }));
    } catch { /* quota : tant pis, on garde l'ancien */ }
  }
  function readCatalog() {
    try { return JSON.parse(localStorage.getItem(CAT)); } catch { return null; }
  }

  // ---------- Synchronisation ----------
  async function sync({ silent = false } = {}) {
    if (syncing) return { sent: 0, left: queueCount() };
    if (!Api.token()) return { sent: 0, left: queueCount() };
    syncing = true;
    let sent = 0;

    // Passe 1 : les VENTES (idempotentes via client_uuid) + carte uuid → id serveur
    const uuidMap = {}; // 🔁 v2.1 : les versements en file en auront besoin
    for (const item of [...queue()].filter((x) => x.kind !== 'payment')) {
      try {
        const res = await Api.post('/receipts', item.payload); // même client_uuid → idempotent
        const rid = res?.data?.id ?? res?.data?.receipt?.id ?? null;
        const cu = item.payload?.client_uuid;
        if (cu && rid) uuidMap[cu] = rid;
        remove(item.id);
        sent += 1;
      } catch (e) {
        if (e.network) { syncing = false; notify(); return { sent, left: queueCount() }; } // toujours coupé
        markError(item.id, e.message); // refus métier (stock…) → visible dans Réglages
      }
    }

    // Passe 2 : les VERSEMENTS (résolution : id connu → carte uuid → route by-uuid)
    for (const item of [...queue()].filter((x) => x.kind === 'payment')) {
      const rid = item.ref?.receipt_id
        ?? (item.ref?.sale_uuid ? uuidMap[item.ref.sale_uuid] : null);
      const url = rid
        ? `/receipts/${rid}/payments`
        : (item.ref?.sale_uuid ? `/receipts/by-uuid/${item.ref.sale_uuid}/payments` : null);
      if (!url) { markError(item.id, I18n.t('off_pay_orphan')); continue; } // ni id ni uuid (file corrompue)
      try {
        const res = await Api.post(url, item.payload);
        remove(item.id); // {duplicate:true} = déjà appliqué côté serveur → aussi retiré
        sent += 1;
        void res;
      } catch (e) {
        if (e.network) break; // réseau re-tombé → suivant cycle
        markError(item.id, e.message); // 404 reçu inconnu, 422 montant… → visible dans Réglages
      }
    }

    syncing = false;
    notify();
    if (!silent && sent > 0) UI.toast(I18n.t('off_synced', { n: sent }), 'var(--success)', 5000);
    return { sent, left: queueCount() };
  }

  return {
    isDown, queue, queueCount, enqueue, enqueuePayment, queueByKind, remove, clear, uuid,
    saveCatalog, readCatalog, sync, notify,
  };
})();

if (typeof window !== 'undefined') window.OfflineSales = OfflineSales;
