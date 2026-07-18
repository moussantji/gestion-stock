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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { formatDateTime } from '../utils/format';
import { cycleList } from '../utils/promo'; // 📦 v22 (v2.11)
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';

/** 🔄 Liste des inventaires physiques + création (admin/manager). */
export default function InventoriesScreen({ navigation }) {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  // 📦 v22 : comptage tournant (n depuis /shop additif ; 0/absent = carte masquée)
  const [cycleN, setCycleN] = useState(0);
  const [cycleItems, setCycleItems] = useState([]);
  const [cycleCreating, setCycleCreating] = useState(false);

  const canManage = hasRole('admin', 'manager');

  const load = async () => {
    setError(null);
    try {
      const res = await api.get('/inventories');
      setItems(res.data?.data ?? []);
      // 📦 v22 : comptage tournant — réglage + catalogue (non bloquant, vieux serveur → carte masquée)
      try {
        const shopRes = await api.get('/shop');
        const n = Math.max(0, parseInt(shopRes.data?.data?.cycle_count_daily ?? shopRes.data?.cycle_count_daily, 10) || 0);
        setCycleN(n);
        if (n > 0) {
          const prodRes = await api.get('/products?all=1').catch(() => ({ data: { data: [] } }));
          setCycleItems(prodRes.data?.data ?? []);
        } else {
          setCycleItems([]);
        }
      } catch {
        setCycleN(0);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 📦 v22 : crée l'inventaire du jour (sous-ensemble additif product_ids — absent = tout le catalogue)
  const createCycle = async () => {
    const todays = cycleList(cycleItems, cycleN);
    if (!todays.length) return;
    setCycleCreating(true);
    try {
      const res = await api.post('/inventories', {
        name: `${t('cc_name')} · ${new Date().toISOString().slice(0, 10)}`,
        product_ids: todays.map((p) => p.id),
      });
      const inv = res.data?.data ?? null;
      if (inv?.id) {
        navigation.navigate('InventoryCount', { inventoryId: inv.id, reference: inv.reference });
      } else {
        load();
      }
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setCycleCreating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const create = async () => {
    setCreating(true);
    try {
      await api.post('/inventories', { name: name.trim() || null });
      setCreateOpen(false);
      setName('');
      setLoading(true);
      load();
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (inventory) => {
    if (!canManage || inventory.status !== 'in_progress') return;
    Alert.alert(
      t('inv_delete'),
      t('inv_delete_msg', { name: inventory.name ?? inventory.reference }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventories/${inventory.id}`);
              load();
            } catch (e) {
              Alert.alert('⚠️', getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const open = item.status === 'in_progress';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('InventoryCount', {
            inventoryId: item.id,
            reference: item.reference,
          })
        }
        onLongPress={() => confirmDelete(item)}
      >
        <View style={[styles.iconBadge, { backgroundColor: open ? colors.warningBg : colors.successBg }]}>
          <Text style={{ fontSize: 18 }}>{open ? '🔄' : '✅'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name ?? item.reference}
          </Text>
          <Text style={styles.meta}>{item.reference}</Text>
          <Text style={styles.meta}>
            {open ? formatDateTime(item.created_at) : formatDateTime(item.validated_at ?? item.created_at)}
            {item.user?.name ? ` · ${item.user.name}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.statusChip, open ? styles.statusOpen : styles.statusDone]}>
            <Text style={[styles.statusText, { color: open ? colors.warning : colors.success }]}>
              {open ? t('inv_in_progress') : t('inv_validated')}
            </Text>
          </View>
          <Text style={styles.progress}>
            {t('inv_progress', { counted: item.counted_lines ?? 0, total: item.lines_count ?? 0 })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="📋" title={t('inv_empty')} subtitle={t('inv_empty_sub')} />
          }
          ListHeaderComponent={
            canManage && items.length > 0 ? (
              <Text style={styles.hint}>{t('inv_delete_hint')}</Text>
            ) : null
          }
        />
      )}

      {/* 📦 v22 : carte « Comptage du jour » (rotation déterministe shared avec le PC) */}
      {canManage && cycleN > 0 ? (() => {
        const todays = cycleList(cycleItems, cycleN);
        return (
          <View style={styles.cycleCard}>
            <Text style={styles.cycleTitle}>📦 {t('cc_title')}</Text>
            {todays.length === 0 ? (
              <Text style={styles.cycleHint}>{t('cc_empty')}</Text>
            ) : (
              <>
                <Text style={styles.cycleHint}>{t('cc_hint', { n: todays.length })}</Text>
                <View style={styles.cycleRow}>
                  {todays.slice(0, 8).map((p) => (
                    <View key={p.id} style={styles.cycleChip}>
                      <Text style={styles.cycleChipText} numberOfLines={1}>{p.name} · {p.quantity ?? 0}</Text>
                    </View>
                  ))}
                  {todays.length > 8 ? <Text style={styles.cycleHint}>+{todays.length - 8}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.submit, cycleCreating && { opacity: 0.6 }]}
                  onPress={createCycle}
                  disabled={cycleCreating}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitText}>{cycleCreating ? '…' : `✏️ ${t('cc_start')}`}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })() : null}

      {/* FAB */}
      {canManage ? (
        <TouchableOpacity style={styles.fab} onPress={() => setCreateOpen(true)}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modale création */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCreateOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('inv_new')}</Text>
            <Field
              label={t('inv_name')}
              placeholder={t('inv_name_ph')}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.sheetHint}>{t('inv_snapshot_hint')}</Text>
            <TouchableOpacity
              style={[styles.submit, creating && { opacity: 0.6 }]}
              onPress={create}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('inv_create')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hint: { fontSize: 11, color: colors.muted, marginBottom: 8 },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
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
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  statusChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  statusOpen: { backgroundColor: colors.warningBg },
  statusDone: { backgroundColor: colors.successBg },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  progress: { fontSize: 10.5, color: colors.muted, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 26, color: '#fff', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(3,6,18,0.65)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgAlt,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  sheetHint: { fontSize: 11.5, color: colors.muted, marginTop: 2, marginBottom: 4 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  // 📦 v22 : comptage tournant
  cycleCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.accent },
  cycleTitle: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 4 },
  cycleHint: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  cycleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  cycleChip: { backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '48%' },
  cycleChipText: { color: colors.text, fontSize: 11 },
});
