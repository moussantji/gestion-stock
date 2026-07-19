import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { formatDateTime } from '../utils/format';
import Field from '../components/Field';
import EmptyState from '../components/EmptyState';
import PickerModal from '../components/PickerModal';
import PrimaryButton from '../components/PrimaryButton';

/**
 * 🔁 Transferts de stock inter-boutiques (v13) — admin/manager.
 * Siège (dépôt central) ⇆ boutiques, ou boutique ⇆ boutique.
 * Exécution immédiate côté serveur : paire de mouvements traçables,
 * bucket source décrémenté, bucket destination incrémenté.
 */
export default function TransfersScreen() {
  const { t } = useLocale();
  const { hasRole } = useAuth();

  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // --- Modale création ---
  const [modal, setModal] = useState(false);
  const [fromShop, setFromShop] = useState(null); // null = siège
  const [toShop, setToShop] = useState(null);
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([]); // {product_id, name, quantity, max}
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickFrom, setPickFrom] = useState(false);
  const [pickTo, setPickTo] = useState(false);
  const [busyId, setBusyId] = useState(null); // 🚚 réception/annulation en cours

  const allowed = hasRole('admin', 'manager');
  const { user } = useAuth();

  // 🚚 v14 : qui peut valider la réception ? admin, ou manager DE LA DESTINATION
  const canReceive = (item) => {
    if (item.status !== 'in_transit') return false;
    return hasRole('admin') || (hasRole('manager') && user?.shop_id === item.to_shop_id);
  };

  // 🚚 v14 : qui peut annuler ? admin, ou manager DE LA SOURCE
  const canCancel = (item) => {
    if (item.status !== 'in_transit') return false;
    return hasRole('admin') || (hasRole('manager') && user?.shop_id === item.from_shop_id);
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'received':
        return { label: t('tr_status_received'), color: colors.success };
      case 'cancelled':
        return { label: t('tr_status_cancelled'), color: colors.muted };
      default:
        return { label: t('tr_status_in_transit'), color: colors.warning };
    }
  };

  const doReceive = (item) => {
    Alert.alert(t('tr_receive'), t('tr_receive_msg', { ref: item.reference, place: item.to_name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('tr_receive'),
        onPress: async () => {
          setBusyId(item.id);
          try {
            const res = await api.post(`/transfers/${item.id}/receive`);
            Alert.alert('✓', res.data.message ?? t('tr_received_done'));
            fetchData();
          } catch (e) {
            Alert.alert(t('impossible'), getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const doCancel = (item) => {
    Alert.alert(t('tr_cancel_title'), t('tr_cancel_msg', { ref: item.reference }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('tr_cancel_yes'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            const res = await api.post(`/transfers/${item.id}/cancel`);
            Alert.alert('↩️', res.data.message ?? t('tr_cancel_done'));
            fetchData();
          } catch (e) {
            Alert.alert(t('impossible'), getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [tRes, sRes, pRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/shops').catch(() => ({ data: { data: [] } })),
        api.get('/products', { params: { all: 1, sort: 'name' } }).catch(() => ({ data: { data: [] } })),
      ]);
      setItems(tRes.data.data ?? []);
      setShops(sRes.data.data ?? []);
      setProducts(pRes.data.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (allowed) fetchData(true);
      else setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Options emplacements : siège + boutiques actives
  const placeOptions = useMemo(() => {
    const opts = [{ label: `🏠 ${t('tr_hq')}`, value: null }];
    shops.filter((s) => s.is_active).forEach((s) => opts.push({ label: `🏬 ${s.name}`, value: s.id }));
    return opts;
  }, [shops, t]);

  const placeName = (id) => {
    if (id === null) return t('tr_hq');
    return shops.find((s) => s.id === id)?.name ?? `#${id}`;
  };

  const openCreate = () => {
    setFromShop(null);
    setToShop(shops.filter((s) => s.is_active)[0]?.id ?? null);
    setNote('');
    setLines([]);
    setSearch('');
    setModal(true);
  };

  const addLine = (product) => {
    if (lines.find((l) => l.product_id === product.id)) return;
    const max = fromShop === null ? product.quantity ?? 0 : product.shop_stock ?? 0;
    if (max <= 0) {
      Alert.alert(t('impossible'), t('tr_none_at_source', { name: product.name, place: placeName(fromShop) }));
      return;
    }
    setLines((prev) => [...prev, { product_id: product.id, name: product.name, quantity: 1, max }]);
    setSearch('');
  };

  const stepLine = (productId, delta) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product_id === productId
            ? { ...l, quantity: Math.min(l.max, Math.max(0, l.quantity + delta)) }
            : l
        )
        .filter((l) => l.quantity > 0) // 0 = retire la ligne
    );
  };

  const submit = async () => {
    if (fromShop === toShop) {
      Alert.alert(t('impossible'), t('tr_same_place'));
      return;
    }
    if (lines.length === 0) {
      Alert.alert(t('impossible'), t('tr_no_lines'));
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/transfers', {
        from_shop_id: fromShop,
        to_shop_id: toShop,
        note: note.trim() || null,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      });
      setModal(false);
      Alert.alert('🚚', res.data.message ?? t('tr_done'));
      fetchData();
    } catch (e) {
      Alert.alert(t('impossible'), getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (search.trim().length < 2) return [];
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !lines.find((l) => l.product_id === p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, products, lines]);

  if (!allowed) {
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
          ListHeaderComponent={
            <PrimaryButton title={t('tr_new')} onPress={openCreate} style={{ marginBottom: 14 }} />
          }
          ListEmptyComponent={<EmptyState ionicon="repeat-outline" title={t('tr_empty')} subtitle={t('tr_empty_sub')} />}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            const sm = statusMeta(item.status);
            return (
              <TouchableOpacity
                style={[styles.card, item.status === 'cancelled' && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={async () => {
                  if (expanded) {
                    setExpandedId(null);
                    return;
                  }
                  try {
                    const res = await api.get(`/transfers/${item.id}`);
                    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...res.data.data } : x)));
                    setExpandedId(item.id);
                  } catch (e) {
                    Alert.alert(t('impossible'), getErrorMessage(e));
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.reference}>{item.reference}</Text>
                  <View style={[styles.stateBadge, { backgroundColor: sm.color + '1F' }]}>
                    <Text style={[styles.stateText, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>
                <View style={styles.routeRow}>
                  <Text style={styles.place}>
                    {item.from_shop_id === null ? '🏠' : '🏬'} {item.from_name}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.place}>
                    {item.to_shop_id === null ? '🏠' : '🏬'} {item.to_name}
                  </Text>
                  <Text style={styles.linesCount}>
                    · {t('tr_items_cnt', { count: item.items_count ?? 0 })}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {formatDateTime(item.sent_at ?? item.created_at)}
                  {item.user?.name ? ` · ${item.user.name}` : ''}
                  {item.status === 'received' && item.receiver?.name
                    ? ` · ✓ ${item.receiver.name}`
                    : ''}
                  {item.note ? ` · ${item.note}` : ''}
                </Text>

                {expanded && item.items ? (
                  <View style={styles.itemsBox}>
                    {item.items.map((it) => (
                      <View key={it.id} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.product?.name ?? `#${it.product_id}`}
                        </Text>
                        <Text style={styles.itemQty}>×{it.quantity}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* 🚚 v14 : actions sur un transfert en transit */}
                {canReceive(item) || canCancel(item) ? (
                  <View style={styles.actionsRow}>
                    {canReceive(item) ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.success }]}
                        onPress={() => doReceive(item)}
                        disabled={busyId === item.id}
                      >
                        <Text style={styles.actionText}>✓ {t('tr_receive')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {canCancel(item) ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.dangerBg }]}
                        onPress={() => doCancel(item)}
                        disabled={busyId === item.id}
                      >
                        <Text style={[styles.actionText, { color: colors.danger }]}>↩️ {t('tr_cancel_title')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {busyId === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                    ) : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 🔁 Modale nouveau transfert */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => !saving && setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>🔁 {t('tr_new')}</Text>

              <View style={styles.routePickers}>
                <TouchableOpacity style={styles.placePicker} onPress={() => setPickFrom(true)}>
                  <Text style={styles.placePickerLabel}>{t('tr_from')}</Text>
                  <Text style={styles.placePickerValue} numberOfLines={1}>
                    {fromShop === null ? '🏠 ' : '🏬 '}{placeName(fromShop)}
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: colors.muted, fontSize: 18, marginHorizontal: 6 }}>→</Text>
                <TouchableOpacity style={styles.placePicker} onPress={() => setPickTo(true)}>
                  <Text style={styles.placePickerLabel}>{t('tr_to')}</Text>
                  <Text style={styles.placePickerValue} numberOfLines={1}>
                    {toShop === null ? '🏠 ' : '🏬 '}{placeName(toShop)}
                  </Text>
                </TouchableOpacity>
              </View>

              {lines.map((l) => (
                <View key={l.product_id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{l.name}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepLine(l.product_id, -1)}>
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{l.quantity}</Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepLine(l.product_id, 1)}>
                      <Ionicons name="add" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemMax}>/ {l.max}</Text>
                </View>
              ))}

              <Field
                label={t('tr_add_product')}
                placeholder={t('tr_search_ph')}
                value={search}
                onChangeText={setSearch}
              />
              {filteredProducts.length > 0 ? (
                <View style={styles.results}>
                  {filteredProducts.map((p) => (
                    <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => addLine(p)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.resultMeta}>
                          {placeName(fromShop)} : {fromShop === null ? p.quantity : (p.shop_stock ?? 0)} · {t('tr_global')} {p.quantity}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={colors.primary} style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Field
                label={t('tr_note')}
                placeholder={t('tr_note_ph')}
                value={note}
                onChangeText={setNote}
              />

              <PrimaryButton
                title={t('tr_submit', { count: lines.reduce((s, l) => s + l.quantity, 0) })}
                onPress={submit}
                loading={saving}
                disabled={lines.length === 0}
                style={{ marginTop: 12 }}
              />
              <TouchableOpacity style={styles.closeSheet} onPress={() => setModal(false)} disabled={saving}>
                <Text style={styles.closeSheetText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal
        visible={pickFrom}
        title={t('tr_from')}
        options={placeOptions}
        value={fromShop}
        onSelect={(v) => {
          setFromShop(v);
          setLines([]); // les plafonds dépendent de la source
          setPickFrom(false);
        }}
        onClose={() => setPickFrom(false)}
      />
      <PickerModal
        visible={pickTo}
        title={t('tr_to')}
        options={placeOptions.filter((o) => o.value !== fromShop)}
        value={toShop}
        onSelect={(v) => {
          setToShop(v);
          setPickTo(false);
        }}
        onClose={() => setPickTo(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reference: { fontSize: 14, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  linesCount: { fontSize: 11.5, color: colors.muted, fontWeight: '700' },
  stateBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  stateText: { fontSize: 11, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  place: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  arrow: { color: colors.info, fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 11.5, color: colors.muted, marginTop: 5 },
  itemsBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemName: { flex: 1, fontSize: 12.5, color: colors.text, fontWeight: '600' },
  itemQty: { fontSize: 12.5, color: colors.accent, fontWeight: '800', marginLeft: 8 },
  itemMax: { fontSize: 11, color: colors.muted, marginLeft: 4 },
  // Modale
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '92%',
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  routePickers: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  placePicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.cardAlt,
  },
  placePickerLabel: { fontSize: 10.5, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  placePickerValue: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: { fontSize: 14, color: colors.text, fontWeight: '800' },
  stepQty: { width: 30, textAlign: 'center', fontSize: 13.5, fontWeight: '800', color: colors.text },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  resultName: { fontSize: 13, fontWeight: '700', color: colors.text },
  resultMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  addBtn: { fontSize: 18, color: colors.primary, fontWeight: '800', marginLeft: 10 },
  closeSheet: { alignItems: 'center', marginTop: 10, paddingVertical: 6 },
  closeSheetText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
