import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,

  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatDateTime, formatMoney } from '../utils/format';
import { waLink } from '../utils/promo'; // 🔔 v22 (v2.11)
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import PaymentSheet from '../components/PaymentSheet';
import ReceiptActionsSheet from '../components/ReceiptActionsSheet';

/** 👥 Fiche client : totaux, crédits en cours (versement), historique d'achats. */
export default function CustomerDetailScreen({ route, navigation }) {
  const { t } = useLocale();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState(null);
  const [credits, setCredits] = useState([]);
  const [history, setHistory] = useState([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]); // 🎁 journal fidélité
  const [loyaltyConfig, setLoyaltyConfig] = useState(null); // 🎁 {earn_per, point_value}
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [payTarget, setPayTarget] = useState(null);    // 💳 versement
  const [shareReceipt, setShareReceipt] = useState(null); // 🧾 reçu à partager
  const [shopName, setShopName] = useState(''); // 🔔 v22 : boutique pour la relance crédit
  const [plan, setPlan] = useState(null);         // 💳 v24 (v2.13) : échéancier (null = vieux serveur → masqué)
  const [planDate, setPlanDate] = useState('');
  const [planSaving, setPlanSaving] = useState(false);

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    headCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primaryBg,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    avatarText: { fontSize: 24, fontWeight: '900', color: c.primary },
    name: { fontSize: 18, fontWeight: '800', color: c.text },
    waBtn: {
      marginTop: 10,
      backgroundColor: c.successBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.success,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    waText: { color: c.success, fontWeight: '800', fontSize: 13 },
    meta: { fontSize: 12.5, color: c.muted, marginTop: 3 },
    errorBox: { marginTop: 12, backgroundColor: c.dangerBg, borderRadius: 12, padding: 14 },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
    grid: { flexDirection: 'row', marginTop: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginTop: 20, marginBottom: 8 },
    pointsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primaryBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.primary,
      padding: 14,
      marginTop: 14,
    },
    pointsTitle: { color: c.text, fontSize: 14, fontWeight: '800' },
    pointsMeta: { color: c.muted, fontSize: 11.5, marginTop: 3 },
    pointsValue: { color: c.primary, fontSize: 20, fontWeight: '800' },
    pointsList: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    pointsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    pointsNote: { color: c.text, fontSize: 12.5, fontWeight: '600' },
    pointsDate: { color: c.muted, fontSize: 11, marginTop: 2 },
    pointsDelta: { fontSize: 14, fontWeight: '800', marginLeft: 10 },
    emptySmall: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    iconBadge: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    rowName: { fontSize: 13.5, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 11, color: c.muted, marginTop: 2 },
    rowValue: { fontSize: 13.5, fontWeight: '900' },
    hintSmall: { fontSize: 10, color: c.muted, fontWeight: '700', marginTop: 2 },
    planCard: {
      backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 12,
    },
    planTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    planHint: { color: c.muted, fontSize: 11, lineHeight: 15, marginTop: 4, marginBottom: 10 },
    planChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    planNone: { color: c.muted, fontSize: 12 },
    planChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.bg,
      borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
    },
    planChipLate: { borderWidth: 1, borderColor: c.danger },
    planChipText: { color: c.text, fontSize: 12, fontWeight: '700' },
    planChipX: { color: c.muted, fontSize: 11, paddingLeft: 2 },
    planAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    planQuickBtn: { backgroundColor: c.bg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
    planQuickText: { color: c.accent, fontSize: 12, fontWeight: '800' },
    planInput: {
      flex: 1, backgroundColor: c.bg, color: c.text, borderRadius: 8,
      paddingVertical: 8, paddingHorizontal: 10, fontSize: 12,
    },
    planAddBtn: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
    planAddText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  }));

  const load = async () => {
    setError(null);
    try {
      const res = await api.get(`/customers/${customerId}`);
      setCustomer(res.data?.data ?? null);
      setStats(res.data?.stats ?? null);
      setCredits(res.data?.credits ?? []);
      setHistory(res.data?.history ?? []);
      setLoyaltyHistory(res.data?.loyalty_history ?? []); // 🎁
      setLoyaltyConfig(res.data?.loyalty_config ?? null); // 🎁
      // 💳 v24 : clé additive — ABSENTE sur vieux serveur → carte masquée (zéro régression)
      const sp = res.data?.payment_plan;
      setPlan(sp === undefined ? null : (sp ?? { dates: [], next: null, days_until: null }));
      // 🔔 v22 : nom de la boutique (relance crédit) — non bloquant
      api.get('/shop').then((r) => setShopName(r.data?.data?.name ?? r.data?.name ?? '')).catch(() => {});
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [customerId])
  );

  // ---------- 💳 v24 (v2.13) : échéancier planifié ----------
  const todayStr = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ → comparaison lexicale
  const savePlan = async (dates) => {
    if (planSaving) return;
    setPlanSaving(true);
    try {
      const r = await api.put(`/customers/${customerId}`, { payment_plan: dates }); // nom non requis (v2.13)
      setPlan(r.data?.payment_plan ?? plan);
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setPlanSaving(false);
    }
  };
  const addDays = (n) => {
    const d = new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    savePlan(Array.from(new Set([...(plan?.dates ?? []), d])).sort());
  };
  const addCustomDate = () => {
    const d = String(planDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    setPlanDate('');
    if ((plan?.dates ?? []).includes(d)) return;
    savePlan([...(plan?.dates ?? []), d].sort());
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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
    >
      {/* ---------- En-tête ---------- */}
      <View style={styles.headCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(customer?.name ?? '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{customer?.name}</Text>
        {customer?.phone ? <Text style={styles.meta}>📞 {customer.phone}</Text> : null}
        {customer?.address ? <Text style={styles.meta}>📍 {customer.address}</Text> : null}
        {customer?.notes ? <Text style={[styles.meta, { fontStyle: 'italic' }]}>📝 {customer.notes}</Text> : null}
        {customer?.phone ? (
          <TouchableOpacity
            style={styles.waBtn}
            onPress={() => {
              const digits = String(customer.phone).replace(/\D/g, '');
              Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.waText}>{t('cu_whatsapp')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* 🔔 v22 : relance crédit — message pré-rempli avec le reste à payer, 1 tap */}
        {customer?.phone && Number(stats?.credit_balance ?? 0) > 0 ? (
          <TouchableOpacity
            style={[styles.waBtn, { backgroundColor: colors.warning, marginTop: 8 }]}
            onPress={() => {
              const msg = t('cr_msg', {
                name: customer?.name ?? '',
                amount: formatMoney(stats.credit_balance),
                shop: shopName || '',
              });
              Linking.openURL(waLink(customer.phone, msg)).catch(() => {});
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.waText}>🔔 {t('cr_remind')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ---------- 💳 v24 (v2.13) : échéancier planifié (clé additive — vieux serveur : masqué) ---------- */}
      {plan ? (
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>💳 {t('pl_title')}</Text>
          <Text style={styles.planHint}>{t('pl_hint')}</Text>
          <View style={styles.planChips}>
            {(plan.dates ?? []).length === 0 ? (
              <Text style={styles.planNone}>{t('pl_none')}</Text>
            ) : (
              (plan.dates ?? []).map((d) => (
                <View key={d} style={[styles.planChip, d < todayStr ? styles.planChipLate : null]}>
                  <Text style={[styles.planChipText, d < todayStr ? { color: colors.danger } : null]}>
                    📅 {String(d).split('-').reverse().join('/')}
                  </Text>
                  <TouchableOpacity onPress={() => savePlan((plan.dates ?? []).filter((x) => x !== d))} hitSlop={8}>
                    <Text style={styles.planChipX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
          <View style={styles.planAddRow}>
            {[7, 15, 30].map((n) => (
              <TouchableOpacity key={n} style={styles.planQuickBtn} onPress={() => addDays(n)} disabled={planSaving}>
                <Text style={styles.planQuickText}>+{n} j</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.planInput}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.muted}
              value={planDate}
              onChangeText={setPlanDate}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={styles.planAddBtn} onPress={addCustomDate} disabled={planSaving}>
              {planSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.planAddText}>➕ {t('pl_add')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ---------- Totaux ---------- */}
      {stats ? (
        <>
          <View style={styles.grid}>
            <StatCard icon="🛒" label={t('cu_spent')} value={formatMoney(stats.spent_total)} color={colors.accent} style={{ marginRight: 8 }} />
            <StatCard icon="🧾" label={t('cu_receipts_count')} value={stats.receipts_count} color={colors.primary} style={{ marginLeft: 8 }} />
          </View>
          <View style={[styles.grid, { marginTop: 12 }]}>
            <StatCard icon="💵" label={t('cu_paid')} value={formatMoney(stats.paid_total)} color={colors.success} style={{ marginRight: 8 }} />
            <StatCard icon="💳" label={t('cu_balance')} value={formatMoney(stats.credit_balance)} color={colors.warning} style={{ marginLeft: 8 }} />
          </View>
        </>
      ) : null}

      {/* ---------- 🎁 Fidélité ---------- */}
      <View style={styles.pointsCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pointsTitle}>🎁 {t('cd_points_title')}</Text>
          {loyaltyConfig ? (
            <Text style={styles.pointsMeta}>
              {t('cd_points_rule', { per: formatMoney(loyaltyConfig.earn_per), value: loyaltyConfig.point_value })}
            </Text>
          ) : null}
        </View>
        <Text style={styles.pointsValue}>{customer?.loyalty_points ?? 0} pts</Text>
      </View>
      {loyaltyHistory.length > 0 ? (
        <View style={styles.pointsList}>
          {loyaltyHistory.slice(0, 6).map((tx) => (
            <View key={tx.id} style={styles.pointsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsNote} numberOfLines={1}>{tx.note ?? tx.type}</Text>
                <Text style={styles.pointsDate}>
                  {formatDateTime(tx.created_at)}{tx.user?.name ? ` · ${tx.user.name}` : ''}
                </Text>
              </View>
              <Text style={[styles.pointsDelta, { color: tx.points >= 0 ? colors.success : colors.danger }]}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ---------- 💳 Crédits en cours ---------- */}
      <Text style={styles.sectionTitle}>{t('cu_credits')} ({credits.length})</Text>
      {credits.length === 0 ? (
        <View style={styles.emptySmall}>
          <Text style={{ fontSize: 13, color: colors.muted }}>{t('cu_no_credit')}</Text>
        </View>
      ) : (
        credits.map((r) => (
          <TouchableOpacity key={r.id} style={styles.rowCard} activeOpacity={0.75} onPress={() => setPayTarget(r)}>
            <View style={[styles.iconBadge, { backgroundColor: colors.warningBg }]}>
              <Text style={{ fontSize: 16 }}>💳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{r.number}</Text>
              <Text style={styles.rowMeta}>
                {t('cr_paid', { amount: formatMoney(r.amount_paid ?? 0) })} / {formatMoney(r.total)} · {formatDateTime(r.created_at)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.rowValue, { color: colors.warning }]}>{formatMoney(r.remaining)}</Text>
              <Text style={styles.hintSmall}>{t('cr_settle_hint')}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* ---------- 🧾 Historique d'achats ---------- */}
      <Text style={styles.sectionTitle}>{t('cu_history')}</Text>
      {history.length === 0 ? (
        <EmptyState icon="🧾" title={t('cu_no_history')} subtitle={t('cu_no_history_sub')} />
      ) : (
        history.map((r) => {
          const refunded = r.status === 'refunded';
          const remaining = Number(r.remaining ?? 0);
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.rowCard, refunded && { opacity: 0.55 }]}
              activeOpacity={0.75}
              onPress={() => setShareReceipt({ id: r.id, number: r.number, status: r.status })}
            >
              <View style={[styles.iconBadge, { backgroundColor: refunded ? colors.dangerBg : remaining > 0 ? colors.warningBg : colors.primaryBg }]}>
                <Text style={{ fontSize: 16 }}>{refunded ? '↩️' : remaining > 0 ? '💳' : '🧾'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{r.number}</Text>
                <Text style={styles.rowMeta}>
                  {formatDateTime(r.created_at)} · {t('receipt_items', { count: r.items_count ?? 0 })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowValue, { color: refunded ? colors.danger : colors.accent }]}>
                  {formatMoney(r.total)}
                </Text>
                <Text style={styles.hintSmall}>
                  {refunded ? t('av_badge') : remaining > 0 ? t('rc_credit_badge') : t('rc_paid_badge')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Sheets */}
      <PaymentSheet receipt={payTarget} onClose={() => setPayTarget(null)} onPaid={() => load()} />
      <ReceiptActionsSheet
        receipt={shareReceipt}
        onClose={() => setShareReceipt(null)}
        navigation={navigation}
        onChanged={() => load()}
      />
    </ScrollView>
  );
}

