import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCALES, fr } from '../i18n/translations';

const STORAGE_KEY = 'app_locale_v1';
const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('fr');
  const [ready, setReady] = useState(false);

  // Restaure la langue choisie
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && LOCALES[saved]) setLocale(saved);
      } catch (e) {} finally {
        setReady(true);
      }
    })();
  }, []);

  const changeLocale = useCallback(async (next) => {
    if (!LOCALES[next]) return;
    setLocale(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
  }, []);

  /**
   * t('tab_home') → traduction, avec repli FR.
   * t('offline_waiting', { count: 3 }) → interpolation {count}.
   */
  const t = useCallback(
    (key, params) => {
      let str = LOCALES[locale]?.[key] ?? fr[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, ready, t, changeLocale }), [locale, ready, t, changeLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
