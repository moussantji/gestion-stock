import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { colors } from '../theme/colors';
import Icon from './Icon';

const EMPTY_ICON_MAP = {
  '📭': 'products', '🔒': 'password', '📈': 'stats', '🎉': 'success',
  '🧾': 'sale', '👤': 'profile', '📊': 'stats', '🔄': 'movements',
  '💰': 'cash', '🔔': 'alerts', '📦': 'products', '💳': 'cash',
  '🕐': 'alerts', '🖨': 'printer', '📍': 'alerts', '🔁': 'transfers',
  '🔍': 'search', '💵': 'cash', '🚚': 'suppliers', '🏬': 'shops',
  '📋': 'inventory', '👥': 'customers', '🏷': 'categories',
};

export default function EmptyState({ icon = '📭', title = 'Rien ici', subtitle }) {
  const styles = useThemedStyles(c => ({
    wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    icon: { fontSize: 40, marginBottom: 10 },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 4 },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.icon}><Icon name={EMPTY_ICON_MAP[icon] ?? icon} size={40} color={colors.primary} /></View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

