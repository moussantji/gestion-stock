// ============================================================
// STOCKFLOW — Thème sombre premium
// ============================================================
import { DefaultTheme } from '@react-navigation/native';

export const colors = {
  // Palette 3 — Prune sombre + rose corail
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

  // Fonds teintés (badges, alertes)
  dangerBg: 'rgba(255,107,107,0.14)',
  warningBg: 'rgba(246,200,95,0.14)',
  successBg: 'rgba(100,214,160,0.14)',
  primaryBg: 'rgba(229,107,140,0.16)',
  infoBg: 'rgba(143,201,232,0.14)',
};

// Thème React Navigation correspondant (évite les flashs blancs)
export const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.bgAlt,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: DefaultTheme.fonts,
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  employee: 'Employé',
};
