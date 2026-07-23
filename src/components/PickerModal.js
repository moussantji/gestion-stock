import React from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { colors } from '../theme/colors';

/**
 * Sélecteur simple (remplace un Picker) : liste dans une modale.
 * options: [{ label, value }]
 */
export default function PickerModal({ visible, title, options, value, onSelect, onClose }) {
  const styles = useThemedStyles(c => ({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
    sheet: { backgroundColor: c.card, borderRadius: 16, padding: 16 },
    title: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 8 },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    optionSelected: { backgroundColor: '#EFF6FF' },
    optionText: { fontSize: 15, color: c.text },
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item, i) => String(item.value ?? 'none') + i}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <TouchableOpacity
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.optionText, selected && { color: colors.primary, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {selected ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

