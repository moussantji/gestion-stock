import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { formatDateTime, formatMoney } from '../utils/format';
import EmptyState from '../components/EmptyState';
import ReceiptActionsSheet from '../components/ReceiptActionsSheet';
import PaymentSheet from '../components/PaymentSheet';

export default function MovementsScreen({ navigation }) {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  const FILTERS = [
    { key: 'all', label: t('mv_all') },
    { key: 'in', label: t('mv_in') },
    { key: 'out', label: t('mv_out') },
    { key: 'receipts', label: t('mv_receipts') },
    { key: 'credits', label: t('mv_credits') }, // 💳
  ];

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [shareReceipt, setShareReceipt] = useState(null); // reçu à partager/imprimer

  // 💳 Crédits : encours total + modale de versement
  const [outstanding, setOutstanding] = useState(0);
  const [payTarget, setPayTarget] = useState(null); // reçu crédit sélectionné

  const isReceipts = filter === 'receipts';
  const isCredits = filter === 'credits';

  const fetchPage = async (pageToLoad = 1, append = false) => {
    setError(null);
    try {
      if (isCredits) {
        // 💳 Liste non paginée des reçus non soldés + encours total
        const res = await api.get('/receipts/credits');
        setOutstanding(Number(res.data?.outstanding_total ?? 0));
        setItems(res.data?.data ?? []);
        setPage(1);
        setLastPage(1);
        return;
      }

      const params = { page: pageToLoad, per_page: 20 };
      if (!isReceipts && filter !== 'all') params.type = filter;

      const res = await api.get(isReceipts ? '/receipts' : '/movements', { params });
      const payload = res.data;
      setLastPage(payload.last_page ?? 1);
      setPage(payload.current_page ?? pageToLoad);
      setItems((prev) => (append ? [...prev, ...payload.data] : payload.data));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPage(1);
    }, [filter])
  );

  const loadMore = () => {
    if (loading || loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    fetchPage(page + 1, true);
  };

  const confirmCancel = (movement) => {
    if (!hasRole('admin', 'manager')) return;
    Alert.alert(
      t('mv_cancel_title'),
      t('mv_cancel_msg', {
        type: movement.type === 'in' ? t('dash_in').toLowerCase() : t('dash_out').toLowerCase(),
        qty: movement.quantity,
        product: movement.product?.name ?? '—',
      }),
      [
        { text: t('mv_cancel_no'), style: 'cancel' },
        {
          text: t('mv_cancel_yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/movements/${movement.id}`);
              fetchPage(1);
            } catch (e) {
              Alert.alert('Erreur', getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  // 🔁 v13 : répresentation par type de mouvement (in / out / transferts)
  const typeMeta = (type) => {
    switch (type) {
      case 'in':
        return { icon: '⬇️', bg: colors.successBg, color: colors.success, sign: '+' };
      case 'out':
        return { icon: '⬆️', bg: colors.dangerBg, color: colors.danger, sign: '-' };
      case 'transfer_in':
        return { icon: '↙️', bg: colors.infoBg, color: colors.info, sign: '+' };
      case 'transfer_out':
        return { icon: '↗️', bg: colors.infoBg, color: colors.info, sign: '-' };
      default:
        return { icon: '🔄', bg: colors.cardAlt, color: colors.muted, sign: '' };
    }
  };

  const renderMovement = ({ item }) => {
    const tm = typeMeta(item.type);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={hasRole('admin', 'manager') ? 0.7 : 1}
        onLongPress={() => confirmCancel(item)}
      >
        <View style={[styles.typeBadge, { backgroundColor: tm.bg }]}>
          <Text style={{ fontSize: 18 }}>{tm.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.product?.name ?? t('product_deleted')}</Text>
          <Text style={styles.meta}>
            {item.user?.name} · {formatDateTime(item.created_at)}
          </Text>
          {item.reason ? <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text> : null}
        </View>
        <Text style={[styles.qty, { color: tm.color }]}>
          {tm.sign}{item.quantity}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderReceipt = ({ item }) => {
    const remaining = Number(item.remaining ?? 0);
    return (
      <TouchableOpacity style={styles.card} onPress={() => setShareReceipt(item)} activeOpacity={0.75}>
        <View style={[styles.typeBadge, { backgroundColor: remaining > 0 ? colors.warningBg : colors.primaryBg }]}>
          <Text style={{ fontSize: 18 }}>{remaining > 0 ? '💳' : '🧾'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.number}</Text>
          <Text style={styles.meta}>
            {item.client_name ?? '—'} · {t('receipt_items', { count: item.items_count ?? 0 })}
          </Text>
          <Text style={styles.meta}>{item.user?.name} · {formatDateTime(item.created_at)}</Text>
          {remaining > 0 ? (
            <Text style={styles.creditLine}>{t('cr_remaining', { amount: formatMoney(remaining) })}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.qty, { color: colors.accent }]}>{formatMoney(item.total)}</Text>
          <Text style={styles.pdfHint}>
            {remaining > 0 ? t('rc_credit_badge') : 'PDF ↗'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 💳 Ligne « crédit en cours » (tap → versement)
  const renderCredit = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setPayTarget(item)} activeOpacity={0.75}>
      <View style={[styles.typeBadge, { backgroundColor: colors.warningBg }]}>
        <Text style={{ fontSize: 18 }}>💳</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.number} · {item.client_name ?? '—'}
        </Text>
        <Text style={styles.meta}>
          {t('cr_paid', { amount: formatMoney(item.amount_paid ?? 0) })} / {formatMoney(item.total)}
        </Text>
        <Text style={styles.meta}>{item.user?.name} · {formatDateTime(item.created_at)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.qty, { color: colors.warning }]}>{formatMoney(item.remaining)}</Text>
        <Text style={styles.pdfHint}>{t('cr_settle_hint')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
          renderItem={isCredits ? renderCredit : isReceipts ? renderReceipt : renderMovement}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPage(1);
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isCredits
              ? <EmptyState ionicon="card-outline" title={t('cr_none')} subtitle={t('cr_none_sub')} />
              : isReceipts
                ? <EmptyState ionicon="receipt-outline" title={t('rc_none')} subtitle={t('rc_none_sub')} />
                : <EmptyState ionicon="sync-outline" title={t('mv_none')} subtitle={t('mv_none_sub')} />
          }
          ListHeaderComponent={
            isCredits && items.length > 0 ? (
              <View style={styles.outstandingCard}>
                <Text style={styles.outstandingLabel}>{t('cr_total')}</Text>
                <Text style={styles.outstandingValue}>{formatMoney(outstanding)}</Text>
              </View>
            ) : !isReceipts && !isCredits && hasRole('admin', 'manager') && items.length > 0 ? (
              <Text style={styles.hint}>{t('mv_cancel_hint')}</Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null
          }
        />
      )}

      {/* Nouvelle vente */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewSale')}>
        <Text style={styles.fabText}>🧾</Text>
      </TouchableOpacity>

      {/* Feuille d'actions du reçu : A5 · ticket 80mm · image · impression Bluetooth */}
      <ReceiptActionsSheet
        receipt={shareReceipt}
        onClose={() => setShareReceipt(null)}
        navigation={navigation}
        onChanged={() => fetchPage(1)}
      />

      {/* 💳 Versement sur un crédit (composant partagé avec la fiche client) */}
      <PaymentSheet
        receipt={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => fetchPage(1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  chips: { flexDirection: 'row', padding: 16, paddingBottom: 4, gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },
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
  typeBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  reason: { fontSize: 12, color: colors.info, marginTop: 2, fontStyle: 'italic' },
  qty: { fontSize: 16, fontWeight: '900', marginLeft: 10 },
  pdfHint: { fontSize: 10.5, color: colors.muted, fontWeight: '700', marginTop: 3 },
  hint: { fontSize: 11, color: colors.muted, marginBottom: 8 },
  creditLine: { fontSize: 11.5, color: colors.warning, fontWeight: '700', marginTop: 2 },
  outstandingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: 16,
    marginBottom: 12,
  },
  outstandingLabel: { fontSize: 13, fontWeight: '800', color: colors.warning },
  outstandingValue: { fontSize: 18, fontWeight: '900', color: colors.warning },
  overlay: { flex: 1, backgroundColor: 'rgba(3,6,18,0.65)' },
  paySheet: {
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
  payTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  payNumber: { fontSize: 12.5, color: colors.accent, fontFamily: 'monospace', marginTop: 3 },
  payDue: { fontSize: 13, color: colors.warning, fontWeight: '700', marginTop: 8, marginBottom: 14 },
  payLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  payInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  payAllBtn: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 4, paddingVertical: 4 },
  payAllText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  paySubmit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  paySubmitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
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
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 24 },
});
