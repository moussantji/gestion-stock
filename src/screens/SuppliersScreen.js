import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';

export default function SuppliersScreen() {
  const { hasRole } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 13,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    name: { fontSize: 15, fontWeight: '700', color: c.text },
    meta: { fontSize: 12, color: c.muted, marginTop: 2 },
    callBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.successBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 100,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
    },
    fabText: { color: '#fff', fontSize: 28, marginTop: -2 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 34,
    },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 14 },
    formError: { color: c.danger, fontSize: 13, marginBottom: 10 },
    errorBox: { margin: 16, backgroundColor: c.dangerBg, borderRadius: 12, padding: 14 },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
  }));

  const fetchData = async () => {
    setError(null);
    try {
      const res = await api.get('/suppliers');
      setItems(res.data.data);
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
    setEditing(null);
    setForm({ name: '', email: '', phone: '', address: '' });
    setFormError(null);
    setModal(true);
  };

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
    });
    setFormError(null);
    setModal(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) {
      setFormError(t('required_name'));
      return;
    }
    setFormError(null);
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }
      setModal(false);
      fetchData();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (supplier) => {
    Alert.alert(t('delete'), t('sup_delete', { name: supplier.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/suppliers/${supplier.id}`);
            fetchData();
          } catch (e) {
            Alert.alert(t('impossible'), getErrorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
          ListEmptyComponent={<EmptyState icon="🚚" title={t('sup_none')} subtitle={t('sup_none_sub')} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.iconWrap}><Text style={{ fontSize: 18 }}>🚚</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.products_count ?? 0} {t('sup_products')}
                  {item.address ? ` · ${item.address}` : ''}
                </Text>
              </View>
              {item.phone ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone.replace(/\s/g, '')}`)}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 16 }}>📞</Text>
                </TouchableOpacity>
              ) : null}
              {hasRole('admin', 'manager') && (item.products_count ?? 0) === 0 ? (
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 17 }}>🗑</Text>
                </TouchableOpacity>
              ) : null}
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
              <Text style={styles.sheetTitle}>{editing ? t('sup_edit') : t('sup_new')}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Field label={t('sup_name')} placeholder={t('sup_name_ph')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoFocus />
              <Field label={t('sup_phone')} placeholder={t('sup_phone_ph')} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
              <Field label={t('login_email')} placeholder={t('sup_email_ph')} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
              <Field label={t('sup_address')} placeholder={t('sup_address_ph')} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
              <PrimaryButton title={t('save')} onPress={saveForm} loading={saving} />
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


