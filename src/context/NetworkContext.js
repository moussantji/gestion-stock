import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueue, syncQueue } from '../utils/offlineQueue';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const syncing = useRef(false);

  const refreshPending = useCallback(async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current) return null;
    syncing.current = true;
    try {
      const result = await syncQueue();
      await refreshPending();
      if (result.synced > 0) setLastSync(new Date());
      return result;
    } finally {
      syncing.current = false;
    }
  }, [refreshPending]);

  // Écoute du réseau + sync automatique au retour de connexion
  useEffect(() => {
    refreshPending();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline((prev) => {
        if (!prev && online) {
          // retour réseau → synchronise la file d'attente
          sync();
        }
        return online;
      });
    });
    return () => unsubscribe();
  }, [sync, refreshPending]);

  const value = useMemo(
    () => ({ isOnline, pendingCount, lastSync, refreshPending, sync }),
    [isOnline, pendingCount, lastSync, refreshPending, sync]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext);
}
