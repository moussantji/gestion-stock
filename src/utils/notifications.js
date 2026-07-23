import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Module retiré d'Expo Go depuis SDK 53 — silencieux
}

/**
 * Notifications push distantes uniquement.
 * Le serveur envoie des push Expo (commandes, alertes, etc.).
 * ⚠️ Nécessite un development build / APK
 *    (pas de token Expo dans Expo Go SDK 53+) — l'échec est silencieux.
 */

const PUSH_TOKEN_KEY = 'expo_push_token';

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {}
}

async function ensurePermission() {
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    return false;
  }
}

/* ============================================================
 * PUSH DISTANTES — enregistrement du token Expo auprès de l'API
 * ========================================================== */

/**
 * Récupère le token Expo du téléphone puis l'envoie à l'API.
 * À appeler après chaque connexion (le token peut être renouvelé).
 * Best-effort : n'interrompt jamais la connexion.
 */
export async function registerPushToken() {
  try {
    const granted = await ensurePermission();
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Général',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    if (!token) return;

    const previous = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    const deviceName = Constants?.deviceName ?? Platform.OS;
    await api.post('/push-tokens', { token, device_name: deviceName });

    return token;
  } catch (e) {
    // Expo Go / pas de projectId / hors ligne → pas de push distante, pas grave
  }
}

/**
 * Désenregistre le token auprès de l'API (à la déconnexion)
 * pour ne plus recevoir les push admin sur ce téléphone.
 */
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await api.delete('/push-tokens', { data: { token } });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (e) {
    // Silencieux : on nettoiera côté serveur si besoin
  }
}

/**
 * Efface le badge de notification sur l'icône de l'app.
 * À appeler au lancement et quand l'utilisateur consulte les alertes.
 */
export async function clearBadge() {
  try {
    if (Notifications) {
      const granted = await ensurePermission();
      if (granted) {
        await Notifications.setBadgeCountAsync(0);
      }
    }
  } catch (e) {}
}
