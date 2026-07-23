import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ReceiptActionsSheet from '../components/ReceiptActionsSheet';
import PaymentSheet from '../components/PaymentSheet';
import { useThemedStyles } from '../hooks/useThemedStyles';

export default function MovementsScreen({ navigation }) {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  const FILTERS = [
    { key: 'all', label: t('mv_all'), icon: null },
    { key: 'in', label: t('mv_in'), icon: 'arrowDown' },
    { key: 'out', label: t('mv_out'), icon: 'arrowUp' },
    { key: 'receipts', label: t('mv_receipts'), icon: 'sale' },
    { key: 'credits', label: t('mv_credits'), icon: 'cash' },
  ];

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [shareReceipt, setShareReceipt] = useState(null);

  const [outstanding, setOutstanding] = useState(0);
  const [payTarget, setPayTarget] = useState(null);

  const isReceipts = filter === 'receipts';
  const isCredits = filter === 'credits';

  const fetchPage = async (pageToLoad = 1, append = false) => {
    setError(null);
    try {
      if (isCredits) {
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

  const typeMeta = (type) => {
    switch (type) {
      case 'in':
        return { icon: 'arrowDown', bg: colors.successBg, color: colors.success, sign: '+' };
      case 'out':
        return { icon: 'arrowUp', bg: colors.dangerBg, color: colors.danger, sign: '-' };
      case 'transfer_in':
        return { icon: 'arrowDown', bg: colors.infoBg, color: colors.info, sign: '+' };
      case 'transfer_out':
        return { icon: 'arrowUp', bg: colors.infoBg, color: colors.info, sign: '-' };
      default:
        return { icon: 'movements', bg: colors.cardAlt, color: colors.muted, sign: '' };
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
          <Icon name={tm.icon} size={18} color={tm.color} />
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
          <Icon name={remaining > 0 ? 'cash' : 'sale'} size={18} color={remaining > 0 ? colors.warning : colors.primary} />
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

  const renderCredit = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setPayTarget(item)} activeOpacity={0.75}>
      <View style={[styles.typeBadge, { backgroundColor: colors.warningBg }]}>
        <Icon name="cash" size={18} color={colors.warning} />
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

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    chips: { flexDirection: 'row', padding: 16, paddingBottom: 4, gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: 8,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12.5, fontWeight: '600', color: c.muted },
    chipTextActive: { color: '#fff' },
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
    typeBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    meta: { fontSize: 11, color: c.muted, marginTop: 2 },
    reason: { fontSize: 12, color: c.info, marginTop: 2, fontStyle: 'italic' },
    qty: { fontSize: 16, fontWeight: '900', marginLeft: 10 },
    pdfHint: { fontSize: 10.5, color: c.muted, fontWeight: '700', marginTop: 3 },
    hint: { fontSize: 11, color: c.muted, marginBottom: 8 },
    creditLine: { fontSize: 11.5, color: c.warning, fontWeight: '700', marginTop: 2 },
    outstandingCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.warningBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.warning,
      padding: 16,
      marginBottom: 12,
    },
    outstandingLabel: { fontSize: 13, fontWeight: '800', color: c.warning },
    outstandingValue: { fontSize: 18, fontWeight: '900', color: c.warning },
    overlay: { flex: 1, backgroundColor: 'rgba(3,6,18,0.65)' },
    paySheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.bgAlt,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      paddingBottom: 34,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    payTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    payNumber: { fontSize: 12.5, color: c.accent, fontFamily: 'monospace', marginTop: 3 },
    payDue: { fontSize: 13, color: c.warning, fontWeight: '700', marginTop: 8, marginBottom: 14 },
    payLabel: { fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 },
    payInput: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    payAllBtn: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 4, paddingVertical: 4 },
    payAllText: { color: c.accent, fontWeight: '800', fontSize: 13 },
    paySubmit: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 12,
    },
    paySubmitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    errorBox: { margin: 16, backgroundColor: c.dangerBg, borderRadius: 12, padding: 14 },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
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
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    fabText: { fontSize: 24 },
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.icon ? <><Icon name={f.icon} size={14} color={filter === f.key ? colors.text : colors.muted} /> </> : null}{f.label}
            </Text>
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
              ? <EmptyState icon="💳" title={t('cr_none')} subtitle={t('cr_none_sub')} />
              : isReceipts
                ? <EmptyState icon="🧾" title={t('rc_none')} subtitle={t('rc_none_sub')} />
                : <EmptyState icon="🔄" title={t('mv_none')} subtitle={t('mv_none_sub')} />
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

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewSale')}>
        <Icon name="sale" size={24} color="#fff" />
      </TouchableOpacity>

      <ReceiptActionsSheet
        receipt={shareReceipt}
        onClose={() => setShareReceipt(null)}
        navigation={navigation}
        onChanged={() => fetchPage(1)}
      />

      <PaymentSheet
        receipt={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => fetchPage(1)}
      />
    </View>
  );
}
