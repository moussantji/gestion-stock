import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function EmptyState({ icon = '📭', title = 'Rien ici', subtitle }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  icon: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
