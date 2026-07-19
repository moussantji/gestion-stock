import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors, ROLE_LABELS } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';

const ROLE_COLORS = { admin: colors.danger, manager: colors.warning, employee: colors.info };

export default function UsersScreen() {
  const { user: me } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'employee', shop_id: null });
  const [shops, setShops] = useState([]); // 🏬 multi-boutiques
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchData = async () => {
    setError(null);
    try {
      const [uRes, sRes] = await Promise.all([
        api.get('/users'),
        api.get('/shops').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(uRes.data.data);
      setShops((sRes.data.data ?? []).filter((s) => s.is_active));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [])
  );

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', confirm: '', role: 'employee', shop_id: null });
    setFormError(null);
    setModal(true);
  };

  const saveForm = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError(t('usr_fill'));
      return;
    }
    if (form.password !== form.confirm) {
      setFormError(t('usr_mismatch'));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirmation: form.confirm,
        role: form.role,
        shop_id: form.shop_id, // 🏬 boutique de rattachement (null = siège)
      });
      setModal(false);
      fetchData();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (user) => {
    Alert.alert(t('delete'), t('usr_delete', { name: user.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/users/${user.id}`);
            fetchData();
          } catch (e) {
            Alert.alert(t('impossible'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          ListEmptyComponent={<EmptyState ionicon="people-outline" title={t('usr_none')} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                  {item.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.name} {item.id === me?.id ? t('usr_me') : ''}
                </Text>
                <Text style={styles.meta}>{item.email}</Text>
                {item.shop?.name ? <Text style={styles.meta}>🏬 {item.shop.name}</Text> : null}
                <Text style={styles.meta}>{item.movements_count ?? 0} {t('usr_movements')}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[item.role] ?? colors.muted) + '1F' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] ?? colors.muted }]}>
                  {ROLE_LABELS[item.role] ?? item.role}
                </Text>
              </View>
              {item.id !== me?.id ? (
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} style={{ marginLeft: 10 }}>
                  <Text style={{ fontSize: 17 }}>🗑</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t('usr_new')}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Field label={t('usr_name')} placeholder={t('usr_name_ph')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
              <Field label={t('usr_email')} placeholder="utilisateur@stock.com" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
              <Field label={t('usr_pwd')} placeholder="••••••••" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
              <Field label={t('usr_confirm')} placeholder="••••••••" secureTextEntry value={form.confirm} onChangeText={(v) => setForm({ ...form, confirm: v })} />

              <Text style={styles.roleLabel}>{t('usr_role')}</Text>
              <View style={styles.rolesRow}>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.roleChip, form.role === key && { backgroundColor: ROLE_COLORS[key], borderColor: ROLE_COLORS[key] }]}
                    onPress={() => setForm({ ...form, role: key })}
                  >
                    <Text style={[styles.roleChipText, form.role === key && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {shops.length > 0 ? (
                <>
                  <Text style={styles.roleLabel}>🏬 {t('usr_shop')}</Text>
                  <View style={styles.rolesRow}>
                    <TouchableOpacity
                      style={[styles.roleChip, form.shop_id === null && { backgroundColor: colors.info, borderColor: colors.info }]}
                      onPress={() => setForm({ ...form, shop_id: null })}
                    >
                      <Text style={[styles.roleChipText, form.shop_id === null && { color: '#fff' }]}>—</Text>
                    </TouchableOpacity>
                    {shops.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.roleChip, form.shop_id === s.id && { backgroundColor: colors.info, borderColor: colors.info }]}
                        onPress={() => setForm({ ...form, shop_id: s.id })}
                      >
                        <Text style={[styles.roleChipText, form.shop_id === s.id && { color: '#fff' }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <PrimaryButton title={t('usr_create')} onPress={saveForm} loading={saving} style={{ marginTop: 16 }} />
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 14 },
  formError: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  roleLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  rolesRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 8,
  },
  roleChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
