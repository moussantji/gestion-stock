import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,

  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatMoney } from '../utils/format';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';

/** 👥 CRM : liste des clients + crédit regroupé par client + création/édition. */
export default function CustomersScreen({ navigation }) {
  const { t } = useLocale();
  const { hasRole } = useAuth();

  const SEGMENTS = ['all', 'loyal', 'credit', 'inactive'];

  const [items, setItems] = useState([]);
  const [segment, setSegment] = useState('all'); // 👥 segments
  const [notifying, setNotifying] = useState(false);
  // 🎯 Seuils configurables (Réglages boutique) — repli sur les défauts
  const [thresholds, setThresholds] = useState({ loyal: 5, inactive: 60 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modale création / édition
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // client en cours d'édition
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    search: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: c.text,
      margin: 16,
      marginBottom: 4,
    },
    hint: { fontSize: 11, color: c.muted, marginBottom: 8 },
    segRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 8, flexWrap: 'wrap' },
    segChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    segChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    segChipText: { fontSize: 11.5, fontWeight: '700', color: c.muted },
    segHint: { color: c.muted, fontSize: 11, paddingHorizontal: 18, marginTop: 6 },
    tierLabel: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 6 },
    tierRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    tierChip: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tierChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    tierChipText: { color: c.muted, fontSize: 13, fontWeight: '700' },
    tierHint: { color: c.info, fontSize: 11.5, marginTop: -4, marginBottom: 10 },
    notifyBtn: {
      alignSelf: 'flex-start',
      marginLeft: 16,
      marginTop: 8,
      backgroundColor: c.infoBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.info,
      paddingHorizontal: 12,
      paddingVertical: 7,
      minWidth: 120,
      alignItems: 'center',
    },
    notifyText: { color: c.info, fontWeight: '800', fontSize: 12 },
    errorBox: { margin: 16, backgroundColor: c.dangerBg, borderRadius: 12, padding: 14 },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
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
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primaryBg,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 16, fontWeight: '900', color: c.primary },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    meta: { fontSize: 11, color: c.muted, marginTop: 2 },
    credit: { fontSize: 11.5, color: c.warning, fontWeight: '700', marginTop: 2 },
    spent: { fontSize: 13.5, fontWeight: '900', color: c.accent, marginLeft: 8 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 30,
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
    fabText: { fontSize: 26, color: '#fff', marginTop: -2 },
    overlay: { flex: 1, backgroundColor: 'rgba(3,6,18,0.65)' },
    sheet: {
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
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 12 },
    submit: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  }));

  const load = async (q = search, seg = segment) => {
    setError(null);
    try {
      const params = q.trim() ? { q: q.trim() } : {};
      if (seg !== 'all') params.segment = seg;
      const res = await api.get('/customers', { params });
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
      // 🎯 Seuils actuels (non bloquant : défauts 5/60 si échec)
      api.get('/shop').then((res) => {
        const th = res.data?.shop?.thresholds;
        if (th) {
          setThresholds({
            loyal: th.segment_loyal_min ?? 5,
            inactive: th.segment_inactive_days ?? 60,
          });
        }
      }).catch(() => {});
    }, [])
  );

  const switchSegment = (key) => {
    if (key === segment) return;
    setSegment(key);
    setLoading(true);
    load(undefined, key); // segment passé explicitement (évite la closure périmée)
  };

  // 📣 Push staff : relancer un segment (admin/manager côté API)
  const notifySegment = async () => {
    setNotifying(true);
    try {
      const res = await api.post('/customers/notify-segment', { segment });
      Alert.alert('📣', t('cu_notified', { clients: res.data?.clients ?? 0, notified: res.data?.notified ?? 0 }));
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setNotifying(false);
    }
  };

  const openForm = (customer = null) => {
    setEditing(customer);
    setForm({
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      price_tier: customer?.price_tier ?? 'retail', // 👥 détail/gros
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('⚠️', t('cu_name_required'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        price_tier: form.price_tier ?? 'retail', // 👥
      };
      if (editing) {
        await api.put(`/customers/${editing.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // 💳 v24 (v2.13) : badge échéance planifiée (clés additives — vieux serveur : null → masqué)
  const planLine = (item) => {
    if (item.next_payment_date == null || Number(item.credit_balance ?? 0) <= 0) return null;
    const d = Number(item.days_until ?? 0);
    if (d < 0) return { txt: `📅 ${t('pl_due_late', { n: -d })}`, color: colors.danger };
    if (d === 0) return { txt: `📅 ${t('pl_due_today')}`, color: colors.warning };
    if (d === 1) return { txt: `📅 ${t('pl_due_tomorrow')}`, color: colors.warning };
    return { txt: `📅 ${t('pl_due_in', { n: d })}`, color: colors.muted };
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, name: item.name })}
      onLongPress={() => openForm(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}{item.price_tier === 'wholesale' ? '  🏷' : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.phone ?? '—'} · {t('cu_receipts', { count: item.receipts_count ?? 0 })}
          {(item.loyalty_points ?? 0) > 0 ? ` · 🎁 ${item.loyalty_points}` : ''}
        </Text>
        <Text style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.credit_balance > 0 ? (
            <Text style={styles.credit}>{t('cu_credit_line', { amount: formatMoney(item.credit_balance) })}</Text>
          ) : null}
          {planLine(item) ? (
            <Text style={{ fontSize: 11, color: planLine(item).color }}>
              {item.credit_balance > 0 ? ' · ' : ''}{planLine(item).txt}
            </Text>
          ) : null}
        </Text>
      </View>
      <Text style={styles.spent}>{formatMoney(item.spent_total ?? 0)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TextInput
        style={styles.search}
        placeholder={t('cu_search_ph')}
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => load(search)}
        returnKeyType="search"
      />

      {/* 👥 Segments (seuils configurables dans Réglages boutique) */}
      <View style={styles.segRow}>
        {SEGMENTS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.segChip, segment === key && styles.segChipActive]}
            onPress={() => switchSegment(key)}
          >
            <Text style={[styles.segChipText, segment === key && { color: '#fff' }]}>
              {t(`cu_seg_${key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {segment === 'loyal' || segment === 'inactive' ? (
        <Text style={styles.segHint}>
          {segment === 'loyal'
            ? t('seg_loyal_hint', { n: thresholds.loyal })
            : t('seg_inactive_hint', { n: thresholds.inactive })}
        </Text>
      ) : null}

      {segment !== 'all' && hasRole('admin', 'manager') ? (
        <TouchableOpacity style={styles.notifyBtn} onPress={notifySegment} disabled={notifying}>
          {notifying
            ? <ActivityIndicator color={colors.info} size="small" />
            : <Text style={styles.notifyText}>{t('cu_notify')}</Text>}
        </TouchableOpacity>
      ) : null}

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
          ListEmptyComponent={
            <EmptyState icon="👥" title={t('cu_none')} subtitle={t('cu_none_sub')} />
          }
          ListHeaderComponent={
            items.length > 0 ? <Text style={styles.hint}>{t('cu_edit_hint')}</Text> : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openForm()}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modale création / édition */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFormOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? t('cu_edit') : t('cu_new')}</Text>
            <Field label={t('cu_name')} placeholder={t('cu_name_ph')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label={t('cu_phone')} placeholder={t('cu_phone_ph')} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            {/* 👥 Niveau de prix : détail / gros */}
            <Text style={styles.tierLabel}>{t('cu_tier')}</Text>
            <View style={styles.tierRow}>
              {['retail', 'wholesale'].map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[styles.tierChip, form.price_tier === tier && styles.tierChipActive]}
                  onPress={() => setForm((f) => ({ ...f, price_tier: tier }))}
                >
                  <Text style={[styles.tierChipText, form.price_tier === tier && { color: '#fff' }]}>
                    {tier === 'retail' ? t('cu_tier_retail') : `🏷 ${t('cu_tier_wholesale')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.price_tier === 'wholesale' ? (
              <Text style={styles.tierHint}>{t('cu_tier_hint')}</Text>
            ) : null}
            <Field label={t('cu_address')} placeholder={t('cu_address_ph')} value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
            <Field label={t('cu_notes')} placeholder={t('cu_notes_ph')} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />
            <TouchableOpacity style={[styles.submit, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('save')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

