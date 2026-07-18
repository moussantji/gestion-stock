// ============================================================
// 🔔 Notifications bureau (v1.7) — le poste prévient tout seul
// quand des produits passent en alerte (stock bas / rupture).
// Utilise l'API Notification du renderer Electron → vrais toasts
// natifs Windows/macOS/Linux. Règle anti-spam : notifie UNIQUEMENT
// quand le compteur d'alertes AUGMENTE (dernier niveau mémorisé).
// ============================================================
const StockNotifier = (() => {
  const LS = 'sfpc.notif_count.v1'; // dernier niveau notifié/connu
  const enabled = () => window.Auto?.get?.().notif === true;
  const canNotify = () => typeof Notification !== 'undefined';

  /** Affiche une notification native (demande la permission si besoin). */
  function fire(title, body) {
    try {
      if (!canNotify()) return false;
      const show = () => {
        const n = new Notification(title, { body, silent: false });
        n.onclick = () => { try { window.focus?.(); } catch { /* noop */ } location.hash = '#/alerts'; };
      };
      if (Notification.permission === 'granted') { show(); return true; }
      if (Notification.permission !== 'denied') {
        Notification.requestPermission()
          .then((p) => { if (p === 'granted') show(); })
          .catch(() => { /* refusé silencieusement */ });
        return 'pending'; // permission demandée : la prochaine alerte sera notifiée
      }
      return false;
    } catch { return false; }
  }

  /**
   * Appelé par App.refreshAlertBadge() avec le compteur d'alertes courant.
   * @returns {'off'|'same'|'silent'|'notified'|'no-permission'}
   */
  function maybeNotify(nAlerts) {
    if (!enabled() || !window.Api?.token?.()) return 'off';
    const n = Math.max(0, Number(nAlerts) || 0);
    const lastRaw = localStorage.getItem(LS);
    if (lastRaw === null) { // 1er passage : mémorise le niveau actuel, jamais de spam initial
      localStorage.setItem(LS, String(n));
      return 'silent';
    }
    const last = Number(lastRaw);
    if (n === last) return 'same';
    localStorage.setItem(LS, String(n));
    if (n < last) return 'silent'; // amélioration → mise à jour discrète
    const r = fire(I18n.t('nt_title', { n }), I18n.t('nt_body'));
    return r === true ? 'notified' : 'no-permission';
  }

  /** Bouton « Tester » des Réglages. */
  function test() {
    return fire(I18n.t('nt_test_title'), I18n.t('nt_body'));
  }

  return { maybeNotify, test, enabled, canNotify, fire }; // 🔔 v2.7 : fire exposé (ruptures du matin)
})();

window.StockNotifier = StockNotifier;
