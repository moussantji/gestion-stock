import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { colors } from '../theme/colors';
import Icon from './Icon';

const STAT_ICON_MAP = {
  '📦': 'products', '💰': 'cash', '⚠️': 'alerts', '🚫': 'close', '📅': 'inventory',
  '📈': 'stats', '💸': 'cash', '🏆': 'stats', '🧾': 'sale', '🛒': 'sale',
  '👤': 'profile', '👥': 'customers', '💳': 'cash', '🔄': 'movements',
};

/** Petite carte de statistique pour le tableau de bord. */
export default function StatCard({ icon, label, value, color = colors.primary, style }) {
  const styles = useThemedStyles(c => ({
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    value: { fontSize: 17, fontWeight: '800' },
    label: { fontSize: 11, color: c.muted, marginTop: 2 },
  }));

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
        <Icon name={STAT_ICON_MAP[icon] ?? icon} size={18} color={color} />
      </View>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

