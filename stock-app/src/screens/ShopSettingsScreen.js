import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';

/**
 * 🎯 Réglages boutique : seuils configurables (segments clients,
 * rappels de crédit push, 🎁 fidélité). Réservé admin/manager.
 */
export default function ShopSettingsScreen() {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  const FIELDS = [
    { key: 'segment_loyal_min', icon: '🏆', label: t('set_loyal'), hint: t('set_loyal_hint') },
    { key: 'segment_inactive_days', icon: '💤', label: t('set_inactive'), hint: t('set_inactive_hint') },
    { key: 'credit_reminder_days', icon: '📅', label: t('set_reminder'), hint: t('set_reminder_hint') },
    { key: 'loyalty_earn_per', icon: '🎁', label: t('set_loyalty_earn'), hint: t('set_loyalty_earn_hint') },
    { key: 'loyalty_point_value', icon: '💝', label: t('set_loyalty_value'), hint: t('set_loyalty_value_hint') },
  ];

  const [values, setValues] = useState({}); // { key: '5' }
  const [meta, setMeta] = useState({}); // { key: {min,max} }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await api.get('/settings');
      const data = res.data?.data ?? {};
      const v = {};
      const m = {};
      Object.entries(data).forEach(([key, conf]) => {
        v[key] = String(conf.value ?? '');
        m[key] = { min: conf.min, max: conf.max };
      });
      setValues(v);
      setMeta(m);
      setDirty(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const change = (key, text) => {
    setValues((prev) => ({ ...prev, [key]: text.replace(/[^0-9]/g, '') }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      FIELDS.forEach(({ key }) => {
        if (values[key] !== undefined && values[key] !== '') {
          payload[key] = parseInt(values[key], 10);
        }
      });
      await api.put('/settings', payload);
      setDirty(false);
      Alert.alert('✅', t('set_saved'));
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole('admin', 'manager')) {
    return (
      <View style={[styles.container, styles.center]}>
        <EmptyState ionicon="lock-closed-outline" title={t('set_forbidden')} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>{t('set_intro')}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {FIELDS.map(({ key, icon, label, hint }) => (
        <View key={key} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{icon} {label}</Text>
            <Text style={styles.hint}>{hint}</Text>
            {meta[key] ? (
              <Text style={styles.range}>{meta[key].min} – {meta[key].max}</Text>
            ) : null}
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={values[key] ?? ''}
            onChangeText={(text) => change(key, text)}
            maxLength={4}
          />
        </View>
      ))}

      <PrimaryButton
        title={t('save')}
        onPress={save}
        loading={saving}
        disabled={!dirty}
        style={{ marginTop: 8, opacity: dirty ? 1 : 0.5 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  intro: { color: colors.muted, fontSize: 12.5, marginBottom: 14, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 16.5 },
  range: { color: colors.muted, fontSize: 10.5, marginTop: 4, fontWeight: '600' },
  input: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: 74,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    paddingVertical: 8,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: { color: colors.danger, fontSize: 12.5, fontWeight: '600' },
});
