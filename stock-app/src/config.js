// ============================================================
// URL de l'API Laravel
// ------------------------------------------------------------
// En DEV (Expo Go / dev build), on détecte AUTOMATIQUEMENT l'IP du PC qui
// fait tourner Metro (Constants.expoConfig.hostUri = "192.168.1.42:8081") et
// on pointe l'API Laravel sur cette même machine, port 8000.
// → Aucune IP à éditer à la main. Il suffit de lancer Laravel avec :
//      php artisan serve --host=0.0.0.0 --port=8000
//   (et que le téléphone soit sur le MÊME Wi-Fi que le PC).
//
// En PRODUCTION (build sans Metro), on utilise PROD_API_URL ci-dessous —
// remplace-la par ton vrai domaine, ex: https://api.stockflow.app/api
// ============================================================
import Constants from 'expo-constants';

// 🌐 URL de production (aucun Metro) — à personnaliser avant un build store.
const PROD_API_URL = 'https://api.stockflow.app/api';

// 🔌 Port du serveur Laravel en dev.
const DEV_API_PORT = 8000;

/** Récupère l'IP de la machine de dev depuis Expo (Metro), si disponible. */
function detectDevApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';
  const host = String(hostUri).split(':')[0];
  // On n'accepte qu'une IPv4 ou un hostname valide (pas "localhost" côté téléphone)
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEV_API_PORT}/api`;
  }
  return null;
}

export const API_URL = (__DEV__ && detectDevApiUrl()) || PROD_API_URL;
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Réécrit l'hôte d'une URL média renvoyée par l'API pour la rattacher au
 * SERVER_URL courant. Le backend construit les URLs d'images avec asset()
 * (basé sur APP_URL), souvent "localhost" → INJOIGNABLE depuis le téléphone.
 * On ne garde que le chemin et on le rattache au serveur réellement joignable.
 */
export function mediaUrl(url) {
  if (!url) return null;
  const path = String(url).replace(/^https?:\/\/[^/]+/i, ''); // retire scheme://host:port
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
