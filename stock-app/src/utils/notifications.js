import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';

/**
 * Notifications — 2 canaux :
 *  1. LOCALES  : rappels d'expiration planifiés depuis l'app (scheduleLicenseReminders)
 *  2. DISTANTES : le serveur envoie des push Expo (nouvelle commande,
 *     récap licences expirantes) → il faut lui enregistrer notre token.
 *
 * ⚠️ Le push DISTANT nécessite un development build / APK
 *    (pas de token Expo dans Expo Go SDK 53+) — l'échec est silencieux.
 */

const PUSH_TOKEN_KEY = 'expo_push_token';

// Affiche les notifications même quand l'app est ouverte
try {
  Notifications.setNotificationHandler({
    // shouldShowAlert supprimé (déprécié SDK 53+) → remplacé par shouldShowBanner + shouldShowList
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {}

async function ensurePermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    return false;
  }
}

/**
 * Planifie des rappels locaux (J-3 et J-1 à 09:00) pour chaque licence
 * qui expire bientôt. Silencieux en cas d'échec ( Expo Go / web ).
 */
export async function scheduleLicenseReminders(expiringLicenses, notifTitle, notifBodyFn) {
  try {
    if (!expiringLicenses?.length) return;
    const granted = await ensurePermission();
    if (!granted) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();

    for (const license of expiringLicenses) {
      const expiresAt = new Date(license.expires_at).getTime();

      for (const daysBefore of [3, 1]) {
        const fireDate = new Date(expiresAt);
        fireDate.setDate(fireDate.getDate() - daysBefore);
        fireDate.setHours(9, 0, 0, 0);

        const seconds = Math.floor((fireDate.getTime() - now) / 1000);
        if (seconds < 120) continue; // déjà passé / trop proche

        await Notifications.scheduleNotificationAsync({
          content: {
            title: notifTitle,
            body: notifBodyFn(license, daysBefore),
            data: { licenseKey: license.key },
          },
          // SDK 53+ : le trigger doit être typé (l'ancien raccourci { seconds } est déprécié)
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
            channelId: 'licenses',
          },
        });
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('licenses', {
        name: 'Licences',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  } catch (e) {
    // Notifications non supportées dans cet environnement — pas grave
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
    // 🚫 Expo Go (SDK 53+) : les push distantes n'y sont plus supportées.
    // On n'appelle PAS getExpoPushTokenAsync pour éviter le warning ; il faut un dev build/APK.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return;
    }

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
