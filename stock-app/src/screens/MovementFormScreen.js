import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { useNetwork } from '../context/NetworkContext';
import { queueMovement, uuid } from '../utils/offlineQueue';
import { colors } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';

// Clés de traduction des motifs (affichées via t())
const REASON_KEYS = {
  in: ['r_purchase', 'r_restock', 'r_customer_return', 'r_inventory', 'r_other'],
  out: ['r_sale', 'r_damage', 'r_supplier_return', 'r_inventory', 'r_other'],
};

export default function MovementFormScreen({ route, navigation }) {
  const { t } = useLocale();
  const { product } = route.params;
  const { isOnline, refreshPending } = useNetwork();

  const [type, setType] = useState(route.params?.type === 'out' ? 'out' : 'in');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(
    String(type === 'in' ? product.purchase_price : product.sale_price)
  );
  const [reasonKey, setReasonKey] = useState(type === 'out' ? 'r_sale' : 'r_restock');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reason = t(reasonKey); // motif envoyé à l'API (langue courante)

  const switchType = (nt) => {
    setType(nt);
    setUnitPrice(String(nt === 'in' ? product.purchase_price : product.sale_price));
    setReasonKey(nt === 'out' ? 'r_sale' : 'r_restock');
  };

  const save = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      setError(t('mf_qty_invalid'));
      return;
    }
    if (type === 'out' && qty > (product.shop_stock ?? product.quantity) && isOnline) { // 🏬📦 v13 : stock de l'emplacement
      setError(t('mf_insufficient', { qty: product.shop_stock ?? product.quantity }));
      return;
    }

    const payload = {
      client_uuid: uuid(),
      product_id: product.id,
      type,
      quantity: qty,
      unit_price: parseFloat((unitPrice || '0').replace(',', '.')) || null,
      reason: reason || null,
      reference: reference.trim() || null,
    };

    // ---------- MODE HORS LIGNE : file d'attente ----------
    if (!isOnline) {
      await queueMovement({
        ...payload,
        product_name: product.name,
        queued_at: new Date().toISOString(),
      });
      await refreshPending();
      Alert.alert(
        t('mf_offline_done'),
        `${t(type === 'in' ? 'mf_in' : 'mf_out')} ${qty} × ${product.name}\n${t('mf_offline_done_msg')}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // ---------- MODE EN LIGNE ----------
    setError(null);
    setSaving(true);
    try {
      await api.post('/movements', payload); // client_uuid → idempotence (double-tap)
      Alert.alert(
        t('mf_done'),
        `${t(type === 'in' ? 'mf_in' : 'mf_out')} ${qty} × ${product.name}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const qty = parseInt(quantity, 10) || 0;
  const after = type === 'in' ? product.quantity + qty : product.quantity - qty;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={styles.productCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productMeta}>
            {product.sku} · {t('mf_stock_current')} :{' '}
            <Text style={{ fontWeight: '800', color: colors.text }}>{product.quantity}</Text>
          </Text>
          {qty > 0 ? (
            <Text style={[styles.afterText, { color: after < 0 ? colors.danger : colors.accent }]}>
              {t('mf_stock_after')} : {after} {after <= product.alert_threshold ? '⚠️' : ''}
            </Text>
          ) : null}
        </View>

        {!isOnline ? (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineText}>{t('mf_offline_hint')}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'in' && { backgroundColor: colors.success, borderColor: colors.success }]}
            onPress={() => switchType('in')}
          >
            <Text style={[styles.typeText, type === 'in' && { color: '#0B0F1A' }]}>{t('mf_in')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'out' && { backgroundColor: colors.danger, borderColor: colors.danger }]}
            onPress={() => switchType('out')}
          >
            <Text style={[styles.typeText, type === 'out' && { color: '#0B0F1A' }]}>{t('mf_out')}</Text>
          </TouchableOpacity>
        </View>

        <Field label={t('mf_qty')} placeholder="0" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
        <Field
          label={t('mf_unit_price')}
          placeholder="0"
          keyboardType="decimal-pad"
          value={unitPrice}
          onChangeText={setUnitPrice}
        />

        <Text style={styles.label}>{t('mf_reason_label')}</Text>
        <View style={styles.reasonsWrap}>
          {REASON_KEYS[type].map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.reasonChip, reasonKey === key && styles.reasonChipActive]}
              onPress={() => setReasonKey(key)}
            >
              <Text style={[styles.reasonText, reasonKey === key && { color: '#fff' }]}>{t(key)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label={t('mf_reference')}
          placeholder={t('mf_reference_ph')}
          value={reference}
          onChangeText={setReference}
        />

        <PrimaryButton
          title={
            !isOnline
              ? t('mf_save_offline')
              : t(type === 'in' ? 'mf_save_in' : 'mf_save_out')
          }
          variant={type === 'in' ? 'success' : 'danger'}
          onPress={save}
          loading={saving}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productName: { fontSize: 17, fontWeight: '800', color: colors.text },
  productMeta: { fontSize: 13, color: colors.muted, marginTop: 3 },
  afterText: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  offlineBox: {
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  offlineText: { color: colors.warning, fontSize: 12.5, fontWeight: '600' },
  typeRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeText: { fontSize: 15, fontWeight: '800', color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  reasonsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  reasonChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
