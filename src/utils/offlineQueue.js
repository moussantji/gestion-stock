import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

/**
 * File d'attente hors ligne (mouvements de stock).
 * Chaque action a un client_uuid → le serveur est idempotent (pas de doublon).
 */

const QUEUE_KEY = 'offline_queue_v1';
const CACHE_PRODUCTS_KEY = 'cache_products_v1';

// ---------- UUID simple (v4) ----------
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- File d'attente ----------

export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function queueMovement(movement) {
  const queue = await getQueue();
  queue.push(movement);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue.length;
}

async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Pousse tous les mouvements en attente vers l'API.
 * Retourne { synced, failed, remaining }.
 */
export async function syncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      await api.post('/movements', {
        product_id: item.product_id,
        type: item.type,
        quantity: item.quantity,
        unit_price: item.unit_price ?? null,
        reason: item.reason ?? null,
        reference: item.reference ?? null,
        client_uuid: item.client_uuid, // ← idempotence côté serveur
      });
      synced++;
    } catch (e) {
      // 422 (ex: stock insuffisant) → on conserve l'action pour décision manuelle
      failed++;
      remaining.push({ ...item, last_error: e?.response?.data?.errors?.quantity?.[0] ?? 'Erreur de synchronisation' });
    }
  }

  await saveQueue(remaining);
  return { synced, failed, remaining: remaining.length };
}

// ---------- Cache produits (lecture hors ligne) ----------

export async function cacheProducts(products) {
  try {
    await AsyncStorage.setItem(
      CACHE_PRODUCTS_KEY,
      JSON.stringify({ saved_at: new Date().toISOString(), products })
    );
  } catch (e) {}
}

export async function getCachedProducts() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
