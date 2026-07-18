import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';
import { formatDateTime, formatMoney } from '../utils/format';
import EmptyState from '../components/EmptyState';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

export default function ProductDetailScreen({ route, navigation }) {
  // 🏷️ Partage de l'étiquette code-barres PDF (planche A4 d'une étiquette)
  const shareLabel = async (product) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const target = `${FileSystem.documentDirectory}etiquette-${product.sku}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/products-labels.pdf?ids=${product.id}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: product.sku });
      }
    } catch (e) {
      Alert.alert('⚠️', e?.message ?? getErrorMessage(e));
    }
  };

  const { t } = useLocale();
  const { productId } = route.params;
  const { hasRole } = useAuth();
  const { isOnline } = useNetwork();

  // Fallback hors ligne : produit passé depuis la liste (qui vient du cache)
  const [product, setProduct] = useState(route.params?.product ?? null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  const fetchProduct = async () => {
    setError(null);
    try {
      const res = await api.get(`/products/${productId}`);
      setProduct(res.data.data);
      setStale(false);
    } catch (e) {
      if (!product) setError(getErrorMessage(e));
      else setStale(true); // on garde les données locales
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProduct();
    }, [productId])
  );

  const confirmDelete = () => {
    Alert.alert(t('pd_delete_title'), t('pd_delete_msg', { name: product.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${product.id}`);
            navigation.goBack();
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (error && !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchProduct}>
          <Text style={styles.retry}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const qtyColor =
    product.quantity === 0 ? colors.danger : product.is_low_stock ? colors.warning : colors.success;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchProduct();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {stale ? (
        <View style={styles.staleNotice}>
          <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600' }}>{t('pd_stale')}</Text>
        </View>
      ) : null}

      {/* Photo */}
      {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.photo} /> : null}

      {/* En-tête */}
      <View style={styles.headerCard}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.sku}>{product.sku}</Text>
        <View style={styles.stockRow}>
          <View>
            <Text style={[styles.bigQty, { color: qtyColor }]}>{product.quantity}</Text>
            <Text style={styles.unit}>{t('pd_units')}</Text>
          </View>
          {product.is_low_stock ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {product.quantity === 0 ? t('pd_out_of_stock') : t('pd_low_stock')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.thresholdHint}>
          {t('pd_threshold')} : {product.alert_threshold}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success, marginRight: 8 }]}
          onPress={() => navigation.navigate('MovementForm', { product, type: 'in' })}
        >
          <Text style={styles.actionIcon}>⬇️</Text>
          <Text style={styles.actionText}>{t('pd_in')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.danger, marginLeft: 8 }]}
          onPress={() => navigation.navigate('MovementForm', { product, type: 'out' })}
        >
          <Text style={styles.actionIcon}>⬆️</Text>
          <Text style={styles.actionText}>{t('pd_out')}</Text>
        </TouchableOpacity>
      </View>

      {/* 🏬📦 Stock par emplacement (v13 — visible si le produit a des buckets) */}
      {(product.stocks ?? []).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏬 {t('pd_stocks_title')}</Text>
          {product.stocks.map((s) => (
            <View key={s.shop_id ?? 'hq'} style={styles.placeRow}>
              <Text style={styles.placeName}>
                {s.shop_id === null ? '🏠' : '🏬'} {s.name}
              </Text>
              <Text style={[styles.placeQty, { color: s.quantity === 0 ? colors.danger : colors.text }]}>
                {s.quantity}
              </Text>
            </View>
          ))}
          <Text style={styles.placeHint}>{t('pd_stocks_hint')}</Text>
        </View>
      ) : null}

      {/* Infos */}
      <View style={styles.card}>
        <InfoRow label={t('pd_category')} value={product.category?.name} />
        <InfoRow label={t('pd_supplier')} value={product.supplier?.name} />
        <InfoRow label={t('pd_barcode')} value={product.barcode} />
        <InfoRow label={t('pd_purchase')} value={formatMoney(product.purchase_price)} />
        <InfoRow label={t('pd_sale')} value={formatMoney(product.sale_price)} />
        <InfoRow label={t('pd_value')} value={formatMoney(product.stock_value)} />
        {product.description ? <InfoRow label={t('pd_description')} value={product.description} /> : null}
      </View>

      {/* Mouvements récents */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('pd_movements')}</Text>
        {product.movements?.length ? (
          product.movements.map((m) => (
            <View key={m.id} style={styles.moveRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.moveReason}>
                  {m.reason ?? t(m.type === 'in' ? 'pd_in' : 'pd_out')}
                </Text>
                <Text style={styles.moveMeta}>
                  {m.user?.name} · {formatDateTime(m.created_at)}
                </Text>
              </View>
              <Text style={[styles.moveQty, { color: m.type === 'in' ? colors.success : colors.danger }]}>
                {m.type === 'in' ? '+' : '-'}
                {m.quantity}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            icon="🔄"
            title={isOnline ? t('pd_no_moves') : t('pd_offline_moves')}
          />
        )}
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProductForm', { product })}>
        <Text style={styles.editBtnText}>{t('pd_edit')}</Text>
      </TouchableOpacity>

      {/* 🏷️ Étiquette code-barres PDF */}
      <TouchableOpacity style={styles.labelBtn} onPress={() => shareLabel(product)}>
        <Text style={styles.labelBtnText}>{t('pd_label')}</Text>
      </TouchableOpacity>

      {hasRole('admin', 'manager') ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteBtnText}>{t('pd_delete')}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  errorText: { color: colors.danger, textAlign: 'center' },
  retry: { color: colors.accent, fontWeight: '700', marginTop: 10 },
  staleNotice: {
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: colors.cardAlt,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  sku: { fontSize: 13, color: colors.muted, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  bigQty: { fontSize: 38, fontWeight: '900' },
  unit: { fontSize: 12, color: colors.muted },
  alertBadge: { backgroundColor: colors.warningBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  alertBadgeText: { fontSize: 12, fontWeight: '700', color: colors.warning },
  thresholdHint: { fontSize: 11, color: colors.muted, marginTop: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionIcon: { fontSize: 20 },
  actionText: { color: '#0B0F1A', fontWeight: '800', fontSize: 15, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  placeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeName: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  placeQty: { fontSize: 15, fontWeight: '800' },
  placeHint: { fontSize: 11, color: colors.muted, marginTop: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.muted },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.text, maxWidth: '60%', textAlign: 'right' },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moveReason: { fontSize: 13, fontWeight: '600', color: colors.text },
  moveMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  moveQty: { fontSize: 16, fontWeight: '800' },
  labelBtn: {
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.info,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  labelBtnText: { color: colors.info, fontWeight: '800', fontSize: 14 },
  editBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  editBtnText: { color: colors.primary, fontWeight: '700' },
  deleteBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { color: colors.danger, fontWeight: '700' },
});
