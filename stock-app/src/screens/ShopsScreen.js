import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';

/**
 * 🏬 Boutiques (multi-boutiques v12) — réservé admin.
 * Boutique = rattachement de l'équipe, des ventes, clients, caisse & mouvements.
 * ⚠️ Le stock reste GLOBAL en v12 (stock par boutique + transferts = v13).
 */
export default function ShopsScreen() {
  const { t } = useLocale();
  const { hasRole } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); // boutique en édition ou null (création)
  const [form, setForm] = useState({ name: '', phone: '', address: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/shops');
      setItems(res.data.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (hasRole('admin')) fetchData(true);
      else setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', address: '', is_active: true });
    setFormError(null);
    setModal(true);
  };

  const openEdit = (shop) => {
    setEditing(shop);
    setForm({
      name: shop.name ?? '',
      phone: shop.phone ?? '',
      address: shop.address ?? '',
      is_active: !!shop.is_active,
    });
    setFormError(null);
    setModal(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) {
      setFormError(t('sh_name_required'));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        ...(editing ? { is_active: form.is_active } : {}),
      };
      if (editing) {
        await api.put(`/shops/${editing.id}`, payload);
      } else {
        await api.post('/shops', payload);
      }
      setModal(false);
      Alert.alert('🏬', t('sh_saved'));
      fetchData();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (shop) => {
    Alert.alert(t('sh_del_title'), t('sh_del_msg', { name: shop.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/shops/${shop.id}`);
            fetchData();
          } catch (e) {
            Alert.alert(t('impossible'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (!hasRole('admin')) {
    return (
      <View style={styles.container}>
        <EmptyState ionicon="lock-closed-outline" title={t('prof_admin_only')} />
      </View>
    );
  }

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={<Text style={styles.disclaimer}>ℹ️ {t('sh_stock_note')}</Text>}
          ListEmptyComponent={<EmptyState ionicon="storefront-outline" title={t('sh_empty')} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openEdit(item)}>
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 20 }}>🏬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone ? <Text style={styles.meta}>📞 {item.phone}</Text> : null}
                {item.address ? <Text style={styles.meta}>📍 {item.address}</Text> : null}
                <Text style={styles.meta}>👥 {t('sh_users_cnt', { count: item.users_count ?? 0 })}</Text>
              </View>
              <View
                style={[
                  styles.stateBadge,
                  { backgroundColor: (item.is_active ? colors.success : colors.muted) + '1F' },
                ]}
              >
                <Text
                  style={[
                    styles.stateText,
                    { color: item.is_active ? colors.success : colors.muted },
                  ]}
                >
                  {item.is_active ? t('sh_active') : t('sh_inactive')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 17 }}>🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
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
              <Text style={styles.sheetTitle}>{editing ? `🏬 ${editing.name}` : t('sh_new')}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Field label={t('sh_name')} placeholder={t('sh_name_ph')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
              <Field label={t('sh_phone')} placeholder="+223 …" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
              <Field label={t('sh_address')} placeholder={t('sh_address_ph')} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />

              {editing ? (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('sh_active')}</Text>
                  <Switch
                    value={form.is_active}
                    onValueChange={(v) => setForm({ ...form, is_active: v })}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor="#fff"
                  />
                </View>
              ) : null}

              <PrimaryButton title={t('save')} onPress={saveForm} loading={saving} style={{ marginTop: 14 }} />
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  disclaimer: { fontSize: 12, color: colors.info, marginBottom: 12, lineHeight: 17 },
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
  iconBox: {
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
  stateBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  stateText: { fontSize: 11, fontWeight: '800' },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
