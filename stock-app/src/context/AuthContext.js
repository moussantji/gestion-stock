import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';
import { registerPushToken, unregisterPushToken } from '../utils/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null); // 👤 v25 : abonnement du compte client
  const [initializing, setInitializing] = useState(true);

  // Restaure la session au démarrage
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const stored = await SecureStore.getItemAsync('user');

        if (token && stored) {
          setUser(JSON.parse(stored));
          try { setSubscription(JSON.parse(await SecureStore.getItemAsync('subscription'))); } catch (e) {}
          // Vérifie/rafraîchit depuis l'API
          try {
            const res = await api.get('/me');
            setUser(res.data.user);
            setSubscription(res.data.subscription ?? null);
            await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
            await SecureStore.setItemAsync('subscription', JSON.stringify(res.data.subscription ?? null));
            // 🔔 Réenregistre le token push (peut avoir été renouvelé)
            registerPushToken();
          } catch (e) {
            if (e?.response?.status === 401) {
              await clearSession();
            }
          }
        }
      } catch (e) {
        // pas de session stockée
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  async function clearSession() {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('subscription');
    } catch (e) {}
    setUser(null);
    setSubscription(null);
  }

  /** Persiste token + user + abonnement (login classique ou code Google). */
  async function saveSession(data) {
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    await SecureStore.setItemAsync('subscription', JSON.stringify(data.subscription ?? null));
    setUser(data.user);
    setSubscription(data.subscription ?? null);
    // 🔔 Enregistre ce téléphone pour les push admin (best-effort)
    registerPushToken();
  }

  async function login(email, password) {
    const res = await api.post('/login', { email, password });
    await saveSession(res.data);
  }

  /** 🇬 v25 : échange le code affiché dans le navigateur après connexion Google. */
  async function loginWithGoogleCode(code) {
    const res = await api.post('/auth/google/exchange', { code: code.trim().toUpperCase() });
    await saveSession(res.data);
  }

  /** 🔄 Recharge user + abonnement depuis l'API (pull-to-refresh de l'écran compte). */
  async function refreshMe() {
    const res = await api.get('/me');
    setUser(res.data.user);
    setSubscription(res.data.subscription ?? null);
    await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
    await SecureStore.setItemAsync('subscription', JSON.stringify(res.data.subscription ?? null));
  }

  async function logout() {
    try {
      // 🔔 Cesse les push sur CE téléphone avant de couper la session
      await unregisterPushToken();
    } catch (e) {}
    try {
      await api.post('/logout');
    } catch (e) {
      // même si le serveur ne répond pas, on déconnecte localement
    }
    await clearSession();
  }

  const hasRole = (...roles) => (user ? roles.includes(user.role) : false);

  const value = useMemo(
    () => ({ user, subscription, initializing, login, loginWithGoogleCode, logout, refreshMe, hasRole }),
    [user, subscription, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
