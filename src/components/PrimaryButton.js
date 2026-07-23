import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { colors } from '../theme/colors';

/** Bouton principal (variantes : primary, success, danger, outline). */
export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) {
  const bg = {
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
    outline: 'transparent',
  }[variant];

  const styles = useThemedStyles(c => ({
    button: {
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: c.primary,
    },
    text: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bg, borderWidth: variant === 'outline' ? 1 : 0 },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, variant === 'outline' && { color: colors.primary }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

