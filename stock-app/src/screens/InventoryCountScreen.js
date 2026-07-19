import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import EmptyState from '../components/EmptyState';

/**
 * 🔄 Comptage d'un inventaire :
 * scan continu (mode « inventory » du Scanner) ou steppers − / +,
 * puis validation → les écarts deviennent des mouvements « Inventaire ».
 */
export default function InventoryCountScreen({ route, navigation }) {
  const { t } = useLocale();
  const { inventoryId, reference } = route.params;

  const [inventory, setInventory] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [busyIds, setBusyIds] = useState([]); // lignes en cours d'enregistrement
  const [finishing, setFinishing] = useState(false);

  const isOpen = inventory?.status === 'in_progress';

  const load = async () => {
    setError(null);
    try {
      const res = await api.get(`/inventories/${inventoryId}`);
      setInventory(res.data?.inventory ?? null);
      setItems(res.data?.items ?? []);
      setSummary(res.data?.summary ?? null);
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
    }, [inventoryId])
  );

  // ---------- Comptage manuel (mode 'set', optimiste) ----------
  const setCount = async (item, newQty) => {
    if (!isOpen) return;
    const qty = Math.max(0, newQty);
    const previous = item.counted_quantity;

    // Optimiste : ligne + résumé recalculés localement
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, counted_quantity: qty } : i))
    );
    setSummary((s) => {
      if (!s) return s;
      const wasCounted = previous !== null;
      const oldDiff = wasCounted ? previous - item.expected_quantity : 0;
      const newDiff = qty - item.expected_quantity;
      const hadDiscrepancy = wasCounted && oldDiff !== 0;
      const hasDiscrepancy = newDiff !== 0;
      return {
        ...s,
        counted_lines: s.counted_lines + (wasCounted ? 0 : 1),
        discrepancies:
          s.discrepancies + (hasDiscrepancy ? 1 : 0) - (hadDiscrepancy ? 1 : 0),
        total_delta: s.total_delta - oldDiff + newDiff,
      };
    });

    setBusyIds((prev) => [...prev, item.id]);
    try {
      await api.post(`/inventories/${inventoryId}/count`, {
        product_id: item.product_id,
        quantity: qty,
        mode: 'set',
      });
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
      load(); // re-sync avec le serveur
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  // ---------- Validation ----------
  const confirmFinish = () => {
    const discrepancies = summary?.discrepancies ?? 0;
    Alert.alert(
      t('inv_validate'),
      t('inv_validate_msg', { count: discrepancies }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('inv_validate_btn'),
          onPress: async () => {
            setFinishing(true);
            try {
              const res = await api.post(`/inventories/${inventoryId}/finish`);
              const s = res.data?.summary ?? { adjusted: 0, delta: 0 };
              Alert.alert(
                t('inv_done'),
                t('inv_done_msg', {
                  adjusted: s.adjusted,
                  delta: s.delta > 0 ? `+${s.delta}` : String(s.delta),
                }),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (e) {
              Alert.alert('⚠️', getErrorMessage(e));
            } finally {
              setFinishing(false);
            }
          },
        },
      ]
    );
  };

  // ---------- Rendu d'une ligne ----------
  const renderItem = ({ item }) => {
    const counted = item.counted_quantity;
    const diff = counted === null ? null : counted - item.expected_quantity;
    const busy = busyIds.includes(item.id);

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.product?.name ?? t('product_deleted')}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.product?.sku}
            {item.product?.barcode ? ` · ${item.product.barcode}` : ''} · {t('inv_expected')} : {item.expected_quantity}
          </Text>
        </View>

        {counted === null ? (
          <Text style={styles.pendingText}>{t('inv_not_counted_yet')}</Text>
        ) : (
          <View
            style={[
              styles.diffChip,
              diff === 0
                ? styles.diffZero
                : diff > 0
                  ? styles.diffPlus
                  : styles.diffMinus,
            ]}
          >
            <Text
              style={[
                styles.diffText,
                { color: diff === 0 ? colors.muted : diff > 0 ? colors.info : colors.danger },
              ]}
            >
              {diff === 0 ? '✔' : diff > 0 ? `+${diff}` : diff}
            </Text>
          </View>
        )}

        {isOpen ? (
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setCount(item, (counted ?? 0) - 1)}
              disabled={busy}
            >
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepQty}>
              {busy ? '…' : counted ?? 0}
            </Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setCount(item, (counted ?? 0) + 1)}
              disabled={busy}
            >
              <Text style={styles.stepText}>＋</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.countedStatic}>{counted ?? '—'}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ---------- Résumé ---------- */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.refText}>{reference}</Text>
          <Text style={styles.progressText}>
            {t('inv_progress', {
              counted: summary?.counted_lines ?? 0,
              total: summary?.lines_count ?? items.length,
            })}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(
                    2,
                    ((summary?.counted_lines ?? 0) / Math.max(1, summary?.lines_count ?? 1)) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.meta}>{t('inv_diff')}</Text>
          <Text
            style={[
              styles.deltaValue,
              { color: (summary?.total_delta ?? 0) === 0 ? colors.success : colors.danger },
            ]}
          >
            {(summary?.total_delta ?? 0) > 0 ? `+${summary.total_delta}` : summary?.total_delta ?? 0}
          </Text>
        </View>
      </View>

      {/* ---------- Actions ---------- */}
      {isOpen ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}
            onPress={() =>
              navigation.navigate('Scanner', { mode: 'inventory', inventoryId, inventoryRef: reference })
            }
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('inv_scan_btn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}
            onPress={confirmFinish}
            disabled={finishing}
          >
            {finishing ? (
              <ActivityIndicator color={colors.success} />
            ) : (
              <Text style={[styles.actionText, { color: colors.success }]}>{t('inv_validate')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBanner}>
          <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12.5 }}>
            {t('inv_validated')} · {t('inv_done_msg', {
              adjusted: summary?.discrepancies ?? 0,
              delta: (summary?.total_delta ?? 0) > 0 ? `+${summary.total_delta}` : String(summary?.total_delta ?? 0),
            })}
          </Text>
        </View>
      )}

      {/* ---------- Recherche ---------- */}
      <TextInput
        style={styles.search}
        placeholder={t('inv_search_ph')}
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ---------- Lignes ---------- */}
      <FlatList
        data={items.filter((i) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const p = i.product ?? {};
          return (
            (p.name ?? '').toLowerCase().includes(q) ||
            (p.sku ?? '').toLowerCase().includes(q) ||
            (p.barcode ?? '').toLowerCase().includes(q)
          );
        })}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 60 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState ionicon="clipboard-outline" title={t('inv_no_lines')} subtitle={t('inv_no_lines_sub')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    margin: 16,
    marginBottom: 8,
  },
  refText: { fontSize: 12.5, fontWeight: '800', color: colors.accent, fontFamily: 'monospace' },
  progressText: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  meta: { fontSize: 11, color: colors.muted },
  deltaValue: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionText: { fontWeight: '900', fontSize: 13.5 },
  closedBanner: {
    backgroundColor: colors.successBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  search: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    marginHorizontal: 16,
  },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  pendingText: { fontSize: 13, color: colors.muted, fontWeight: '700', marginLeft: 8 },
  diffChip: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  diffZero: { backgroundColor: colors.border },
  diffPlus: { backgroundColor: colors.infoBg },
  diffMinus: { backgroundColor: colors.dangerBg },
  diffText: { fontSize: 12.5, fontWeight: '900' },
  stepper: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: { fontSize: 16, color: colors.text, fontWeight: '800' },
  stepQty: { width: 34, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
  countedStatic: { fontSize: 15, fontWeight: '900', color: colors.text, marginLeft: 10 },
});
