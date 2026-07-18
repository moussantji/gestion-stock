// ============================================================
// StockFlow PC — formats (FCFA entiers, dates)
// ============================================================
const Fmt = (() => {
  const money = (n) => {
    const v = Math.round(Number(n) || 0);
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' F';
  };
  const moneyFull = (n) => money(n) + 'CFA';

  const num = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0);

  const date = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(I18n.getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };
  const dateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return date(iso) + ' ' + d.toLocaleTimeString(I18n.getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  return { money, moneyFull, num, date, dateTime, esc };
})();
