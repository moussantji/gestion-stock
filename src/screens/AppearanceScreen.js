import React from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import Icon from '../components/Icon';
import { useThemedStyles } from '../hooks/useThemedStyles';

const SWATCHES = [
  ['primary', 'Principale'],
  ['accent', 'Accent'],
  ['success', 'Succès'],
  ['warning', 'Alerte'],
  ['danger', 'Erreur'],
  ['card', 'Cartes'],
];

export default function AppearanceScreen() {
  const { theme, palettes, setPalette, savePaletteToServer, resetPalette } = useTheme();
  const [saving, setSaving] = React.useState(false);
  const [custom, setCustom] = React.useState({
    primary: theme.primary,
    accent: theme.accent,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
  });

  const isHex = (value) => /^#[0-9A-Fa-f]{6}$/.test(value);
  const updateCustom = (key, value) => setCustom((current) => ({ ...current, [key]: value.toUpperCase() }));
  const applyCustom = () => {
    const invalid = Object.entries(custom).find(([, value]) => !isHex(value));
    if (invalid) {
      Alert.alert('Couleur invalide', 'Utilisez le format #RRGGBB, par exemple #E56B8C.');
      return;
    }
    setPalette(theme.id, custom);
  };

  const save = async () => {
    setSaving(true);
    try {
      await savePaletteToServer();
      Alert.alert('Apparence enregistrée', 'La palette est maintenant synchronisée avec l\'entreprise.');
    } catch (e) {
      Alert.alert('Enregistrement local', 'La palette est conservée sur cet appareil. La synchronisation serveur sera réessayée plus tard.');
    } finally {
      setSaving(false);
    }
  };

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    eyebrow: { color: c.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: c.text, fontSize: 24, fontWeight: '900', marginTop: 6 },
    subtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
    preview: { backgroundColor: c.card, borderRadius: 20, padding: 16, marginTop: 22, borderWidth: 1, borderColor: c.border },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewLabel: { color: c.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    previewTitle: { color: c.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
    previewDot: { width: 12, height: 12, borderRadius: 6 },
    metricRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    metric: { flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, padding: 12 },
    metricLabel: { color: c.muted, fontSize: 11 },
    metricValue: { color: c.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
    miniChart: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 8, paddingTop: 12 },
    chartBar: { flex: 1, borderRadius: 6, opacity: 0.9 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '900', marginTop: 26, marginBottom: 10 },
    paletteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
    paletteSelected: { borderColor: c.primary, backgroundColor: c.primaryBg },
    paletteName: { color: c.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
    swatches: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    swatchWrap: { alignItems: 'center' },
    swatch: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    swatchLabel: { color: c.muted, fontSize: 8, marginTop: 3 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.border, marginLeft: 10, alignItems: 'center', justifyContent: 'center' },
    reset: { alignItems: 'center', paddingVertical: 16 },
    customCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 },
    colorField: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    colorPreview: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: c.border },
    colorLabel: { flex: 1, color: c.text, fontSize: 13, fontWeight: '700', marginLeft: 10 },
    colorInput: { width: 94, color: c.text, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, fontSize: 12, fontWeight: '800' },
    applyButton: { backgroundColor: c.primaryBg, borderRadius: 10, borderWidth: 1, borderColor: c.primary, alignItems: 'center', paddingVertical: 10, marginTop: 2 },
    applyText: { color: c.primary, fontSize: 13, fontWeight: '900' },
    saveButton: { backgroundColor: c.primary, borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 12 },
    saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    resetText: { color: c.primary, fontSize: 13, fontWeight: '800' },
  }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>IDENTITÉ VISUELLE</Text>
      <Text style={styles.title}>Apparence de l'application</Text>
      <Text style={styles.subtitle}>
        Choisissez une palette. Le changement est enregistré sur cet appareil et sera synchronisé avec l'entreprise lorsque la configuration serveur sera active.
      </Text>

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.previewLabel}>APERÇU</Text>
            <Text style={styles.previewTitle}>Dashboard</Text>
          </View>
          <View style={[styles.previewDot, { backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Ventes</Text><Text style={styles.metricValue}>245 000 F</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Produits</Text><Text style={[styles.metricValue, { color: theme.accent }]}>128</Text></View>
        </View>
        <View style={styles.miniChart}>
          {[38, 60, 45, 76, 58, 88, 68].map((h, i) => <View key={i} style={[styles.chartBar, { height: h, backgroundColor: i === 5 ? theme.accent : theme.primary }]} />)}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Palettes prédéfinies</Text>
      {Object.values(palettes).map((palette) => {
        const selected = palette.id === theme.id;
        return (
          <TouchableOpacity key={palette.id} style={[styles.paletteCard, selected && styles.paletteSelected]} onPress={() => {
              setPalette(palette.id);
              setCustom({ primary: palette.primary, accent: palette.accent, success: palette.success, warning: palette.warning, danger: palette.danger });
            }} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.paletteName}>{palette.name}</Text>
              <View style={styles.swatches}>{SWATCHES.map(([key, label]) => <View key={key} style={styles.swatchWrap}><View style={[styles.swatch, { backgroundColor: palette[key] }]} /><Text style={styles.swatchLabel}>{label}</Text></View>)}</View>
            </View>
            <View style={[styles.radio, selected && { backgroundColor: palette.primary, borderColor: palette.primary }]}>{selected ? <Icon name="success" size={14} color="#fff" /> : null}</View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.sectionTitle}>Personnaliser les couleurs</Text>
      <View style={styles.customCard}>
        {[
          ['primary', 'Principale'],
          ['accent', 'Accent'],
          ['success', 'Succès'],
          ['warning', 'Avertissement'],
          ['danger', 'Erreur'],
        ].map(([key, label]) => (
          <View key={key} style={styles.colorField}>
            <View style={[styles.colorPreview, { backgroundColor: custom[key] }]} />
            <Text style={styles.colorLabel}>{label}</Text>
            <TextInput
              value={custom[key]}
              onChangeText={(value) => updateCustom(key, value)}
              autoCapitalize="characters"
              maxLength={7}
              placeholder="#RRGGBB"
              placeholderTextColor={colors.muted}
              style={styles.colorInput}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.applyButton} onPress={applyCustom} activeOpacity={0.85}>
          <Text style={styles.applyText}>Appliquer l'aperçu</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer pour l'entreprise</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.reset} onPress={resetPalette} activeOpacity={0.8}>
        <Text style={styles.resetText}>Réinitialiser la palette par défaut</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
