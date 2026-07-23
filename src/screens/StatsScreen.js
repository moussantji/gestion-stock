import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatMoney } from '../utils/format';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const PERIODS = ['7d', '30d', '90d', 'all'];

export default function StatsScreen() {
  const { t, locale } = useLocale(); // 📊 v21 : locale pour les libellés de mois
  const { hasRole } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, windowWidth - 32);

  const [period, setPeriod] = useState('30d');
  const [view, setView] = useState('products'); // 'products' | 'sellers' | 'categories'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false); // 📊 export Excel
  const [sharingSellers, setSharingSellers] = useState(false); // 📤 v2.4 : partage comparatif vendeurs
  const [sharingProfit, setSharingProfit] = useState(false); // 📤 v21 : partage CSV rentabilité
  const [sharingShops, setSharingShops] = useState(false); // 📤 v16 : partage comparatif boutiques
  // 💰 Marges (source séparée, chargée à la demande)
  const [margins, setMargins] = useState(null);
  const [marginsLoading, setMarginsLoading] = useState(false);
  // 👥 v2.9 : taux de commission vendeurs (% du CA — clé additive du /shop, 0 = masqué)
  const [comPct, setComPct] = useState(0);

  // 🧾 Modal historique d'un produit (drill-down depuis le classement)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 📅 v17 : période à dates libres — prioritaire sur les puces 7/30/90 j
  const [custom, setCustom] = useState(null); // { from, to } AAAA-MM-JJ
  const [dateOpen, setDateOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    chipsRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
    chip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.muted },
    chipTextActive: { color: '#fff' },
    viewTabs: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    exportBtn: {
      backgroundColor: c.primaryBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 11,
      alignItems: 'center',
      marginBottom: 14,
    },
    exportText: { color: c.primary, fontWeight: '800', fontSize: 13 },
    marginHint: { fontSize: 11, color: c.muted, marginTop: 10, textAlign: 'center' },
    viewTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
    viewTabActive: { backgroundColor: c.primaryBg },
    viewTabText: { fontSize: 13, fontWeight: '700', color: c.muted },
    viewTabTextActive: { color: c.primary },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primaryBg,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarText: { fontSize: 13, fontWeight: '900', color: c.primary },
    errorBox: { backgroundColor: c.dangerBg, borderRadius: 10, padding: 12, marginBottom: 14, alignItems: 'center' },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
    retry: { color: c.accent, fontWeight: '700', marginTop: 6 },
    grid: { flexDirection: 'row' },
    section: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 10 },
    chart: { borderRadius: 12, marginLeft: -8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    rankBadge: { width: 34, alignItems: 'center' },
    rankText: { fontSize: 13, fontWeight: '800', color: c.muted },
    thumb: { width: 40, height: 40, borderRadius: 10, marginRight: 10, backgroundColor: c.cardAlt },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    rowName: { fontSize: 13.5, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 11, color: c.muted, marginTop: 1 },
    barTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: 6,
      marginRight: 12,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: c.primary },
    rowRevenue: { fontSize: 12.5, fontWeight: '800', color: c.accent, maxWidth: 92, textAlign: 'right' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(3,6,18,0.7)' },
    dateLbl: { fontSize: 12, fontWeight: '700', color: c.muted, marginTop: 12, marginBottom: 6 },
    dateInput: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    dateGo: {
      backgroundColor: c.primary,
      borderRadius: 13,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 18,
    },
    dateGoText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    dateCancel: { alignItems: 'center', paddingVertical: 11, marginTop: 4 },
    dateCancelText: { color: c.muted, fontWeight: '700', fontSize: 13.5 },
    modalCard: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.bgAlt,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 18,
      paddingBottom: 26,
      borderTopWidth: 1,
      borderColor: c.border,
      maxHeight: '82%',
    },
    modalHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 12,
    },
    modalTitle: { fontSize: 16.5, fontWeight: '800', color: c.text },
    modalSub: { fontSize: 12, color: c.muted, marginTop: 3 },
    pmTiles: { flexDirection: 'row', gap: 8, marginTop: 14 },
    pmTile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
    },
    pmTileIcon: { fontSize: 15 },
    pmTileValue: { fontSize: 17, fontWeight: '900', marginTop: 3 },
    pmTileLabel: { fontSize: 10.5, color: c.muted, marginTop: 2 },
    pmRevenue: { fontSize: 13, fontWeight: '700', color: c.text, marginTop: 12 },
    pmMoveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    pmMoveReason: { fontSize: 12.5, fontWeight: '600', color: c.text },
    pmMoveMeta: { fontSize: 10.5, color: c.muted, marginTop: 1 },
    pmMoveQty: { fontSize: 14, fontWeight: '800' },
    pmCloseBtn: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    pmCloseText: { color: c.primary, fontWeight: '800' },
  }));

  const allowed = hasRole('admin', 'manager');

  const statsParams = (p) => (custom ? { from: custom.from, to: custom.to } : { period: p });
  const periodKey = () => (custom ? `${custom.from}_${custom.to}` : period); // noms de fichiers

  const load = async (p = period) => {
    setError(null);
    try {
      const res = await api.get('/stats/sales', { params: statsParams(p) });
      setData(res.data);
      // 🏬 v16 : l'onglet Boutiques disparaît si la période n'a plus ≥ 2 boutiques
      if ((res.data?.by_shop ?? []).length < 2 && view === 'shops') setView('products');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 💰 Chargement des marges (à la première ouverture de l'onglet / changement de période)
  const loadMargins = async (p = period) => {
    setMarginsLoading(true);
    try {
      const res = await api.get('/stats/margins', { params: { ...statsParams(p), by_month: 1 } }); // 📊 v21 (additif — vieux serveur : clé absente → bloc masqué)
      setMargins(res.data);
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setMarginsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (allowed) {
        setLoading(true);
        load();
        // 👥 v2.9 : commission vendeurs (/shop additif — échec silencieux, vieux serveur → 0)
        api.get('/shop').then((r) => setComPct(Number(r.data?.commission_pct ?? 0) || 0)).catch(() => {});
      } else {
        setLoading(false);
      }
    }, [allowed])
  );

  const switchPeriod = (p) => {
    if (p === period && !custom) return;
    setCustom(null); // 📅 v17 : retour aux puces = sortir des dates libres
    setPeriod(p);
    setLoading(true);
    load(p);
    if (view === 'margins') loadMargins(p); // 💰 re-synchronise l'onglet marges
  };

  // 📅 v17 — validation + application des dates libres (le serveur permute si inversées)
  const applyCustomDates = () => {
    const RE = /^\d{4}-\d{2}-\d{2}$/;
    if (!RE.test(dateFrom.trim()) || !RE.test(dateTo.trim())) {
      Alert.alert('⚠️', t('st_bad_date'));
      return;
    }
    setCustom({ from: dateFrom.trim(), to: dateTo.trim() });
    setDateOpen(false);
    setLoading(true);
    load();
    if (view === 'margins') loadMargins();
  };

  const switchView = (v) => {
    setView(v);
    if (v === 'margins' && !margins && !marginsLoading) loadMargins(); // 💰 chargement paresseux
  };

  // ---------- Drill-down : historique d'un produit ----------
  const openProductHistory = (product) => {
    if (!product?.product_id) return; // ligne snapshot sans produit (supprimé + vente ancienne)
    setSelectedProduct(product);
    setDetail(null);
    setDetailLoading(true);
    api
      .get('/stats/product-movements', { params: { product_id: product.product_id, period } })
      .then((res) => setDetail(res.data))
      .catch((e) => Alert.alert('⚠️', getErrorMessage(e)))
      .finally(() => setDetailLoading(false));
  };

  const closeProductHistory = () => {
    setSelectedProduct(null);
    setDetail(null);
  };

  // ---------- 📊 Export Excel (.xlsx — 4 onglets, période courante) ----------
  const exportExcel = async () => {
    setExporting(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const target = `${FileSystem.documentDirectory}stats-ventes-${period}.xlsx`;
      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/stats/export.xlsx?period=${period}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `stats-ventes-${period}.xlsx`,
        });
      } else {
        Alert.alert(t('st_export_ok'), res.uri);
      }
    } catch (e) {
      Alert.alert('⚠️', e?.message ?? getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  /* ---------- Accès refusé ---------- */
  if (!allowed) {
    return (
      <View style={[styles.container, styles.center]}>
        <EmptyState icon="🔒" title={t('st_forbidden')} />
      </View>
    );
  }

  const totals = data?.totals;
  const products = data?.products ?? [];
  const sellers = data?.sellers ?? [];
  const shops = data?.by_shop ?? []; // 🏬 v16 — comparatif boutiques (clé absente = vieux serveur)
  const cross = data?.cross ?? []; // 📊 v17 — matrice vendeurs × boutiques (additive serveur v2.7)
  const goals = data?.seller_goals ?? null; // 🏆 v18 — objectifs du mois (additive serveur v2.8 ; target 0 = masqué)
  const shopNameOf = (id) => shops.find((s) => (s.shop_id ?? null) === (id ?? null))?.name ?? 'Siège';
  const maxCrossCell = cross.length
    ? Math.max(1, ...cross.flatMap((r) => (r.by_shop ?? []).map((c) => Number(c.revenue ?? 0))))
    : 1;

  // 📤 v2.4 — Partage « Excel » (CSV BOM + « ; ») du comparatif vendeurs.
  const shareSellersCsv = async () => {
    if (sellers.length < 2 || sharingSellers) return;
    const esc = (v) => {
      const x = String(v ?? '');
      return /[";\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    const head = ['#', t('st_col_seller'), t('st_col_receipts'), t('st_col_items'), t('st_col_avg'), t('st_col_rev'), t('st_col_share')];
    const lines = [head.map(esc).join(';')];
    sellers.forEach((s, i) => {
      lines.push([String(i + 1), s.name ?? '', String(s.receipts_count ?? ''), String(s.items ?? ''),
        String(s.avg_basket ?? ''), String(Number(s.revenue ?? 0)), String(s.share ?? '')].map(esc).join(';'));
    });
    const content = '\uFEFF' + lines.join('\r\n');
    const name = `comparatif-vendeurs-${periodKey()}.csv`;
    setSharingSellers(true);
    try {
      const uri = `${FileSystem.documentDirectory}${name}`;
      await FileSystem.writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: name }); // WhatsApp, mail…
      } else {
        Alert.alert('✅', t('st_vs_done', { name }));
      }
    } catch (e) {
      Alert.alert('⚠️', t('st_vs_ko', { msg: getErrorMessage(e) }));
    } finally {
      setSharingSellers(false);
    }
  };
  // 🏬 v16 — Partage « Excel » (CSV BOM + « ; ») du comparatif boutiques.
  const shareShopsCsv = async () => {
    if (shops.length < 2 || sharingShops) return;
    const esc = (v) => {
      const x = String(v ?? '');
      return /[";\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    const head = ['#', t('st_col_shop'), t('st_col_receipts'), t('st_col_items'), t('st_col_avg'), t('st_col_rev'), t('st_col_share')];
    const lines = [head.map(esc).join(';')];
    shops.forEach((s, i) => {
      lines.push([String(i + 1), s.name ?? '', String(s.receipts_count ?? ''), String(s.items ?? ''),
        String(s.avg_basket ?? ''), String(Number(s.revenue ?? 0)), String(s.share ?? '')].map(esc).join(';'));
    });
    const content = '\uFEFF' + lines.join('\r\n');
    const name = `comparatif-boutiques-${periodKey()}.csv`;
    setSharingShops(true);
    try {
      const uri = `${FileSystem.documentDirectory}${name}`;
      await FileSystem.writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: name }); // WhatsApp, mail…
      } else {
        Alert.alert('✅', t('st_vs_done', { name }));
      }
    } catch (e) {
      Alert.alert('⚠️', t('st_vs_ko', { msg: getErrorMessage(e) }));
    } finally {
      setSharingShops(false);
    }
  };

  const categories = data?.categories ?? [];
  const top5 = products.slice(0, 5);
  const maxRevenue = products.length ? Math.max(...products.map((p) => p.revenue), 1) : 1;
  const maxSellerRevenue = sellers.length ? Math.max(...sellers.map((s) => s.revenue), 1) : 1;
  const maxShopRevenue = shops.length ? Math.max(...shops.map((s) => s.revenue), 1) : 1; // 🏬 v16
  const maxCatRevenue = categories.length ? Math.max(...categories.map((c) => c.revenue), 1) : 1;

  const isMargins = view === 'margins'; // 💰
  const currentList = view === 'products' ? products : view === 'sellers' ? sellers : view === 'shops' ? shops : categories;
  const isEmpty = !isMargins && !loading && !error && currentList.length === 0;
  const emptyIcon = view === 'sellers' ? '👥' : view === 'shops' ? '🏬' : view === 'categories' ? '🏷' : '📊';
  const marginProducts = margins?.products ?? [];
  const maxMargin = marginProducts.length
    ? Math.max(...marginProducts.map((x) => Math.abs(x.margin)), 1)
    : 1;
  // 📊 v21 (v2.10) : rentabilité mois par mois — clé additive by_month du serveur ([] = vieux serveur)
  const profitRows = margins?.by_month ?? [];
  const monthShort = (ym) => {
    try {
      const [y, m] = String(ym).split('-').map(Number);
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'short' })
        .format(new Date(y, (m ?? 1) - 1, 1)).replace(/[.]/g, '');
    } catch { return String(ym); }
  };

  // 📤 v21 — partage CSV de la rentabilité 12 mois (mêmes conventions que le comparatif vendeurs)
  const shareProfitCsv = async () => {
    if (sharingProfit || profitRows.length < 2) return;
    setSharingProfit(true);
    try {
      const esc = (v) => {
        const x = String(v ?? '');
        return /[";\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
      };
      const head = [t('pf_month'), t('st_col_rev'), t('mg_cost'), t('pf_margin'), t('mg_rate')];
      const lines = [head.map(esc).join(';')];
      profitRows.forEach((r) => {
        lines.push([r.ym, r.revenue ?? 0, r.cost ?? 0, r.margin ?? 0, `${r.rate ?? 0}%`].map(esc).join(';'));
      });
      const fileUri = `${FileSystem.cacheDirectory}rentabilite-12mois-${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, `﻿${lines.join('\n')}`, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: t('pf_title') });
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setSharingProfit(false);
    }
  };

  const chartData = {
    labels: top5.map((p) => (p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name)),
    datasets: [{ data: top5.length ? top5.map((p) => p.revenue) : [0] }],
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
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
      {/* ---------- Filtre période ---------- */}
      <View style={styles.chipsRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, period === p && !custom && styles.chipActive]}
            onPress={() => switchPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && !custom && styles.chipTextActive]}>
              {t(`st_${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
        {/* 📅 v17 : dates libres — appui long = retour aux puces */}
        <TouchableOpacity
          style={[styles.chip, !!custom && styles.chipActive]}
          onPress={() => { setDateFrom(custom?.from ?? ''); setDateTo(custom?.to ?? ''); setDateOpen(true); }}
          onLongPress={() => switchPeriod(period)}
          accessibilityLabel={t('st_custom_title')}
        >
          <Text style={[styles.chipText, !!custom && styles.chipTextActive]}>
            {custom
              ? `📅 ${custom.from.slice(8)}/${custom.from.slice(5, 7)}–${custom.to.slice(8)}/${custom.to.slice(5, 7)}`
              : `📅 ${t('st_dates')}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ---------- 📊 Export Excel ---------- */}
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={exportExcel}
        disabled={exporting}
        activeOpacity={0.85}
      >
        {exporting ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={styles.exportText}>
            {t('st_export', { period: t(`st_${period}`) })}
          </Text>
        )}
      </TouchableOpacity>

      {/* ---------- Onglets Produits / Vendeurs / Boutiques(≥2) / Catégories / Marges ---------- */}
      <View style={styles.viewTabs}>
        {['products', 'sellers', ...(shops.length >= 2 ? ['shops'] : []), 'categories', 'margins'].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewTab, view === v && styles.viewTabActive]}
            onPress={() => switchView(v)}
          >
            <Text style={[styles.viewTabText, view === v && styles.viewTabTextActive]}>
              {t(`st_tab_${v}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retry}>{t('st_retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : null}

      {isEmpty ? (
        <EmptyState icon={emptyIcon} title={t('st_no_sales')} subtitle={t('st_no_sales_sub')} />
      ) : null}

      {totals && !isMargins && currentList.length > 0 ? (
        <>
          {/* ---------- Totaux ---------- */}
          <View style={styles.grid}>
            <StatCard icon="💰" label={t('st_revenue')} value={formatMoney(totals.revenue)} color={colors.success} style={{ marginRight: 8 }} />
            <StatCard icon="🧾" label={t('st_receipts')} value={totals.receipts} color={colors.primary} style={{ marginLeft: 8 }} />
          </View>
          <View style={[styles.grid, { marginTop: 12 }]}>
            <StatCard icon="📦" label={t('st_items')} value={totals.items} color={colors.accent} style={{ marginRight: 8 }} />
            <StatCard icon="🛒" label={t('st_avg')} value={formatMoney(totals.avg_basket)} color={colors.warning} style={{ marginLeft: 8 }} />
          </View>

          {/* ---------- VUE PRODUITS ---------- */}
          {view === 'products' ? (
            <>
              {/* Top 5 (graphique) */}
              {top5.length ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('st_top')}</Text>
                  <BarChart
                    data={chartData}
                    width={chartWidth - 32}
                    height={190}
                    fromZero
                    showValuesOnTopOfBars
                    withInnerLines={false}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: colors.card,
                      backgroundGradientFrom: colors.card,
                      backgroundGradientTo: colors.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => {
                        const hex = colors.primary.replace('#', '');
                        const r = parseInt(hex.slice(0, 2), 16);
                        const g = parseInt(hex.slice(2, 4), 16);
                        const b = parseInt(hex.slice(4, 6), 16);
                        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                      },
                      labelColor: () => colors.muted,
                      barPercentage: 0.55,
                      propsForLabels: { fontSize: 10 },
                    }}
                    style={styles.chart}
                  />
                </View>
              ) : null}

              {/* Classement détaillé produits (tap → historique du produit) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('st_rank')}</Text>
                {products.map((p, index) => (
                  <TouchableOpacity
                    key={`${p.product_id ?? 'x'}-${index}`}
                    style={styles.row}
                    activeOpacity={p.product_id ? 0.7 : 1}
                    onPress={() => openProductHistory(p)}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                      </Text>
                    </View>
                    {p.image_url ? (
                      <Image source={{ uri: p.image_url }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Text style={{ fontSize: 16 }}>📦</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.rowMeta}>
                        {t('st_qty', { qty: p.qty })} · {p.share}%
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.max(4, (p.revenue / maxRevenue) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.rowRevenue}>{formatMoney(p.revenue)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : view === 'sellers' ? (
            /* ---------- VUE VENDEURS ---------- */
            <View style={styles.section}>
              {/* 🏆 v18 : objectifs vendeurs du mois (serveur v2.8 ; cible 0/absente → masqué) */}
              {Number(goals?.target ?? 0) > 0 && (goals?.sellers ?? []).length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.sectionTitle}>{t('goal_title')}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
                    {t('goal_sub', { target: formatMoney(goals.target) })}
                  </Text>
                  {goals.sellers.slice(0, 8).map((g) => {
                    const pct = Number(g.progress ?? 0);
                    const reached = pct >= 100;
                    return (
                      <View key={`goal-${g.user_id}`} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                            {reached ? '🏆' : '🎯'} {g.name}{reached ? `  🎉 ${t('goal_reached')}` : ''}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: reached ? colors.success : colors.accent }}>
                            {formatMoney(g.revenue)} · {Math.round(pct)}%
                          </Text>
                        </View>
                        {/* 👥 v2.9 : commission due sur le CA du mois (taux /shop, 0 = masqué) */}
                        {comPct > 0 ? (
                          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                            💰 {t('com_month', { amt: formatMoney(Math.round(Number(g.revenue ?? 0) * comPct / 100)) })}
                          </Text>
                        ) : null}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: reached ? colors.success : colors.accent },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>{t('st_sellers_rank')}</Text>
                {sellers.length >= 2 ? (
                  <TouchableOpacity onPress={shareSellersCsv} disabled={sharingSellers} accessibilityLabel={t('st_vs_export')}>
                    {sharingSellers ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>{t('st_vs_export')}</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
              {sellers.map((s, index) => (
                <View key={`${s.user_id}-${index}`} style={styles.row}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                    </Text>
                  </View>
                  {/* Avatar initiales */}
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t('st_receipts_count', { count: s.receipts_count })} · {t('st_qty', { qty: s.items })}
                      {s.avg_basket != null ? ` · ⌀ ${formatMoney(s.avg_basket)}` : ''} · {s.share}%
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(4, (s.revenue / maxSellerRevenue) * 100)}%`, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.rowRevenue}>{formatMoney(s.revenue)}</Text>
                </View>
              ))}

              {/* ---------- 📊 v17 : heatmap vendeurs × boutiques (≥ 2 × ≥ 2) ---------- */}
              {cross.length >= 2 && shops.length >= 2 ? (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.sectionTitle}>{t('st_cross_title')}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>{t('st_cross_sub')}</Text>
                  {cross.slice(0, 8).map((r, ri) => (
                    <View key={`cross-${r.user_id}-${ri}`} style={styles.row}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>
                          {ri < 3 ? ['🥇', '🥈', '🥉'][ri] : `#${ri + 1}`}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                        {(r.by_shop ?? []).map((c) => {
                          const v = Number(c.revenue ?? 0);
                          return (
                            <View key={`${r.user_id}-${c.shop_id ?? 'siege'}`} style={{ marginTop: 5 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={1}>
                                  🏬 {shopNameOf(c.shop_id)}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>
                                  {formatMoney(v)}
                                </Text>
                              </View>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    { width: `${Math.max(4, (v / maxCrossCell) * 100)}%`, backgroundColor: colors.accent },
                                  ]}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={styles.rowRevenue}>{formatMoney(r.total)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : view === 'shops' ? (
            /* ---------- 🏬 VUE BOUTIQUES (v16 : ≥ 2 boutiques sur la période) ---------- */
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>{t('st_shops_rank')}</Text>
                {shops.length >= 2 ? (
                  <TouchableOpacity onPress={shareShopsCsv} disabled={sharingShops} accessibilityLabel={t('st_vs_export')}>
                    {sharingShops ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>{t('st_vs_export')}</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
              {shops.map((s, index) => (
                <View key={`${s.shop_id ?? 'siege'}-${index}`} style={styles.row}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                    </Text>
                  </View>
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 16 }}>🏬</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t('st_receipts_count', { count: s.receipts_count })} · {t('st_qty', { qty: s.items })}
                      {s.avg_basket != null ? ` · ⌀ ${formatMoney(s.avg_basket)}` : ''} · {s.share}%
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(4, (s.revenue / maxShopRevenue) * 100)}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.rowRevenue}>{formatMoney(s.revenue)}</Text>
                </View>
              ))}
            </View>
          ) : (
            /* ---------- VUE CATÉGORIES ---------- */
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('st_categories_rank')}</Text>
              {categories.map((c, index) => (
                <View key={`${c.category_id ?? 'none'}-${index}`} style={styles.row}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                    </Text>
                  </View>
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 16 }}>🏷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {c.name ?? t('st_uncategorized')}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {t('st_qty', { qty: c.qty })} · {c.share}%
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(4, (c.revenue / maxCatRevenue) * 100)}%`, backgroundColor: colors.success },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.rowRevenue}>{formatMoney(c.revenue)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}

      {/* ---------- 💰 VUE MARGES ---------- */}
      {isMargins ? (
        <>
        {marginsLoading && !margins ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : margins && marginProducts.length > 0 ? (
          <>
            <View style={styles.grid}>
              <StatCard icon="💰" label={t('mg_revenue')} value={formatMoney(margins.totals.revenue)} color={colors.success} style={{ marginRight: 8 }} />
              <StatCard icon="💸" label={t('mg_cost')} value={formatMoney(margins.totals.cost)} color={colors.danger} style={{ marginLeft: 8 }} />
            </View>
            <View style={[styles.grid, { marginTop: 12 }]}>
              <StatCard icon="🏆" label={t('mg_margin')} value={formatMoney(margins.totals.margin)} color={colors.primary} style={{ marginRight: 8 }} />
              <StatCard icon="📈" label={t('mg_rate')} value={`${margins.totals.rate} %`} color={colors.accent} style={{ marginLeft: 8 }} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('mg_rank')}</Text>
              {marginProducts.map((p, index) => (
                <View key={`${p.product_id ?? 'x'}-${index}`} style={styles.row}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                    </Text>
                  </View>
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 16 }}>💰</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t('st_qty', { qty: p.qty })} · {p.rate} %
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.max(4, (Math.abs(p.margin) / maxMargin) * 100)}%`,
                            backgroundColor: p.margin >= 0 ? colors.success : colors.danger,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.rowRevenue, { color: p.margin >= 0 ? colors.success : colors.danger, maxWidth: 110 }]}>
                    {formatMoney(p.margin)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.marginHint}>{t('mg_hint')}</Text>
          </>
        ) : (
          <EmptyState icon="💰" title={t('mg_none')} subtitle={t('st_no_sales_sub')} />
        )}

        {/* 📊 v21 (v2.10) : rentabilité mois par mois sur 12 mois glissants (clé additive by_month) */}
        {isMargins && profitRows.length >= 2 ? (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.sectionTitle}>📈 {t('pf_title')}</Text>
              <TouchableOpacity onPress={shareProfitCsv} disabled={sharingProfit} accessibilityLabel={t('pf_share')}>
                {sharingProfit
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={{ fontSize: 16, color: colors.primary }}>📤</Text>}
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 6 }}>{t('pf_sub')}</Text>
            <BarChart
              data={{ labels: profitRows.map((r) => monthShort(r.ym)), datasets: [{ data: profitRows.map((r) => Math.max(0, Number(r.margin ?? 0))) }] }}
              width={chartWidth - 32}
              height={190}
              fromZero
              withInnerLines={false}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => {
                  const hex = colors.success.replace('#', '');
                  const r = parseInt(hex.slice(0, 2), 16);
                  const g = parseInt(hex.slice(2, 4), 16);
                  const b = parseInt(hex.slice(4, 6), 16);
                  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                }, // vert marge
                labelColor: () => colors.muted,
                barPercentage: 0.55,
                propsForLabels: { fontSize: 9 },
              }}
              style={styles.chart}
            />
            {profitRows.map((r) => (
              <View key={`pf-${r.ym}`} style={styles.row}>
                <Text style={styles.rowName}>{monthShort(r.ym)}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.rowQty, { maxWidth: 110 }]} numberOfLines={1}>{formatMoney(r.revenue)}</Text>
                <Text style={[styles.rowRevenue, { color: r.margin >= 0 ? colors.success : colors.danger, maxWidth: 100 }]} numberOfLines={1}>
                  {formatMoney(r.margin)} · {r.rate ?? 0} %
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        </>
      ) : null}

      {/* ---------- 📅 v17 : modale dates libres (serveur permute si inversées) ---------- */}
      <Modal visible={dateOpen} transparent animationType="fade" onRequestClose={() => setDateOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDateOpen(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>📅 {t('st_custom_title')}</Text>
          <Text style={styles.dateLbl}>{t('st_from_lbl')}</Text>
          <TextInput
            style={styles.dateInput}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="2026-07-01"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <Text style={styles.dateLbl}>{t('st_to_lbl')}</Text>
          <TextInput
            style={styles.dateInput}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="2026-07-15"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.dateGo} onPress={applyCustomDates} activeOpacity={0.85}>
            <Text style={styles.dateGoText}>{t('st_apply')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateCancel} onPress={() => setDateOpen(false)} activeOpacity={0.8}>
            <Text style={styles.dateCancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ---------- 🧾 Modal : historique du produit tapé ---------- */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={closeProductHistory}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeProductHistory} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          {detailLoading || !detail ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <Text style={styles.modalTitle} numberOfLines={1}>🧾 {detail.product.name}</Text>
              <Text style={styles.modalSub}>
                {detail.product.sku} · {t('pm_current_stock')} :{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>{detail.product.quantity}</Text>
              </Text>

              {/* Résumé de la période */}
              <View style={styles.pmTiles}>
                <View style={[styles.pmTile, { borderColor: colors.success }]}>
                  <Text style={styles.pmTileIcon}>⬇️</Text>
                  <Text style={[styles.pmTileValue, { color: colors.success }]}>{detail.totals.in}</Text>
                  <Text style={styles.pmTileLabel}>{t('pm_entries')}</Text>
                </View>
                <View style={[styles.pmTile, { borderColor: colors.danger }]}>
                  <Text style={styles.pmTileIcon}>⬆️</Text>
                  <Text style={[styles.pmTileValue, { color: colors.danger }]}>{detail.totals.out}</Text>
                  <Text style={styles.pmTileLabel}>{t('pm_exits')}</Text>
                </View>
                <View style={[styles.pmTile, { borderColor: colors.primary }]}>
                  <Text style={styles.pmTileIcon}>🧾</Text>
                  <Text style={[styles.pmTileValue, { color: colors.primary }]}>{detail.totals.sold_qty}</Text>
                  <Text style={styles.pmTileLabel}>{t('pm_sold')}</Text>
                </View>
              </View>
              <Text style={styles.pmRevenue}>
                💰 {t('st_revenue')} : {formatMoney(detail.totals.sold_revenue)}
              </Text>

              {/* Liste des mouvements */}
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {detail.movements.length ? (
                  detail.movements.map((m) => (
                    <View key={m.id} style={styles.pmMoveRow}>
                      <Text style={{ fontSize: 15 }}>{m.type === 'in' ? '⬇️' : '⬆️'}</Text>
                      <View style={{ flex: 1, marginLeft: 9 }}>
                        <Text style={styles.pmMoveReason} numberOfLines={1}>
                          {m.reason ?? (m.type === 'in' ? t('pm_entries') : t('pm_exits'))}
                          {m.reference ? ` · ${m.reference}` : ''}
                        </Text>
                        <Text style={styles.pmMoveMeta}>
                          {m.user?.name} · {new Date(m.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      <Text style={[styles.pmMoveQty, { color: m.type === 'in' ? colors.success : colors.danger }]}>
                        {m.type === 'in' ? '+' : '-'}{m.quantity}
                      </Text>
                    </View>
                  ))
                ) : (
                  <EmptyState icon="🔄" title={t('pm_empty')} />
                )}
              </ScrollView>

              <TouchableOpacity style={styles.pmCloseBtn} onPress={closeProductHistory}>
                <Text style={styles.pmCloseText}>{t('pm_close')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}


