import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useNetwork } from '../context/NetworkContext';
import { useLocale } from '../context/LocaleContext';
import { cacheProducts, getCachedProducts } from '../utils/offlineQueue';
import { getSavedPrinter, isPrinterAvailable, printProductLabels } from '../utils/thermalPrinter';
import { parseProductsCsv } from '../utils/csvImport'; // 📥 v24 (v2.13)
import { colors } from '../theme/colors';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import PickerModal from '../components/PickerModal';

const FILTERS = [
  { key: 'all', labelKey: 'filter_all' },
  { key: 'low', labelKey: 'filter_low' },
  { key: 'out', labelKey: 'filter_out' },
];

export default function ProductsScreen({ navigation }) {
  const { isOnline } = useNetwork();
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(null); // date du cache si hors ligne
  const [bursting, setBursting] = useState(false); // 🏷️ v2.4 : rafale d'étiquettes en cours
  const [qtyOpen, setQtyOpen] = useState(false); // 🏷️ v16 : modale « quantité par produit »
  const [burstList, setBurstList] = useState([]); // 🏷️ v17 : cible de la rafale (liste affichée OU ruptures)
  const [impOpen, setImpOpen] = useState(false);   // 📥 v24 (v2.13) : modale import CSV
  const [impText, setImpText] = useState('');
  const [impCreate, setImpCreate] = useState(true);
  const [impBusy, setImpBusy] = useState(false);
  const [impResult, setImpResult] = useState(null);

  // 📥 v24 — aperçu temps réel (parseur local, le serveur revérifie tout)
  const impPreview = impOpen && impText.trim() ? parseProductsCsv(impText) : null;
  const impFatal = impPreview?.errors?.some((e) => e.message === 'headers' || e.message === 'empty') ?? false;

  const doImport = async () => {
    if (!impPreview?.rows?.length || impBusy) return;
    setImpBusy(true);
    try {
      const res = await api.post('/products/import', {
        rows: impPreview.rows.slice(0, 300),
        create_missing: impCreate ? 1 : 0,
      });
      setImpResult(res.data ?? { created: 0, updated: 0, errors: [] });
      reload(); // le catalogue se rafraîchit derrière
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setImpBusy(false);
    }
  };
  const [outLoading, setOutLoading] = useState(false); // ⚠️ v17 : chargement des ruptures
  const debounce = useRef(null);

  // 🏷️ v2.4 — Rafale d'étiquettes thermiques : tout le rayon listé, un coup.
  // 🏷️ v16/v17 — on choisit d'abord la quantité par produit (saisie express).
  const burstLabels = () => {
    if (!items.length || bursting || outLoading) return;
    if (!isPrinterAvailable()) {
      Alert.alert('🖨', t('pr_unavailable_msg'));
      return;
    }
    setBurstList(items);
    setQtyOpen(true);
  };

  // ⚠️🏷️ v17 — Rafale « ruptures de stock » : réimprimer le rayon à réassortir (zéro backend)
  const burstOutOfStock = async () => {
    if (bursting || outLoading) return;
    if (!isPrinterAvailable()) {
      Alert.alert('🖨', t('pr_unavailable_msg'));
      return;
    }
    setOutLoading(true);
    try {
      // all=1 = sans pagination (plafond serveur 500) — une seule requête
      const res = await api.get('/products', { params: { out_of_stock: 1, all: 1 } });
      const list = (res.data?.data ?? []).filter(Boolean);
      if (!list.length) {
        Alert.alert('✅', t('lb_out_none'));
        return;
      }
      setBurstList(list);
      setQtyOpen(true); // même saisie express de quantité que la rafale classique
    } catch (e) {
      Alert.alert('⚠️', t('lb_out_ko', { msg: getErrorMessage(e) }));
    } finally {
      setOutLoading(false);
    }
  };

  // 📦 v21 (v2.10) — expansion « 1 étiquette par unité en stock » (garde-fous 1..50 / 400 total)
  const expandStockLabels = () => {
    const out = [];
    for (const p of burstList) {
      const n = Math.min(50, Math.max(1, Number(p.shop_stock ?? p.quantity ?? 0) || 0));
      for (let i = 0; i < n && out.length < 400; i++) out.push(p);
    }
    return out;
  };
  const doBurstStock = () => {
    const expanded = expandStockLabels();
    if (!expanded.length) return;
    Alert.alert(`📦 ${t('lb_burst')}`, t('lb_stock_confirm', { total: expanded.length, count: burstList.length }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: '🖨',
        onPress: async () => {
          const saved = await getSavedPrinter();
          if (!saved?.address) {
            Alert.alert(t('pr_no_printer'), t('pr_no_printer_msg'));
            return;
          }
          setBursting(true);
          try {
            const shop = (await api.get('/shop').catch(() => null))?.data?.shop ?? {};
            await printProductLabels(expanded, shop, 1); // ⛓ une seule connexion Bluetooth
            Alert.alert('✅', t('lb_burst_done', { count: expanded.length }));
          } catch (e) {
            Alert.alert('⚠️', t('lb_burst_ko', { msg: getErrorMessage(e) }));
          } finally {
            setBursting(false);
          }
        },
      },
    ]);
  };

  // 🏷️ v16 — quantité choisie → confirmation (total affiché) → impression.
  const doBurst = (copies) => {
    const list = burstList;
    if (!list.length) return;
    const total = list.length * copies;
    Alert.alert(`🏷️ ${t('lb_burst')}`, t('lb_burst_confirm_qty', { total, count: list.length, copies }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: '🖨',
        onPress: async () => {
          const saved = await getSavedPrinter();
          if (!saved?.address) {
            Alert.alert(t('pr_no_printer'), t('pr_no_printer_msg'));
            return;
          }
          setBursting(true);
          try {
            const shop = (await api.get('/shop').catch(() => null))?.data?.shop ?? {};
            await printProductLabels(list, shop, copies); // ⛓ une seule connexion Bluetooth
            Alert.alert('✅', t('lb_burst_done', { count: total }));
          } catch (e) {
            Alert.alert('⚠️', t('lb_burst_ko', { msg: getErrorMessage(e) }));
          } finally {
            setBursting(false);
          }
        },
      },
    ]);
  };

  const isDefaultView = () => !search.trim() && filter === 'all';

  const loadFromCache = async () => {
    const cached = await getCachedProducts();
    if (cached?.products?.length) {
      setItems(cached.products);
      setFromCache(cached.saved_at);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const fetchPage = async (pageToLoad = 1, append = false) => {
    setError(null);
    try {
      const res = await api.get('/products', {
        params: {
          page: pageToLoad,
          per_page: 15,
          search: search.trim() || undefined,
          low_stock: filter === 'low' ? 1 : undefined,
          out_of_stock: filter === 'out' ? 1 : undefined,
        },
      });
      const payload = res.data;
      setFromCache(null);
      setLastPage(payload.last_page ?? 1);
      setPage(payload.current_page ?? pageToLoad);
      const newItems = append ? [...items, ...payload.data] : payload.data;
      setItems(newItems);
      // Met en cache la 1ère page "vue par défaut" pour le mode hors ligne
      if (isDefaultView() && pageToLoad === 1) {
        cacheProducts(payload.data);
      }
    } catch (e) {
      // Hors ligne → repli sur le cache
      await loadFromCache();
      if (!(await getCachedProducts())?.products?.length) {
        setError(getErrorMessage(e));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const reload = () => {
    setLoading(true);
    fetchPage(1);
  };

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [filter])
  );

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => reload(), 350);
    return () => clearTimeout(debounce.current);
  }, [search]);

  const loadMore = () => {
    if (loading || loadingMore || page >= lastPage || fromCache) return;
    setLoadingMore(true);
    fetchPage(page + 1, true);
  };

  return (
    <View style={styles.container}>
      {fromCache ? (
        <View style={styles.cacheNotice}>
          <Text style={styles.cacheText}>
            {t('cache_notice')} {new Date(fromCache).toLocaleDateString('fr-FR')} {t('at')}{' '}
            {new Date(fromCache).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder={t('prod_search_ph')}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Scanner', { mode: 'lookup' })}
        >
          <Ionicons name="scan-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        {/* 📥 v24 (v2.13) : import CSV en masse (collage direct) */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => { setImpText(''); setImpResult(null); setImpOpen(true); }}
          accessibilityLabel={t('imp_open')}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={burstLabels}
          disabled={bursting || !items.length || outLoading}
          accessibilityLabel={t('lb_burst')}
        >
          {bursting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="pricetag-outline" size={20} color={colors.text} style={{ opacity: items.length ? 1 : 0.4 }} />
          )}
        </TouchableOpacity>
        {/* ⚠️🏷️ v17 : rafale limitée aux ruptures de stock (rayon à réassortir) */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={burstOutOfStock}
          disabled={bursting || outLoading}
          accessibilityLabel={t('lb_out')}
        >
          {outLoading ? (
            <ActivityIndicator size="small" color={colors.warning} />
          ) : (
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{t(f.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={reload}>
            <Text style={styles.retry}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
            />
          )}
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
            <EmptyState
              ionicon="cube-outline"
              title={search ? t('prod_none_search') : t('prod_none')}
              subtitle={search ? `${t('prod_no_match')} « ${search} ».` : t('prod_none_sub')}
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProductForm', {})}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* 🏷️ v16 — quantité d'étiquettes par produit (×2 mis en avant : cas courant) ; 📦 v20 : option « stock réel » */}
      <PickerModal
        visible={qtyOpen}
        title={t('lb_qty_title')}
        options={[
          { value: 'stock', label: `📦 ${t('lb_stock')}` }, // v20 : 1 étiquette par unité en stock
          ...[1, 2, 3, 5, 10].map((q) => ({
            value: q,
            label: `× ${q} — ${t('lb_qty_total', { total: burstList.length * q })}`,
          })),
        ]}
        value={2}
        onSelect={(q) => { if (q === 'stock') doBurstStock(); else doBurst(q); }}
        onClose={() => setQtyOpen(false)}
      />

      {/* 📥 v24 (v2.13) — modale import CSV (collage direct, zéro dépendance) */}
      <Modal visible={impOpen} transparent animationType="fade" onRequestClose={() => setImpOpen(false)}>
        <View style={styles.impOverlay}>
          <View style={styles.impSheet}>
            <View style={styles.impHead}>
              <Text style={styles.impTitle}>📥 {t('imp_title')}</Text>
              <TouchableOpacity onPress={() => setImpOpen(false)}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.impHint}>{t('imp_hint')}</Text>
            {impResult ? (
              <View>
                <Text style={styles.impDone}>
                  {t('imp_done', { created: impResult.created ?? 0, updated: impResult.updated ?? 0, errors: (impResult.errors ?? []).length })}
                </Text>
                {(impResult.errors ?? []).slice(0, 8).map((e, i) => (
                  <Text key={i} style={styles.impErr}>
                    ⚠️ {t('imp_err_line', { line: e.line, msg: `${e.sku ? e.sku + ' — ' : ''}${e.message}` })}
                  </Text>
                ))}
                <TouchableOpacity style={styles.impBtn} onPress={() => setImpOpen(false)}>
                  <Text style={styles.impBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.impInput}
                  multiline
                  numberOfLines={7}
                  placeholder={t('imp_paste_ph')}
                  placeholderTextColor={colors.muted}
                  value={impText}
                  onChangeText={setImpText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.impCheckRow} onPress={() => setImpCreate((v) => !v)}>
                  <Text style={{ fontSize: 16 }}>{impCreate ? '☑️' : '⬜'}</Text>
                  <Text style={styles.impCheckText}>{t('imp_create_missing')}</Text>
                </TouchableOpacity>
                {impPreview ? (
                  impFatal ? (
                    <Text style={styles.impErr}>⚠️ {t('imp_headers_ko')}</Text>
                  ) : (
                    <Text style={styles.impMeta}>
                      ✅ {impPreview.rows.length} · ⚠️ {impPreview.errors.length} {t('imp_errors')}
                      {impPreview.ignored.length ? ` · ${t('imp_ignored', { cols: impPreview.ignored.join(', ') })}` : ''}
                    </Text>
                  )
                ) : (
                  <Text style={styles.impMetaDim}>{t('imp_empty')}</Text>
                )}
                <TouchableOpacity
                  style={[styles.impBtn, (!impPreview?.rows?.length || impBusy) ? { opacity: 0.4 } : null]}
                  onPress={doImport}
                  disabled={!impPreview?.rows?.length || impBusy}
                >
                  {impBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.impBtnText}>📥 {t('imp_btn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cacheNotice: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cacheText: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', padding: 16, paddingBottom: 8 },
  search: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  scanBtn: {
    marginLeft: 10,
    width: 46,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
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
  fabText: { color: '#fff', fontSize: 28, marginTop: -2 },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  retry: { color: colors.accent, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  // 📥 v24 (v2.13) — modale import CSV
  impOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  impSheet: { backgroundColor: colors.card, borderRadius: 16, padding: 16, maxHeight: '92%' },
  impHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  impTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  impClose: { color: colors.muted, fontSize: 18, padding: 4 },
  impHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  impInput: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: 10, padding: 10,
    fontSize: 12, fontFamily: 'monospace', minHeight: 120, textAlignVertical: 'top',
  },
  impCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  impCheckText: { color: colors.text, fontSize: 13, flex: 1 },
  impMeta: { color: colors.text, fontSize: 12, marginTop: 8 },
  impMetaDim: { color: colors.muted, fontSize: 12, marginTop: 8 },
  impErr: { color: colors.danger, fontSize: 11, marginTop: 4 },
  impDone: { color: colors.success, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  impBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginTop: 12,
  },
  impBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
