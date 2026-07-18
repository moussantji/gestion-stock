import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import EmptyState from '../components/EmptyState';

export default function AlertsScreen({ navigation }) {
  const { t } = useLocale();
  const { hasRole } = useAuth();
  const [view, setView] = useState('low'); // 'low' | 'place' (📍 ma boutique/siège) | 'forecast'
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ window_days: 30, lead_days: 14 });
  const [location, setLocation] = useState(null); // 📍 {shop_id, name} (v14)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (showLoader = false, which = view) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      if (which === 'forecast') {
        const res = await api.get('/products/restock-forecast');
        setItems(res.data.data);
        setMeta({ window_days: res.data.window_days ?? 30, lead_days: res.data.lead_days ?? 14 });
      } else if (which === 'place') {
        // 📍 v14 : alertes de MON emplacement (bucket boutique / siège)
        const res = await api.get('/stock-alerts');
        setItems(res.data.data);
        setLocation(res.data.location ?? null);
      } else {
        const res = await api.get('/products/low-stock');
        setItems(res.data.data);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view])
  );

  const renderLowItem = ({ item }) => {
    const isOut = item.quantity === 0;
    const ratio = item.alert_threshold > 0 ? Math.min(1, item.quantity / item.alert_threshold) : 1;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
        >
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>{item.sku}{item.category ? ` · ${item.category.name}` : ''}</Text>

          <View style={styles.gaugeBg}>
            <View
              style={[
                styles.gaugeFill,
                { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: isOut ? colors.danger : colors.warning },
              ]}
            />
          </View>
          <Text style={[styles.qtyText, { color: isOut ? colors.danger : colors.warning }]}>
            {isOut ? t('al_out') : `${item.quantity} ${t('al_left')}`} — {t('al_threshold')} : {item.alert_threshold}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restockBtn}
          onPress={() => navigation.navigate('MovementForm', { product: item, type: 'in' })}
        >
          <Text style={styles.restockText}>{t('al_restock')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 📈 Prévision de rupture basée sur la vélocité de vente (vendus/jour)
  const renderForecastItem = ({ item }) => {
    const lead = meta.lead_days || 14;
    const urgent = item.days_left <= lead;
    const soon = !urgent && item.days_left <= lead * 2;
    const tone = urgent ? colors.danger : soon ? colors.warning : colors.success;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        >
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.sku}{item.category ? ` · ${item.category}` : ''} · {t('fc_velocity', { v: item.velocity })}
          </Text>

          <View style={styles.forecastRow}>
            <View style={[styles.daysBadge, { backgroundColor: tone + '1F' }]}>
              <Text style={[styles.daysText, { color: tone }]}>
                ⏳ {t('fc_days_left', { n: item.days_left })}
              </Text>
            </View>
            {item.suggested_order > 0 ? (
              <Text style={styles.suggestText}>📦 {t('fc_suggest', { n: item.suggested_order })}</Text>
            ) : (
              <Text style={styles.okText}>✓ {item.quantity}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Onglets : Seuils (global) / Emplacement (📍 v14) / Prévisions */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, view === 'low' && styles.tabActive]}
          onPress={() => setView('low')}
        >
          <Text style={[styles.tabText, view === 'low' && styles.tabTextActive]}>⚠️ {t('al_tab_low')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'place' && styles.tabActive]}
          onPress={() => setView('place')}
        >
          <Text style={[styles.tabText, view === 'place' && styles.tabTextActive]}>📍 {t('al_tab_place')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'forecast' && styles.tabActive]}
          onPress={() => setView('forecast')}
        >
          <Text style={[styles.tabText, view === 'forecast' && styles.tabTextActive]}>📈 {t('al_tab_forecast')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, paddingTop: 4 }}
          renderItem={view === 'forecast' ? renderForecastItem : renderLowItem} // 📍 'place' = même format que 'low'
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
          ListEmptyComponent={
            view === 'forecast' ? (
              <EmptyState icon="📈" title={t('fc_none')} subtitle={t('fc_hint')} />
            ) : view === 'place' ? (
              <EmptyState icon="📍" title={t('dash_no_alert')} subtitle={t('al_place_none')} />
            ) : (
              <EmptyState icon="🎉" title={t('dash_no_alert')} subtitle={t('al_none_sub')} />
            )
          }
          ListHeaderComponent={
            <>
              {/* Accès rapide : bons de commande fournisseurs (admin/manager) */}
              {hasRole('admin', 'manager') ? (
                <TouchableOpacity
                  style={styles.poBanner}
                  onPress={() => navigation.navigate('PurchaseOrders')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.poBannerText}>{t('al_purchase_orders')}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ) : null}
              {view === 'forecast' ? (
                <Text style={styles.count}>
                  {t('fc_hint_period', { days: meta.window_days, lead: meta.lead_days })}
                </Text>
              ) : view === 'place' ? (
                <Text style={styles.count}>
                  📍 {t('al_place_caption', { place: location?.name ?? '—' })}
                  {items.length > 0 ? ` — ${t('al_count', { count: items.length })}` : ''}
                </Text>
              ) : items.length > 0 ? (
                <Text style={styles.count}>{t('al_count', { count: items.length })}</Text>
              ) : null}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: '#fff' },
  count: { fontSize: 12.5, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  poBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  poBannerText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  gaugeBg: { height: 7, backgroundColor: colors.border, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  qtyText: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 8, flexWrap: 'wrap' },
  daysBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  daysText: { fontSize: 11.5, fontWeight: '800' },
  suggestText: { fontSize: 11.5, fontWeight: '700', color: colors.info },
  okText: { fontSize: 11.5, fontWeight: '700', color: colors.success },
  restockBtn: {
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 12,
  },
  restockText: { color: colors.success, fontWeight: '800', fontSize: 12 },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
