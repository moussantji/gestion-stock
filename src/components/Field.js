import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { colors } from '../theme/colors';

/** Champ de formulaire avec label. */
export default function Field({ label, style, ...inputProps }) {
  const styles = useThemedStyles(c => ({
    wrapper: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 6 },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
    },
  }));

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        {...inputProps}
      />
    </View>
  );
}

