import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { colors, navTheme } from '../theme/colors';
import { DEFAULT_PALETTE_ID, PALETTES, paletteWithDerivedColors } from '../theme/palettes';

const STORAGE_KEY = 'app_theme_v1';
const ThemeContext = createContext(null);

function applyPalette(palette) {
  const next = paletteWithDerivedColors(palette);
  Object.assign(colors, next);
  Object.assign(navTheme.colors, {
    primary: colors.primary,
    background: colors.bg,
    card: colors.bgAlt,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  });
  notifyThemeChange();
  return next;
}

let _themeListeners = [];
let _themeSnapshot = { colors: { ...colors }, version: 0 };

export function subscribeToTheme(listener) {
  _themeListeners.push(listener);
  return () => { _themeListeners = _themeListeners.filter(l => l !== listener); };
}

function notifyThemeChange() {
  _themeSnapshot = { colors: { ...colors }, version: _themeSnapshot.version + 1 };
  _themeListeners.forEach((l) => l());
}

export function getThemeSnapshot() { return _themeSnapshot; }

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => applyPalette(PALETTES[DEFAULT_PALETTE_ID]));
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const base = PALETTES[parsed.paletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
          const next = applyPalette({ ...base, ...(parsed.custom ?? {}) });
          setThemeState(next);
          setVersion((v) => v + 1);
        }
        // La configuration serveur est prioritaire lorsqu'un administrateur l'a enregistrée.
        try {
          const response = await api.get('/settings');
          const raw = response.data?.data?.theme_config?.value;
          if (raw) {
            const remote = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const base = PALETTES[remote.paletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
            const next = applyPalette({ ...base, ...(remote.custom ?? {}) });
            setThemeState(next);
            setVersion((v) => v + 1);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          }
        } catch (e) {
          // Hors connexion ou session absente : la préférence locale reste active.
        }
      } catch (e) {
        // Une préférence invalide ne doit jamais empêcher l'ouverture de l'app.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPalette = useCallback(async (paletteId, custom = {}) => {
    const base = PALETTES[paletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
    const next = applyPalette({ ...base, ...custom });
    setThemeState(next);
    setVersion((v) => v + 1);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ paletteId: base.id, custom }));
    } catch (e) {}
    return next;
  }, []);

  const savePaletteToServer = useCallback(async () => {
    const base = PALETTES[theme.id] ?? PALETTES[DEFAULT_PALETTE_ID];
    const custom = {};
    ['primary', 'primaryDark', 'accent', 'success', 'danger', 'warning', 'info'].forEach((key) => {
      if (theme[key] && theme[key] !== base[key]) custom[key] = theme[key];
    });
    const payload = { paletteId: theme.id, custom };
    await api.put('/settings', { theme_config: JSON.stringify(payload) });
    return payload;
  }, [theme]);

  const resetPalette = useCallback(() => setPalette(DEFAULT_PALETTE_ID), [setPalette]);

  const value = useMemo(() => ({
    theme,
    ready,
    version,
    palettes: PALETTES,
    setPalette,
    savePaletteToServer,
    resetPalette,
  }), [theme, ready, version, setPalette, savePaletteToServer, resetPalette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
