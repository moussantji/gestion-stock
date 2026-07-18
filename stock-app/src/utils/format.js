/** 12 500 FCFA */
export function formatMoney(value) {
  const n = Number(value) || 0;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)} FCFA`;
}

/** 14 juil., 09:32 */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    + ', '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** 14/07/2026 */
export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR');
}
