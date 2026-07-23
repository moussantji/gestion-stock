import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useNetwork } from '../context/NetworkContext';
import { useLocale } from '../context/LocaleContext';

/** Bandeau hors ligne / synchronisation (traduit FR/EN). */
export default function OfflineBanner() {
  const { isOnline, pendingCount, sync } = useNetwork();
  const { t } = useLocale();

  if (isOnline && pendingCount === 0) return null;

  const styles = useThemedStyles(c => ({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    offline: { backgroundColor: 'rgba(251,191,36,0.16)' },
    pending: { backgroundColor: 'rgba(124,92,255,0.18)' },
    text: { flex: 1, fontSize: 12.5, fontWeight: '600', color: c.text },
    syncBtn: { color: c.accent, fontWeight: '800', fontSize: 13, marginLeft: 10 },
  }));

  return (
    <View style={[styles.banner, isOnline ? styles.pending : styles.offline]}>
      <Text style={styles.text} numberOfLines={2}>
        {!isOnline
          ? `${t('offline_mode')}${pendingCount > 0 ? ` — ${pendingCount} ${t('offline_pending')}` : ''}`
          : t('offline_waiting', { count: pendingCount })}
      </Text>
      {isOnline && pendingCount > 0 ? (
        <TouchableOpacity onPress={sync} hitSlop={8}>
          <Text style={styles.syncBtn}>{t('offline_sync')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

