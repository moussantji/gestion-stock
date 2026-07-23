// Palettes d'apparence de StockFlow.
// Les valeurs peuvent être remplacées par la configuration de l'entreprise.
export const PALETTES = {
  plumCoral: {
    id: 'plumCoral',
    name: 'Prune sombre + rose corail',
    primary: '#E56B8C',
    primaryDark: '#C94F73',
    accent: '#FF9A8B',
    success: '#64D6A0',
    danger: '#FF6B6B',
    warning: '#F6C85F',
    info: '#8FC9E8',
    bg: '#120D17',
    bgAlt: '#1B1220',
    card: '#24172A',
    cardAlt: '#322039',
    border: '#493047',
    text: '#FFF4F1',
    muted: '#BFA8B8',
  },
  violetCyan: {
    id: 'violetCyan',
    name: 'Violet + cyan',
    primary: '#7C5CFF',
    primaryDark: '#6846F0',
    accent: '#22D3EE',
    success: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
    info: '#38BDF8',
    bg: '#0B0F1A',
    bgAlt: '#0E1424',
    card: '#141B2E',
    cardAlt: '#1A2340',
    border: '#232C47',
    text: '#F1F5F9',
    muted: '#94A3B8',
  },
  indigoTurquoise: {
    id: 'indigoTurquoise',
    name: 'Indigo + turquoise',
    primary: '#6478FF',
    primaryDark: '#4D5FDE',
    accent: '#2DD4BF',
    success: '#6EE7B7',
    danger: '#FB7185',
    warning: '#FACC15',
    info: '#7DD3FC',
    bg: '#0D1020',
    bgAlt: '#12172B',
    card: '#1A2038',
    cardAlt: '#242D4A',
    border: '#303B60',
    text: '#F4F7FF',
    muted: '#A7B1CE',
  },
};

export const DEFAULT_PALETTE_ID = 'plumCoral';

function rgba(hex, alpha) {
  const value = String(hex).replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function paletteWithDerivedColors(palette) {
  return {
    ...palette,
    dangerBg: rgba(palette.danger, 0.14),
    warningBg: rgba(palette.warning, 0.14),
    successBg: rgba(palette.success, 0.14),
    primaryBg: rgba(palette.primary, 0.16),
    infoBg: rgba(palette.info, 0.14),
  };
}
