import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

// Ajoute le token Sanctum à chaque requête
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // SecureStore indisponible (web) — la requête part sans token
  }
  return config;
});

/** Extrait un message lisible depuis une erreur Axios / Laravel. */
export function getErrorMessage(error, fallback = 'Une erreur est survenue. Réessaie.') {
  const res = error?.response;

  // Erreurs de validation Laravel (422)
  if (res?.data?.errors) {
    const first = Object.values(res.data.errors)[0];
    if (Array.isArray(first) && first.length > 0) return first[0];
  }

  if (res?.data?.message) return res.data.message;

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return "Impossible de joindre le serveur.\nVérifie l'URL de l'API dans src/config.js et que Laravel est lancé (php artisan serve --host=0.0.0.0).";
  }

  if (error?.code === 'ECONNABORTED') {
    return 'Le serveur met trop de temps à répondre.';
  }

  return fallback;
}

export default api;
