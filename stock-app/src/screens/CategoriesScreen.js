import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';

export default function CategoriesScreen() {
  const { hasRole } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchData = async () => {
    setError(null);
    try {
      const res = await api.get('/categories');
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
    setName('');
    setDescription('');
    setFormError(null);
    setModal(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setFormError(null);
    setModal(true);
  };

  const saveForm = async () => {
    if (!name.trim()) {
      setFormError(t('required_name'));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, { name: name.trim(), description: description.trim() || null });
      } else {
        await api.post('/categories', { name: name.trim(), description: description.trim() || null });
      }
      setModal(false);
      fetchData();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category) => {
    Alert.alert(t('delete'), t('cat_delete', { name: category.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/categories/${category.id}`);
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
          ListEmptyComponent={<EmptyState ionicon="pricetags-outline" title={t('cat_none')} subtitle={t('cat_none_sub')} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.iconWrap}><Ionicons name="pricetags" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.products_count ?? 0} {t('cat_products')}</Text>
              </View>
              {hasRole('admin', 'manager') && (item.products_count ?? 0) === 0 ? (
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <Text style={styles.sheetTitle}>{editing ? t('cat_edit') : t('cat_new')}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Field label={t('cat_name')} placeholder={t('cat_name_ph')} value={name} onChangeText={setName} autoFocus />
              <Field label={t('cat_desc')} placeholder="…" value={description} onChangeText={setDescription} />
              <PrimaryButton title={t('save')} onPress={saveForm} loading={saving} />
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
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
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
