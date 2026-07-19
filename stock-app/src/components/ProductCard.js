import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { mediaUrl } from '../config';
import { formatMoney } from '../utils/format';
import { promoActive } from '../utils/promo'; // 🏷️ v22

/** Ligne produit dans les listes (avec photo).
 *  🏬📦 v13 : affiche le stock de MON emplacement (shop_stock) si non null. */
export default function ProductCard({ product, onPress }) {
  const eff = product.shop_stock ?? product.quantity; // null = mono-stock → global
  const qtyColor = eff === 0 ? colors.danger : product.is_low_stock ? colors.warning : colors.success;
  const qtyBg = eff === 0 ? colors.dangerBg : product.is_low_stock ? colors.warningBg : colors.successBg;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Photo ou placeholder */}
      {product.image_url ? (
        <Image source={{ uri: mediaUrl(product.image_url) }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 20 }}>📦</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.sku}
          {product.category ? `  ·  ${product.category.name}` : ''}
        </Text>
        {/* 🏷️ v22 : promo active (clés additives serveur — vieux serveur = prix normal) */}
        {promoActive(product) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.price}>{formatMoney(product.promo_price)}</Text>
            <Text style={styles.promoOld}>{formatMoney(product.sale_price)}</Text>
            <Text style={styles.promoTag}>🏷️</Text>
          </View>
        ) : (
          <Text style={styles.price}>{formatMoney(product.sale_price)}</Text>
        )}
      </View>

      <View style={[styles.qtyBadge, { backgroundColor: qtyBg }]}>
        <Text style={[styles.qty, { color: qtyColor }]}>{eff}</Text>
        <Text style={[styles.qtyLabel, { color: qtyColor }]}>
          {eff === 0 ? 'rupture' : product.is_low_stock ? 'bas' : product.shop_stock != null ? 'boutique' : 'en stock'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: colors.cardAlt,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  price: { fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 4 },
  promoOld: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through', marginTop: 4 },
  promoTag: { fontSize: 11, marginTop: 4 },
  qtyBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', marginLeft: 10 },
  qty: { fontSize: 17, fontWeight: '800' },
  qtyLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
});
