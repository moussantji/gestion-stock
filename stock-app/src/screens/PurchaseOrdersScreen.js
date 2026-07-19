import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { formatDateTime, formatMoney } from '../utils/format';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';

/**
 * 📦 Bons de commande fournisseurs — cycle draft → sent → (partial) → received.
 * v12 : réception PARTIELLE — chaque ligne peut être rentrée en plusieurs fois ;
 * le statut « partial » reste ouvert tant que tout n'est pas réceptionné.
 */
export default function PurchaseOrdersScreen() {
  const { t } = useLocale();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [forecast, setForecast] = useState(null); // 📊 v23 (v2.12) : prévisions par fournisseur (clé additive, null = masqué)
  const [sharingId, setSharingId] = useState(null);

  // 🧾 Réception partielle
  const [rcvPo, setRcvPo] = useState(null); // PO ouvert en modale
  const [rcvQty, setRcvQty] = useState({}); // { item_id: qty }
  const [rcvBusy, setRcvBusy] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/purchase-orders', { params: { per_page: 50 } });
      setOrders(res.data.data ?? []);
      // 📊 v23 : prévisions d'achat par fournisseur (route existante, param additif — non bloquant)
      api.get('/products/restock-forecast', { params: { days: 30, lead: 15, by_supplier: 1 } })
        .then((r) => setForecast(r.data?.suppliers ?? null))
        .catch(() => setForecast(null));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  // ---------- Génération anti-doublon depuis le stock bas ----------
  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/purchase-orders/generate');
      Alert.alert(
        res.data.created > 0 ? t('po_generated', { count: res.data.created }) : '📦',
        res.data.message
      );
      load();
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  // ---------- Actions ----------
  const markSent = async (po) => {
    setBusyId(po.id);
    try {
      await api.post(`/purchase-orders/${po.id}/send`);
      load();
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  // 🧾 Ouvre la modale de réception (charge les lignes si besoin)
  const openReceive = async (po) => {
    try {
      let full = po;
      if (!po.items) {
        const res = await api.get(`/purchase-orders/${po.id}`);
        full = { ...po, ...res.data.data };
        setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, ...res.data.data } : o)));
      }
      const initial = {};
      (full.items ?? []).forEach((it) => {
        initial[it.id] = Math.max(0, (it.quantity ?? 0) - (it.received_qty ?? 0));
      });
      setRcvQty(initial);
      setRcvPo(full);
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    }
  };

  const stepRcv = (item, delta) => {
    const max = Math.max(0, (item.quantity ?? 0) - (item.received_qty ?? 0));
    setRcvQty((prev) => ({
      ...prev,
      [item.id]: Math.min(max, Math.max(0, (prev[item.id] ?? 0) + delta)),
    }));
  };

  const fillAllRcv = () => {
    if (!rcvPo?.items) return;
    const all = {};
    rcvPo.items.forEach((it) => {
      all[it.id] = Math.max(0, (it.quantity ?? 0) - (it.received_qty ?? 0));
    });
    setRcvQty(all);
  };

  const submitReceive = async () => {
    if (!rcvPo) return;
    const items = (rcvPo.items ?? [])
      .map((it) => ({ item_id: it.id, received_qty: rcvQty[it.id] ?? 0 }))
      .filter((l) => l.received_qty > 0);
    if (items.length === 0) return;

    setRcvBusy(true);
    try {
      const res = await api.post(`/purchase-orders/${rcvPo.id}/receive`, { items });
      setRcvPo(null);
      Alert.alert(t('po_receive_done'), res.data.message);
      load();
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setRcvBusy(false);
    }
  };

  const confirmCancel = (po) => {
    Alert.alert(t('po_cancel_title'), t('po_cancel_msg', { number: po.number }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('po_cancel'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(po.id);
          try {
            await api.delete(`/purchase-orders/${po.id}`);
            setExpandedId(null);
            load();
          } catch (e) {
            Alert.alert('Erreur', getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  // ---------- Édition d'une quantité (brouillon uniquement) ----------
  const updateQty = async (po, item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    // Mise à jour optimiste locale (l'API reste la source de vérité)
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== po.id
          ? o
          : {
              ...o,
              items: o.items.map((it) =>
                it.id === item.id
                  ? { ...it, quantity: newQty, subtotal: newQty * it.unit_price }
                  : it
              ),
              total_estimated: o.total_estimated + delta * item.unit_price,
            }
      )
    );

    try {
      const res = await api.put(`/purchase-orders/${po.id}/items/${item.id}`, { quantity: newQty });
      setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, ...res.data.data } : o)));
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
      load(); // resynchronise en cas d'échec
    }
  };

  // ---------- Partage du PDF ----------
  const sharePdf = async (po) => {
    setSharingId(po.id);
    try {
      const token = await SecureStore.getItemAsync('token');
      const target = `${FileSystem.documentDirectory}bon-${po.number}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/purchase-orders/${po.id}/pdf`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: po.number });
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? t('error_generic'));
    } finally {
      setSharingId(null);
    }
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'draft':
        return { label: t('po_draft'), color: colors.warning };
      case 'sent':
        return { label: t('po_sent'), color: colors.info };
      case 'partial':
        return { label: t('po_partial'), color: colors.warning };
      case 'received':
        return { label: t('po_received'), color: colors.success };
      default:
        return { label: t('po_cancelled'), color: colors.muted };
    }
  };

  const renderOrder = ({ item: po }) => {
    const meta = statusMeta(po.status);
    const open = po.status === 'draft' || po.status === 'sent' || po.status === 'partial';
    const expanded = expandedId === po.id;

    return (
      <View style={[styles.card, !open && { opacity: 0.82 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={async () => {
            if (expanded) {
              setExpandedId(null);
            } else {
              try {
                const res = await api.get(`/purchase-orders/${po.id}`);
                setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, ...res.data.data } : o)));
                setExpandedId(po.id);
              } catch (e) {
                Alert.alert('Erreur', getErrorMessage(e));
              }
            }
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.number}>{po.number}</Text>
            <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.supplier}>
            📦 {po.supplier?.name ?? t('po_supplier')}
            {po.supplier?.phone ? ` · ${po.supplier.phone}` : ''}
          </Text>
          <Text style={styles.meta}>
            {t('po_items_count', { count: po.items_count ?? 0 })} ·{' '}
            {t('po_total_est')} : <Text style={{ fontWeight: '800', color: colors.accent }}>{formatMoney(po.total_estimated)}</Text>
          </Text>
          <Text style={styles.metaLight}>
            {formatDateTime(po.created_at)} · {po.user ? t('po_by', { name: po.user.name }) : t('po_auto')}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.muted} style={styles.expandHint} />
        </TouchableOpacity>

        {expanded && po.items ? (
          <View style={styles.itemsBox}>
            {po.status === 'draft' ? (
              <Text style={styles.editHint}>{t('po_edit_hint')}</Text>
            ) : null}
            {po.items.map((it) => {
              const rcv = it.received_qty ?? 0;
              const complete = po.status !== 'draft' && rcv >= it.quantity;
              return (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.product_name}</Text>
                  {po.status === 'draft' ? (
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(po, it, -1)}>
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{it.quantity}</Text>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(po, it, 1)}>
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.itemQty, complete && { color: colors.success }]}>
                      {po.status === 'received' || po.status === 'partial'
                        ? `${rcv}/${it.quantity}${complete ? ' ✓' : ''}`
                        : `×${it.quantity}`}
                    </Text>
                  )}
                  <Text style={styles.itemSub}>{formatMoney(it.subtotal)}</Text>
                </View>
              );
            })}

            <View style={styles.actionsRow}>
              {po.status === 'draft' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.info }]}
                  onPress={() => markSent(po)}
                  disabled={busyId === po.id}
                >
                  <Text style={styles.actionText}>{t('po_send')}</Text>
                </TouchableOpacity>
              ) : null}
              {open ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  onPress={() => openReceive(po)}
                  disabled={busyId === po.id}
                >
                  <Text style={styles.actionText}>{t('po_receive')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => sharePdf(po)}
                disabled={sharingId === po.id}
              >
                {sharingId === po.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionText}>{t('po_pdf')}</Text>
                )}
              </TouchableOpacity>
              {open ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.dangerBg }]}
                  onPress={() => confirmCancel(po)}
                  disabled={busyId === po.id}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>{t('po_cancel')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {busyId === po.id ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const rcvTotal = Object.values(rcvQty).reduce((s, q) => s + q, 0);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load(true)}>
            <Text style={styles.retry}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
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
          ListHeaderComponent={
            <View>
              {/* 📊 v23 : carte « Prévisions d'achat » par fournisseur (vieux serveur → absente) */}
              {forecast != null ? (
                <View style={styles.fCard}>
                  <Text style={styles.fTitle}>📊 {t('pf2_title')}</Text>
                  <Text style={styles.fHint}>{t('pf2_hint')}</Text>
                  {forecast.length === 0 ? (
                    <Text style={styles.fHint}>✅ {t('pf2_ok')}</Text>
                  ) : (
                    forecast.map((s) => (
                      <View key={String(s.supplier_id ?? 0)} style={styles.fRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fSupplier}>🚛 {s.name}</Text>
                          <Text style={styles.fLine} numberOfLines={2}>
                            {(s.lines ?? []).slice(0, 4).map((l) => `${l.name} ×${l.suggested_order}${l.days_left != null ? ` (${l.days_left} j)` : ''}`).join(' · ')}
                            {(s.lines ?? []).length > 4 ? ` · +${s.lines.length - 4}` : ''}
                          </Text>
                        </View>
                        <Text style={styles.fQty}>{t('pf2_qty', { qty: s.total_qty ?? 0 })}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
              <PrimaryButton
                title={t('po_generate')}
                onPress={generate}
                loading={generating}
                variant="primary"
                style={{ marginBottom: 14 }}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState ionicon="cube-outline" title={t('po_empty')} subtitle={t('po_empty_sub')} />
          }
        />
      )}

      {/* 🧾 Modale de réception partielle */}
      <Modal visible={!!rcvPo} transparent animationType="slide" onRequestClose={() => !rcvBusy && setRcvPo(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>🧾 {t('po_rcv_title')}</Text>
            <Text style={styles.sheetHint}>{t('po_rcv_hint')}</Text>

            {rcvPo?.items?.map((it) => {
              const max = Math.max(0, (it.quantity ?? 0) - (it.received_qty ?? 0));
              const done = max === 0;
              return (
                <View key={it.id} style={styles.rcvRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{it.product_name}</Text>
                    <Text style={styles.rcvProgress}>
                      {t('po_rcv_progress', { r: it.received_qty ?? 0, q: it.quantity })}
                    </Text>
                  </View>
                  {done ? (
                    <Text style={{ color: colors.success, fontWeight: '800' }}>✓</Text>
                  ) : (
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => stepRcv(it, -1)}>
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{rcvQty[it.id] ?? 0}</Text>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => stepRcv(it, 1)}>
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.allBtn} onPress={fillAllRcv} disabled={rcvBusy}>
                <Text style={styles.allBtnText}>{t('po_rcv_all')}</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={t('po_rcv_submit', { count: rcvTotal })}
                onPress={submitReceive}
                loading={rcvBusy}
                disabled={rcvTotal === 0}
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
            <TouchableOpacity style={styles.closeSheet} onPress={() => setRcvPo(null)} disabled={rcvBusy}>
              <Text style={styles.closeSheetText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 16, alignItems: 'center' },
  errorText: { color: colors.danger, textAlign: 'center' },
  retry: { color: colors.accent, fontWeight: '700', marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 14.5, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  supplier: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 8 },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  metaLight: { fontSize: 11, color: colors.muted, marginTop: 3, opacity: 0.8 },
  expandHint: { position: 'absolute', right: 2, bottom: 4, color: colors.muted, fontSize: 10 },
  itemsBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  itemName: { flex: 1, fontSize: 12.5, color: colors.text, fontWeight: '600' },
  itemQty: { fontSize: 12.5, color: colors.muted, marginHorizontal: 10, fontWeight: '700' },
  editHint: { fontSize: 11.5, color: colors.info, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
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
  itemSub: { fontSize: 12.5, color: colors.accent, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  // 🧾 Modale réception partielle
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sheetHint: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 12 },
  rcvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rcvProgress: { fontSize: 11, color: colors.muted, marginTop: 2 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  allBtn: {
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  allBtnText: { color: colors.info, fontSize: 12, fontWeight: '800' },
  closeSheet: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
  closeSheetText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  // 📊 v23 : carte prévisions d'achat
  fCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.primary },
  fTitle: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 2 },
  fHint: { color: colors.muted, fontSize: 11.5, marginBottom: 8 },
  fRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fSupplier: { color: colors.text, fontWeight: '700', fontSize: 13 },
  fLine: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  fQty: { color: colors.primary, fontWeight: '900', fontSize: 12, marginLeft: 8 },
});
