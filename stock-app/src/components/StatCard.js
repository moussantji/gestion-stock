import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/** Petite carte de statistique pour le tableau de bord.
 *  `ionicon` (nom Ionicons) = rendu vectoriel premium ; `icon` (emoji) = repli. */
export default function StatCard({ icon, ionicon, label, value, color = colors.primary, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
        {ionicon ? (
          <Ionicons name={ionicon} size={18} color={color} />
        ) : (
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        )}
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  label: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
