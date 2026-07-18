// ============================================================
// 🤖 Automatisations (v1.4) — le poste travaille tout seul
//  • "ticket"  : impression thermique AUTO du ticket après chaque vente
//    validée en ligne (sans aucun bouton, imprimante configurée requise)
//  • "report"  : rapport patron PDF AUTO enregistré à chaque clôture (Z),
//    sans boîte de dialogue → Documents/StockFlow/Rapports/rapport-stockflow-AAAA-MM-JJ.pdf
//  • "zticket" : 🖨 v1.5 — Z de caisse imprimé AUTO sur la thermique à
//    chaque clôture (sans toucher au bouton de la fenêtre d'actions)
//  • "daypack" : 📦 v1.9 — pack du jour (PDF récap quotidien : ventes,
//    vendeurs, caisse + bloc Z) enregistré AUTO à chaque clôture
//  • "emailpack" : 📧 v2.1 — pack du jour (PDF + CSV) envoyé AUTO au patron
//    après chaque clôture (adresse = réglage boutique boss_email)
//  • "weekly" : 🧮 v2.1 — bilan hebdo PDF (lun→dim) AUTO au premier
//    démarrage de la semaine → Documents/StockFlow/Rapports
//  • "weeklyprint" : 🖨 v2.2 — le bilan du lundi s'imprime aussi sur la thermique
//  • "weeklyemail" : 📧 v2.3 — le bilan du lundi part aussi par email au patron
//  • "outstock" : 🔔 v2.7 — notification groupée « N ruptures de stock » au
//    premier démarrage du jour (1×/jour, clic → écran Alertes)
//  • "creditdue" : 💳 v2.13 — notification « N échéance(s) crédit » au premier
//    démarrage du jour (dates planifiées aujourd'hui/demain/en retard, solde > 0)
// Préférences locales (localStorage). 100 % rétro-compatible : tout OFF
// par défaut, aucun changement backend.
// ============================================================
const Auto = (() => {
  const LS = 'sfpc.automation.v1';
  const LSO = 'sfpc.outstock.v1'; // 🔔 v2.7 : dernier jour notifié
  const LSC = 'sfpc.creditdue.v1'; // 💳 v2.13 : dernier jour notifié (échéances crédit)

  // ---------- Préférences ----------
  function get() {
    try { return { ticket: false, report: false, zticket: false, notif: false, monthly: false, beep: false, daypack: false, emailpack: false, weekly: false, weeklyprint: false, weeklyemail: false, outstock: false, creditdue: false, ...(JSON.parse(localStorage.getItem(LS)) ?? {}) }; }
    catch { return { ticket: false, report: false, zticket: false, notif: false, monthly: false, beep: false, daypack: false, emailpack: false, weekly: false, weeklyprint: false, weeklyemail: false, outstock: false, creditdue: false }; }
  }
  function set(patch) { localStorage.setItem(LS, JSON.stringify({ ...get(), ...patch })); }
  const ticketEnabled = () => get().ticket === true;
  const reportEnabled = () => get().report === true;
  const zticketEnabled = () => get().zticket === true;

  const toast = (msg, color) => { try { UI.toast(msg, color, 5000); } catch { /* tests headless */ } };

  /**
   * 🖨 Appelé juste après une vente validée (fire & forget depuis l'écran vente).
   * Imprime le ticket tout seul si l'option est active ET l'imprimante prête.
   * @returns {'off'|'no-printer'|'no-receipt'|'printed'|'failed'}
   */
  async function afterSale(receipt) {
    if (!ticketEnabled()) return 'off';
    if (!receipt?.id) return 'no-receipt'; // vente en file hors ligne → pas de ticket serveur
    if (!window.Thermal?.isConfigured()) {
      toast(I18n.t('ap_no_printer'), 'var(--warning)');
      return 'no-printer';
    }
    try {
      await Thermal.printById(receipt.id);
      toast(I18n.t('ap_printed'), 'var(--success)');
      return 'printed';
    } catch (e) {
      toast(I18n.t('ap_print_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 📄 Appelé juste après une clôture réussie (Z de caisse).
   * Enregistre le rapport patron des 30 derniers jours en mode « auto »
   * (aucun dialogue ; le main écrit dans Documents/StockFlow/Rapports).
   * @returns {'off'|'unavailable'|'saved'|'failed'}
   */
  async function afterClose(period = '30d') {
    if (!reportEnabled()) return 'off';
    if (!window.sfpc?.pdf || !window.StatReport) {
      toast(I18n.t('ap_report_failed', { msg: I18n.t('rp_electron_only') }), 'var(--warning)');
      return 'unavailable';
    }
    try {
      toast(I18n.t('ap_report_running'), 'var(--info)');
      const res = await StatReport.save(period, { auto: true });
      if (res?.saved) {
        toast(I18n.t('ap_report_saved', { path: res.path ?? '' }), 'var(--success)');
        return 'saved';
      }
      return 'failed';
    } catch (e) {
      toast(I18n.t('ap_report_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 🖨 v1.5 — juste après une clôture : imprime le Z de caisse tout seul
   * sur la thermique configurée (le patron part avec le papier en main).
   * @returns {'off'|'no-closing'|'no-printer'|'printed'|'failed'}
   */
  async function afterCloseZ(closing, placeName = null) {
    if (!zticketEnabled()) return 'off';
    if (!closing?.id) return 'no-closing';
    if (!window.Thermal?.isConfigured()) {
      toast(I18n.t('ap_z_no_printer'), 'var(--warning)');
      return 'no-printer';
    }
    try {
      await Thermal.printZ(closing, placeName);
      toast(I18n.t('ap_z_printed'), 'var(--success)');
      return 'printed';
    } catch (e) {
      toast(I18n.t('ap_z_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 📅 v1.8 — Récap comptable auto : au changement de mois (1er jour ou premier
   * démarrage suivant), enregistre le PDF du mois passé dans Documents/StockFlow/Rapports.
   * Anti-doublon : mois courant mémorisé ; 1er appel = amorçage silencieux.
   * @returns {'off'|'unavailable'|'seed'|'same'|'saved'|'failed'}
   */
  async function maybeAutoMonthly(todayStr = null) {
    if (!monthlyEnabled()) return 'off';
    if (!window.sfpc?.pdf || !window.StatReport) return 'unavailable';
    const today = (todayStr ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const cur = today.slice(0, 7); // YYYY-MM
    const [Y, M] = cur.split('-').map(Number);
    const prevKey = `${M === 1 ? Y - 1 : Y}-${String(M === 1 ? 12 : M - 1).padStart(2, '0')}`;
    const last = localStorage.getItem(LSM);
    if (last === cur) return 'same';
    if (last === null) { localStorage.setItem(LSM, cur); return 'seed'; }
    try {
      toast(I18n.t('ap_monthly_running'), 'var(--info)');
      const res = await StatReport.saveMonthly(prevKey, { auto: true }); // zéro dialogue
      if (res?.saved) {
        localStorage.setItem(LSM, cur);
        toast(I18n.t('ap_monthly_saved', { path: res.path ?? '' }), 'var(--success)');
        return 'saved';
      }
      return 'failed';
    } catch (e) {
      toast(I18n.t('ap_monthly_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  const LSM = 'sfpc.auto_monthly.v1';
  const LSW = 'sfpc.auto_weekly.v1';
  const monthlyEnabled = () => get().monthly === true;
  const beepEnabled = () => get().beep === true;
  const daypackEnabled = () => get().daypack === true;
  const emailpackEnabled = () => get().emailpack === true;
  const weeklyEnabled = () => get().weekly === true;
  const weeklyprintEnabled = () => get().weeklyprint === true;
  const weeklyemailEnabled = () => get().weeklyemail === true;

  /** 🖨 v2.2 — après un bilan hebdo enregistré, l'imprime sur la thermique (jamais bloquant). */
  async function printWeeklyTicket(fromIso, toIso) {
    if (!weeklyprintEnabled()) return 'off';
    if (!window.Thermal?.isConfigured()) {
      toast(I18n.t('ap_no_printer'), 'var(--warning)');
      return 'no-printer';
    }
    try {
      await Thermal.printWeekly(fromIso, toIso);
      toast(I18n.t('ap_wp_printed'), 'var(--success)');
      return 'printed';
    } catch (e) {
      toast(I18n.t('ap_wp_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 📧🧮 v2.3 — envoie le bilan hebdo (PDF base64) à l'email du patron.
   * Appelé en chaîne par maybeAutoWeekly (fire & forget, jamais bloquant).
   * @returns {'off'|'no-data'|'sent'|'failed'}
   */
  async function emailWeekly(fromIso, toIso, pdfRes) {
    if (!weeklyemailEnabled()) return 'off';
    if (!pdfRes?.data64) {
      toast(I18n.t('ap_email_failed', { msg: I18n.t('rp_electron_only') }), 'var(--warning)');
      return 'no-data';
    }
    try {
      const res = await Api.post('/accounting/email-weekly', {
        from: fromIso,
        to: toIso,
        pdf: pdfRes.data64,
      });
      toast(I18n.t('ap_email_sent', { to: res?.data?.to ?? '' }), 'var(--success)');
      return 'sent';
    } catch (e) {
      toast(I18n.t('ap_email_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 📧 v2.1 — envoie le pack (PDF base64 + CSV) à l'email du patron.
   * Appelé en chaîne par afterClosePack (jamais bloquant pour la clôture).
   * @returns {'off'|'no-data'|'sent'|'failed'}
   */
  async function emailPack(closing, pdfRes, csvRes = null) {
    if (!emailpackEnabled()) return 'off';
    if (!closing?.closing_date || !pdfRes?.data64) {
      toast(I18n.t('ap_email_failed', { msg: I18n.t('rp_electron_only') }), 'var(--warning)');
      return 'no-data';
    }
    try {
      const res = await Api.post('/accounting/email-pack', {
        date: String(closing.closing_date).slice(0, 10),
        pdf: pdfRes.data64,
        csv: csvRes?.content ?? null,
        csv_name: csvRes?.name ?? null,
      });
      toast(I18n.t('ap_email_sent', { to: res?.data?.to ?? '' }), 'var(--success)');
      return 'sent';
    } catch (e) {
      toast(I18n.t('ap_email_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /** 🧮 Semaine ISO (lundi) d'une date YYYY-MM-DD → {key, monday}. PURE (testable). */
  function weekKeyOf(dateStr) {
    const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
    const delta = (d.getDay() + 6) % 7; // 0 = lundi
    const mon = new Date(d); mon.setDate(d.getDate() - delta);
    const thu = new Date(mon); thu.setDate(mon.getDate() + 3); // année ISO = année du jeudi
    const jan4 = new Date(thu.getFullYear(), 0, 4);
    const jan4Delta = (jan4.getDay() + 6) % 7;
    const week1Mon = new Date(jan4); week1Mon.setDate(jan4.getDate() - jan4Delta);
    const wk = 1 + Math.round((mon - week1Mon) / (7 * 86400000));
    return { key: `${thu.getFullYear()}-W${String(wk).padStart(2, '0')}`, monday: mon };
  }

  /**
   * 🧮 v2.1 — bilan hebdo auto : au premier démarrage de la semaine,
   * enregistre le PDF de la semaine écoulée (lun→dim). Même mécanique anti-doublon
   * que le récap mensuel : marqueur de semaine, seed silencieux, réessaie en cas de panne.
   * @returns {'off'|'unavailable'|'seed'|'same'|'saved'|'failed'}
   */
  async function maybeAutoWeekly(todayStr = null) {
    if (!weeklyEnabled()) return 'off';
    if (!window.sfpc?.pdf || !window.StatReport) return 'unavailable';
    const today = (todayStr ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const { key, monday } = weekKeyOf(today);
    const last = localStorage.getItem(LSW);
    if (last === key) return 'same';
    if (last === null) { localStorage.setItem(LSW, key); return 'seed'; }
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const prevMon = new Date(monday); prevMon.setDate(monday.getDate() - 7);
    const prevSun = new Date(monday); prevSun.setDate(monday.getDate() - 1);
    try {
      toast(I18n.t('ap_weekly_running'), 'var(--info)');
      const res = await StatReport.saveWeekly(iso(prevMon), iso(prevSun), { auto: true });
      if (res?.saved) {
        localStorage.setItem(LSW, key);
        toast(I18n.t('ap_weekly_saved', { path: res.path ?? '' }), 'var(--success)');
        printWeeklyTicket(iso(prevMon), iso(prevSun)); // 🖨 v2.2 : thermique le lundi (fire & forget)
        emailWeekly(iso(prevMon), iso(prevSun), res); // 📧 v2.3 : email patron le lundi (fire & forget)
        return 'saved';
      }
      return 'failed';
    } catch (e) {
      toast(I18n.t('ap_weekly_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 📦 v1.9 — juste après une clôture : enregistre le « pack du jour »
   * (PDF récap quotidien) dans Documents/StockFlow/Rapports, zéro dialogue.
   * @returns {'off'|'no-closing'|'unavailable'|'saved'|'failed'}
   */
  async function afterClosePack(closing, placeName = null) {
    if (!daypackEnabled()) return 'off';
    if (!closing?.id) return 'no-closing';
    if (!window.sfpc?.pdf || !window.StatReport) {
      toast(I18n.t('ap_pack_failed', { msg: I18n.t('rp_electron_only') }), 'var(--warning)');
      return 'unavailable';
    }
    try {
      toast(I18n.t('ap_pack_running'), 'var(--info)');
      const res = await StatReport.saveDayPack(closing, { auto: true, placeName });
      // 📤 v2.0 : le CSV des ventes du jour est joint au pack — bonus, jamais bloquant
      let csvResult = null;
      if (window.sfpc?.file) {
        try {
          csvResult = await StatReport.saveDayCsv(closing, { auto: true });
          if (csvResult?.saved) toast(I18n.t('ap_csv_saved'), 'var(--info)');
        } catch (e) {
          csvResult = null;
          toast(I18n.t('ap_csv_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
        }
      }
      if (res?.saved) {
        // 📧 v2.1 : envoi auto au patron (PDF base64 du main + CSV en mémoire)
        await emailPack(closing, res, csvResult);
        toast(I18n.t('ap_pack_saved', { path: res.path ?? '' }), 'var(--success)');
        return 'saved';
      }
      return 'failed';
    } catch (e) {
      toast(I18n.t('ap_pack_failed', { msg: String(e?.message ?? e) }), 'var(--danger)');
      return 'failed';
    }
  }

  /**
   * 🔔 v2.7 — « Ruptures du matin » : au premier démarrage du jour, notification
   * native groupée « N produit(s) en rupture » (1×/jour, pas de spam).
   * Le marqueur n'est PAS avancé en cas d'erreur réseau → retentative au prochain boot.
   * @returns {'off'|'same'|'none'|'sent'|'failed'}
   */
  async function maybeDailyOutstock(todayStr = null) {
    if (get().outstock !== true) return 'off';
    const day = (todayStr ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    if (localStorage.getItem(LSO) === day) return 'same';
    let res;
    try {
      res = await Api.get('/products', { out_of_stock: 1, per_page: 1 }); // paginator → total = compteur
    } catch (e) { return 'failed'; }
    localStorage.setItem(LSO, day);
    const n = Number(res?.total ?? 0);
    if (n <= 0) return 'none';
    // 📉 v2.8 : la notif du matin signale aussi les ruptures imminentes (≤ 7 j) — non bloquant
    let extra = '';
    try {
      const rf = await Api.get('/products/restock-forecast');
      const m = (rf?.data ?? []).filter((r) => Number(r?.days_left ?? 99) <= 7).length;
      if (m > 0) extra = ` ${I18n.t('ap_outstock_more', { m })}`;
    } catch { /* prévisions non vitales : la notif part quand même */ }
    window.StockNotifier?.fire?.(I18n.t('ap_outstock_title', { n }), I18n.t('ap_outstock_body') + extra);
    return 'sent';
  }

  /**
   * 💳 v2.13 — « Échéances crédit du matin » : au premier démarrage du jour,
   * notification groupée « N échéance(s) crédit » (planifiées aujourd'hui,
   * demain ou en retard, solde > 0 — le rappel J−1 du patron, sans email).
   * Mêmes garde-fous que « ruptures du matin » : 1×/jour, marqueur NON avancé
   * sur panne réseau, OFF par défaut.
   * @returns {'off'|'same'|'none'|'sent'|'failed'}
   */
  async function maybeDailyCreditDue(todayStr = null) {
    if (get().creditdue !== true) return 'off';
    const day = (todayStr ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    if (localStorage.getItem(LSC) === day) return 'same';
    let res;
    try {
      res = await Api.get('/customers', { all: 1 }); // additive days_until/next_payment_date (serveur v2.13)
    } catch (e) { return 'failed'; }
    localStorage.setItem(LSC, day);
    const n = (res?.data ?? []).filter((c) =>
      Number(c?.credit_balance ?? 0) > 0 && c?.days_until != null && Number(c.days_until) <= 1).length;
    if (n <= 0) return 'none';
    window.StockNotifier?.fire?.(I18n.t('ap_creditdue_title', { n }), I18n.t('ap_creditdue_body'));
    return 'sent';
  }

  return { get, set, ticketEnabled, reportEnabled, zticketEnabled, monthlyEnabled, beepEnabled, daypackEnabled,
    emailpackEnabled, weeklyEnabled, weeklyprintEnabled, weeklyemailEnabled, weekKeyOf, emailPack, emailWeekly, maybeAutoWeekly, printWeeklyTicket,
    afterSale, afterClose, afterCloseZ, afterClosePack, maybeAutoMonthly, maybeDailyOutstock, maybeDailyCreditDue };
})();

window.Auto = Auto; // window toujours présent (navigateur / tests avec stub)
