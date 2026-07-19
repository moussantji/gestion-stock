// ============================================================
// STOCKFLOW — Thème sombre premium
// ============================================================
import { DarkTheme as NavDarkTheme } from '@react-navigation/native';

export const colors = {
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

  // Fonds teintés (badges, alertes)
  dangerBg: 'rgba(248,113,113,0.12)',
  warningBg: 'rgba(251,191,36,0.12)',
  successBg: 'rgba(52,211,153,0.12)',
  primaryBg: 'rgba(124,92,255,0.14)',
  infoBg: 'rgba(56,189,248,0.12)',
};

// Thème React Navigation correspondant (évite les flashs blancs).
// ⚠️ On étend NavDarkTheme pour hériter de `fonts` (regular/medium/bold/heavy) :
// React Navigation v7 lit theme.fonts.regular → sans lui, crash
// « Cannot read property 'regular' of undefined ».
export const navTheme = {
  ...NavDarkTheme,
  dark: true,
  colors: {
    ...NavDarkTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bgAlt,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  employee: 'Employé',
  client: 'Client',
};
