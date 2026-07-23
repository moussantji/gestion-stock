import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatDate, formatMoney } from '../utils/format';
import EmptyState from '../components/EmptyState';
import PickerModal from '../components/PickerModal';
import PrimaryButton from '../components/PrimaryButton';

/**
 * 🔁 Ventes récurrentes / abonnements clients (dépôt-vente, réguliers).
 * Chaque échéance (cron 06:30 ou ⚡ manuel) génère une vente À CRÉDIT.
 * Réservé admin/manager.
 */
export default function RecurringSalesScreen() {
  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { color: c.text, fontSize: 15, fontWeight: '800' },
    sub: { color: c.muted, fontSize: 12, marginTop: 2 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    meta: { color: c.muted, fontSize: 12, marginTop: 6 },
    cardFoot: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    total: { color: c.accent, fontSize: 15, fontWeight: '800' },
    miniBtn: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
    fab: {
      position: 'absolute',
      bottom: 22,
      left: 16,
      right: 16,
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    fabText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: c.bgAlt,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 18,
      maxHeight: '82%',
    },
    sheetTitle: { color: c.text, fontSize: 17, fontWeight: '800', marginBottom: 14 },
    fieldLabel: { color: c.text, fontSize: 12.5, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    select: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: c.text,
      fontSize: 14,
    },
    freqRow: { flexDirection: 'row', gap: 8 },
    freqChip: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 11,
      alignItems: 'center',
    },
    freqChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    freqText: { color: c.muted, fontSize: 13.5, fontWeight: '700' },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
      marginBottom: 8,
    },
    lineName: { color: c.text, fontSize: 13.5, fontWeight: '700' },
    priceInput: {
      color: c.accent,
      fontSize: 12.5,
      fontWeight: '700',
      paddingVertical: 2,
    },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { color: c.text, fontSize: 14, fontWeight: '800' },
    stepValue: { color: c.text, fontWeight: '800', minWidth: 20, textAlign: 'center' },
    addLine: {
      borderRadius: 10,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.primary,
      paddingVertical: 11,
      alignItems: 'center',
      marginTop: 2,
    },
    creditNote: { color: c.muted, fontSize: 11.5, marginTop: 12, lineHeight: 16 },
    errorBox: { backgroundColor: c.dangerBg, borderRadius: 10, padding: 10, marginBottom: 10 },
    errorText: { color: c.danger, fontSize: 12.5, fontWeight: '600' },
  }));
  const { hasRole } = useAuth();
  const { t } = useLocale();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ---- Modale de création ----
  const [formOpen, setFormOpen] = useState(false);
  const [customers, setCustomers] = useState([]); // options PickerModal
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [frequency, setFrequency] = useState('weekly');
  const [label, setLabel] = useState('');
  const [firstDate, setFirstDate] = useState(''); // AAAA-MM-JJ
  const [lines, setLines] = useState([]); // [{product_id,name,qty,price}]
  const [customerPicker, setCustomerPicker] = useState(false);
  const [productPicker, setProductPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await api.get('/recurring-sales');
      setItems(res.data?.data ?? []);
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
    }, [])
  );

  const openForm = async () => {
    setCustomerId(null);
    setFrequency('weekly');
    setLabel('');
    setFirstDate('');
    setLines([]);
    setFormOpen(true);
    // Charge les listes à la demande (une fois)
    try {
      if (customers.length === 0) {
        const res = await api.get('/customers', { params: { all: 1 } });
        setCustomers(
          (res.data?.data ?? []).map((c) => ({
            label: `${c.name}${c.phone ? ' · ' + c.phone : ''}`,
            value: c.id,
          }))
        );
      }
      if (products.length === 0) {
        const res = await api.get('/products', { params: { per_page: 200 } });
        const list = res.data?.data?.data ?? res.data?.data ?? [];
        setProducts(
          list.map((p) => ({
            label: `${p.name} (${p.quantity ?? 0} · ${formatMoney(p.sale_price)})`,
            value: p.id,
            price: p.sale_price,
            name: p.name,
          }))
        );
      }
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    }
  };

  const addProduct = (productId) => {
    const opt = products.find((p) => p.value === productId);
    if (!opt) return;
    if (lines.some((l) => l.product_id === productId)) return; // déjà dans la liste
    setLines((prev) => [
      ...prev,
      { product_id: productId, name: opt.name, qty: 1, price: String(opt.price ?? 0) },
    ]);
  };

  const bumpLine = (productId, delta) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === productId ? { ...l, qty: Math.max(1, Math.min(9999, l.qty + delta)) } : l
      )
    );
  };

  const changePrice = (productId, text) => {
    setLines((prev) =>
      prev.map((l) => (l.product_id === productId ? { ...l, price: text.replace(/[^0-9]/g, '') } : l))
    );
  };

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  };

  const submit = async () => {
    if (!customerId) {
      Alert.alert('🔁', t('rs_no_customer'));
      return;
    }
    if (lines.length === 0) {
      Alert.alert('🔁', t('rs_no_items'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/recurring-sales', {
        customer_id: customerId,
        label: label.trim() || undefined,
        frequency,
        next_run_at: /^\d{4}-\d{2}-\d{2}$/.test(firstDate.trim()) ? firstDate.trim() : undefined,
        items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.qty,
          unit_price: parseInt(l.price || '0', 10),
        })),
      });
      setFormOpen(false);
      Alert.alert('✅', t('rs_created'));
      load();
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // ---- Actions sur un abonnement ----
  const runNow = (sale) => {
    Alert.alert(t('rs_run_title'), t('rs_run_msg', { name: sale.customer?.name ?? '' }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('rs_run'),
        onPress: async () => {
          try {
            const res = await api.post(`/recurring-sales/${sale.id}/run`);
            Alert.alert('✅', t('rs_run_ok', { number: res.data?.data?.number ?? '' }));
            load();
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const toggleStatus = async (sale) => {
    try {
      await api.put(`/recurring-sales/${sale.id}`, {
        status: sale.status === 'active' ? 'paused' : 'active',
      });
      load();
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    }
  };

  const confirmDelete = (sale) => {
    Alert.alert(t('rs_del_title'), t('rs_del_msg', { name: sale.customer?.name ?? '' }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('rs_del_confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring-sales/${sale.id}`);
            load();
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const selectedCustomer = customers.find((c) => c.value === customerId);

  if (!hasRole('admin', 'manager')) {
    return (
      <View style={[styles.container, styles.center]}>
        <EmptyState icon="🔒" title={t('set_forbidden')} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const active = item.status === 'active';
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.label || item.customer?.name || `#${item.id}`}
            </Text>
            {item.label ? (
              <Text style={styles.sub} numberOfLines={1}>{item.customer?.name}</Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: active ? colors.successBg : colors.warningBg }]}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: active ? colors.success : colors.warning }}>
              {active ? t('rs_active') : t('rs_paused')}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {item.frequency === 'monthly' ? `📅 ${t('rs_monthly')}` : `📅 ${t('rs_weekly')}`}
          {'  ·  '}{t('rs_next', { date: formatDate(item.next_run_at) })}
        </Text>
        <Text style={styles.meta}>
          {(item.items ?? []).map((l) => `${l.quantity}× ${l.product?.name ?? ''}`).join(' · ')}
        </Text>

        <View style={styles.cardFoot}>
          <Text style={styles.total}>{formatMoney(item.total ?? 0)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.primaryBg }]} onPress={() => runNow(item)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{t('rs_run')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.cardAlt }]} onPress={() => toggleStatus(item)}>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>
                {active ? t('rs_pause') : t('rs_resume')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.dangerBg }]} onPress={() => confirmDelete(item)}>
              <Text style={{ fontSize: 12 }}>{t('rs_delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        renderItem={renderItem}
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
        ListHeaderComponent={error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}
        ListEmptyComponent={
          <EmptyState icon="🔁" title={t('rs_empty')} subtitle={t('rs_empty_sub')} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openForm} activeOpacity={0.9}>
        <Text style={styles.fabText}>{t('rs_new')}</Text>
      </TouchableOpacity>

      {/* ---------- Modale de création ---------- */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFormOpen(false)} />
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{t('rs_new')}</Text>

              <Text style={styles.fieldLabel}>{t('rs_customer')}</Text>
              <TouchableOpacity style={styles.select} onPress={() => setCustomerPicker(true)}>
                <Text style={{ color: selectedCustomer ? colors.text : colors.muted, fontSize: 14 }}>
                  {selectedCustomer ? selectedCustomer.label : t('rs_pick_customer')}
                </Text>
                <Text style={{ color: colors.muted }}>▾</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>{t('rs_frequency')}</Text>
              <View style={styles.freqRow}>
                {['weekly', 'monthly'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqChip, frequency === f && styles.freqChipActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.freqText, frequency === f && { color: '#fff' }]}>
                      {f === 'weekly' ? t('rs_weekly') : t('rs_monthly')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('rs_label')}</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder={t('rs_label_ph')}
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>{t('rs_first')}</Text>
              <TextInput
                style={styles.input}
                value={firstDate}
                onChangeText={setFirstDate}
                placeholder={t('rs_first_ph')}
                placeholderTextColor={colors.muted}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>{t('rs_items')}</Text>
              {lines.map((l) => (
                <View key={l.product_id} style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      value={l.price}
                      onChangeText={(text) => changePrice(l.product_id, text)}
                    />
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => bumpLine(l.product_id, -1)}>
                      <Text style={styles.stepText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{l.qty}</Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => bumpLine(l.product_id, 1)}>
                      <Text style={styles.stepText}>＋</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeLine(l.product_id)} style={{ padding: 6 }}>
                    <Text style={{ color: colors.danger, fontSize: 15 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addLine} onPress={() => setProductPicker(true)}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>{t('rs_add')}</Text>
              </TouchableOpacity>

              <Text style={styles.creditNote}>{t('rs_credit_note')}</Text>

              <PrimaryButton
                title={t('rs_create')}
                onPress={submit}
                loading={saving}
                style={{ marginTop: 6 }}
              />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal
        visible={customerPicker}
        title={t('rs_customer')}
        options={customers}
        value={customerId}
        onSelect={setCustomerId}
        onClose={() => setCustomerPicker(false)}
      />
      <PickerModal
        visible={productPicker}
        title={t('rs_items')}
        options={products}
        value={null}
        onSelect={addProduct}
        onClose={() => setProductPicker(false)}
      />
    </View>
  );
}

