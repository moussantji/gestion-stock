import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors, ROLE_LABELS } from '../theme/colors';
import { formatDateTime, formatMoney } from '../utils/format';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const CHART_WIDTH = Dimensions.get('window').width - 48;

export default function DashboardScreen({ navigation }) {
  const { user, hasRole } = useAuth();
  const { t } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fcCount, setFcCount] = useState(0); // 📉 v18 : ruptures imminentes (≤ 7 j, route v14 existante)

  const fetchData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
    // 📉 v2.8 (non bloquant, après le principal) : « épuisé sous 7 j »
    try {
      const rf = await api.get('/products/restock-forecast');
      setFcCount((rf.data?.data ?? []).filter((r) => Number(r?.days_left ?? 99) <= 7).length);
    } catch { setFcCount(0); }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );


  const stats = data?.stats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData()} colors={[colors.primary]} />}
    >
      {/* En-tête */}
      <View style={styles.hello}>
        <View>
          <Text style={styles.helloName}>{t('dash_hello')}, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.helloRole}>{ROLE_LABELS[user?.role] ?? user?.role}</Text>
        </View>
        <Text style={{ fontSize: 34 }}>📦</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!data && !error ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : null}

      {/* Action rapide : nouvelle vente */}
      <TouchableOpacity
        style={styles.saleBtn}
        onPress={() => navigation.navigate('NewSale')}
        activeOpacity={0.85}
      >
        <Text style={styles.saleBtnText}>{t('dash_new_sale')}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      {/* Action rapide : stats des ventes (admin/manager) */}
      {hasRole('admin', 'manager') ? (
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => navigation.navigate('Stats')}
          activeOpacity={0.85}
        >
          <Text style={styles.statsBtnText}>{t('dash_sales_stats')}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ) : null}

      {stats ? (
        <>
          {/* Stats */}
          <View style={styles.grid}>
            <StatCard ionicon="cube" label={t('dash_products')} value={stats.products} color={colors.primary} style={{ marginRight: 8 }} />
            <StatCard ionicon="cash" label={t('dash_stock_value')} value={formatMoney(stats.stock_value)} color={colors.success} style={{ marginLeft: 8 }} />
          </View>
          <View style={[styles.grid, { marginTop: 12 }]}>
            <StatCard ionicon="warning" label={t('dash_low_stock')} value={stats.low_stock} color={colors.warning} style={{ marginRight: 8 }} />
            <StatCard ionicon="close-circle" label={t('dash_out_of_stock')} value={stats.out_of_stock} color={colors.danger} style={{ marginHorizontal: 8 }} />
            <StatCard ionicon="swap-horizontal" label={t('dash_moves_today')} value={stats.movements_today} color={colors.info} style={{ marginLeft: 8 }} />
          </View>

          {/* 📉 v18 : chip « ruptures imminentes (≤ 7 j) » → Alertes (route restock-forecast v14) */}
          {fcCount > 0 && (
            <TouchableOpacity style={styles.fcChip} onPress={() => navigation.navigate('Alerts')} activeOpacity={0.85}>
              <Text style={styles.fcChipText}>{t('db_fc_chip', { n: fcCount })}</Text>
            </TouchableOpacity>
          )}

          {/* Graphique 7 jours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dash_chart')}</Text>
            {data.chart?.labels?.length ? (
              <>
                <LineChart
                  data={{
                    labels: data.chart.labels,
                    datasets: [
                      { data: data.chart.in.length ? data.chart.in : [0], color: () => colors.success },
                      { data: data.chart.out.length ? data.chart.out : [0], color: () => colors.danger },
                    ],
                  }}
                  width={CHART_WIDTH}
                  height={200}
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: () => colors.primary,
                    labelColor: () => colors.muted,
                    propsForDots: { r: '3' },
                  }}
                  bezier
                  style={styles.chart}
                />
                <View style={styles.legend}>
                  <Text style={[styles.legendItem, { color: colors.success }]}>● {t('dash_in')}</Text>
                  <Text style={[styles.legendItem, { color: colors.danger }]}>● {t('dash_out')}</Text>
                </View>
              </>
            ) : (
              <EmptyState ionicon="trending-up-outline" title={t('dash_no_chart')} />
            )}
          </View>

          {/* Alertes stock bas */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dash_alerts_title')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
                <Text style={styles.link}>{t('dash_see_all')}</Text>
              </TouchableOpacity>
            </View>
            {data.low_stock_products?.length ? (
              data.low_stock_products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.row}
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                >
                  <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.rowQty, { color: p.quantity === 0 ? colors.danger : colors.warning }]}>
                    {p.quantity} / seuil {p.alert_threshold}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState ionicon="sparkles-outline" title={t('dash_no_alert')} subtitle={t('dash_no_alert_sub')} />
            )}
          </View>

          {/* Activité récente */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dash_recent')}</Text>
            {data.recent_movements?.length ? (
              data.recent_movements.map((m) => (
                <View key={m.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{m.product?.name ?? '—'}</Text>
                    <Text style={styles.rowMeta}>
                      {m.user?.name} · {formatDateTime(m.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.moveQty, { color: m.type === 'in' ? colors.success : colors.danger }]}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState ionicon="time-outline" title={t('dash_no_recent')} />
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  fcChip: { // 📉 v18 : pastille « ruptures imminentes »
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1, borderColor: colors.warning,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  fcChipText: { color: colors.warning, fontSize: 12, fontWeight: '800' },
  hello: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helloName: { fontSize: 20, fontWeight: '800', color: colors.text },
  helloRole: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: 'row' },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  chart: { borderRadius: 12, marginVertical: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  legendItem: { fontSize: 12, fontWeight: '700', marginHorizontal: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  rowQty: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  moveQty: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  saleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  saleBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  statsBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statsBtnText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14, marginBottom: 12 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
