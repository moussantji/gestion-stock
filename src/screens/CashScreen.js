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
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatDateTime, formatMoney } from '../utils/format';
import { getSavedPrinter, isPrinterAvailable, printZTicket } from '../utils/thermalPrinter';
import EmptyState from '../components/EmptyState';
import CashBalanceChart from '../components/CashBalanceChart';

/** 💵 Caisse : solde global + opérations manuelles (dépenses / apports). Admin/manager. */
export default function CashScreen() {
  const { hasRole } = useAuth();
  const { t } = useLocale();

  // ↩️ 'refund' = sorties auto liées aux avoirs (lecture seule, pas saisissable à la main)
  const CATEGORIES = ['transport', 'supplier', 'salary', 'rent', 'refund', 'other'];

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [closings, setClosings] = useState([]); // 💵 historique des Z
  const [chart, setChart] = useState([]); // 📊 courbe de trésorerie (30 j)
  const [view, setView] = useState('ops'); // 'ops' | 'closings'
  const [printingZ, setPrintingZ] = useState(0); // 🔒🖨 v16 : id du Z en cours d'impression (0 = aucun)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modale opération
  const [formOpen, setFormOpen] = useState(false);
  const [opType, setOpType] = useState('out');
  const [category, setCategory] = useState('other'); // 💵 catégorie de dépense
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    center: { justifyContent: 'center', alignItems: 'center' },
    balanceCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    balanceLabel: { fontSize: 12, fontWeight: '800', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    balanceValue: { fontSize: 30, fontWeight: '900', marginTop: 6 },
    balanceMeta: { fontSize: 11.5, color: c.muted, marginTop: 8 },
    todayRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    todayTile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      alignItems: 'center',
    },
    todayLabel: { fontSize: 11, fontWeight: '700', color: c.muted },
    todayValue: { fontSize: 15, fontWeight: '900', marginTop: 4 },
    salesNote: { fontSize: 11.5, color: c.muted, marginTop: 10, textAlign: 'center' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginTop: 18, marginBottom: 6 },
    hint: { fontSize: 11, color: c.muted, marginBottom: 8 },
    errorBox: { marginTop: 12, backgroundColor: c.dangerBg, borderRadius: 12, padding: 14 },
    errorText: { color: c.danger, fontSize: 13, textAlign: 'center' },
    row: {
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
    reason: { fontSize: 13.5, fontWeight: '700', color: c.text },
    meta: { fontSize: 11, color: c.muted, marginTop: 2 },
    amount: { fontSize: 13.5, fontWeight: '900' },
    actionsRow: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 26,
      flexDirection: 'row',
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 15,
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    actionText: { fontWeight: '900', fontSize: 14 },
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
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 },
    input: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    submit: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
    },
    chartTitle: { color: c.text, fontSize: 13.5, fontWeight: '800', marginBottom: 6 },
    pdfBtn: {
      backgroundColor: c.infoBg,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pdfBtnText: { color: c.info, fontSize: 11.5, fontWeight: '800' },
    closeBtn: {
      backgroundColor: c.infoBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.info,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    closeBtnText: { color: c.info, fontWeight: '800', fontSize: 13.5 },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 14,
      marginBottom: 8,
      gap: 4,
    },
    viewChip: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
    viewChipActive: { backgroundColor: c.primaryBg },
    viewChipText: { fontSize: 12.5, fontWeight: '800', color: c.muted },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catChip: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    catChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    catChipText: { fontSize: 11.5, fontWeight: '700', color: c.muted },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  }));

  const load = async () => {
    setError(null);
    try {
      const [sum, list, z, ch] = await Promise.all([
        api.get('/cash-ops/summary'),
        api.get('/cash-ops'),
        api.get('/cash-ops/closings'),
        // 📊 non bloquant : l'écran reste utilisable si la courbe échoue
        api.get('/cash-ops/chart').catch(() => ({ data: { data: [] } })),
      ]);
      setSummary(sum.data ?? null);
      setItems(list.data?.data ?? []);
      setClosings(z.data?.data ?? []);
      setChart(ch.data?.data ?? []);
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

  const openForm = (type) => {
    setOpType(type);
    setCategory(type === 'out' ? 'other' : 'other');
    setAmount('');
    setReason('');
    setFormOpen(true);
  };

  const save = async () => {
    const value = parseInt(amount, 10) || 0;
    if (value <= 0 || !reason.trim()) {
      Alert.alert('⚠️', t('ca_fill'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/cash-ops', { type: opType, category, amount: value, reason: reason.trim() });
      setFormOpen(false);
      load();
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (op) => {
    if (!hasRole('admin', 'manager')) return;
    Alert.alert(t('ca_delete'), t('ca_delete_msg', { reason: op.reason, amount: formatMoney(op.amount) }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/cash-ops/${op.id}`);
            load();
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  // ---------- 🔒🖨 v16 — Impression thermique Bluetooth d'un Z de caisse ----------
  const printClosingZ = async (z) => {
    if (!z || printingZ) return;
    if (!isPrinterAvailable()) {
      Alert.alert('🖨', t('pr_unavailable_msg')); // dev build requis
      return;
    }
    const saved = await getSavedPrinter();
    if (!saved?.address) {
      Alert.alert(t('pr_no_printer'), t('pr_no_printer_msg'));
      return;
    }
    setPrintingZ(z.id ?? 1);
    try {
      const shop = (await api.get('/shop').catch(() => null))?.data?.shop ?? {};
      await printZTicket(z, shop); // 🔒 en-tête, ventes/apports/dépenses, SOLDE + signature
      Alert.alert('✅', t('cz_print_done'));
    } catch (e) {
      Alert.alert('⚠️', t('cz_print_ko', { msg: getErrorMessage(e) }));
    } finally {
      setPrintingZ(0);
    }
  };

  // ---------- 🔒 Z de caisse (clôture du jour) ----------
  const confirmClose = () => {
    Alert.alert(t('cz_title'), t('cz_msg', {
      in: formatMoney(summary?.today_in ?? 0),
      out: formatMoney(summary?.today_out ?? 0),
    }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('cz_confirm'),
        onPress: async () => {
          try {
            const res = await api.post('/cash-ops/close', {});
            const z = res.data?.data;
            // 🔒🖨 v16 : proposer l'impression du Z tout de suite après la clôture
            Alert.alert('🔒', t('cz_done', { balance: formatMoney(z?.balance ?? 0) }), [
              { text: t('cz_print_now'), onPress: () => printClosingZ(z) },
              { text: 'OK', style: 'cancel' },
            ]);
            load();
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  // 📄 Partage du PDF d'un Z de caisse (téléchargement avec token, puis partage)
  const shareClosingPdf = async (closingId) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const target = `${FileSystem.documentDirectory}Z-caisse-${closingId}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/cash-closings/${closingId}/pdf`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Z de caisse' });
      }
    } catch (e) {
      Alert.alert('⚠️', e?.message ?? getErrorMessage(e));
    }
  };

  const renderClosing = ({ item }) => (
    <View style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: colors.infoBg }]}>
        <Text style={{ fontSize: 16 }}>🔒</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reason}>{formatDateTime(item.closing_date)}</Text>
        <Text style={styles.meta}>
          {t('cz_line', { in: formatMoney(item.total_in ?? 0), out: formatMoney(item.total_out ?? 0) })}
        </Text>
        <Text style={styles.meta}>{item.user?.name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.amount, { color: (item.balance ?? 0) >= 0 ? colors.success : colors.danger }]}>
          {formatMoney(item.balance ?? 0)}
        </Text>
        <TouchableOpacity style={styles.pdfBtn} onPress={() => shareClosingPdf(item.id)}>
          <Text style={styles.pdfBtnText}>📄 {t('cz_pdf')}</Text>
        </TouchableOpacity>
        {/* 🔒🖨 v16 — réimpression thermique Bluetooth du Z (mêmes données que le PDF) */}
        <TouchableOpacity
          style={[styles.pdfBtn, printingZ === item.id && { opacity: 0.6 }]}
          onPress={() => printClosingZ(item)}
          disabled={!!printingZ}
          accessibilityLabel={t('cz_bt')}
        >
          {printingZ === item.id ? (
            <ActivityIndicator size="small" color={colors.info} />
          ) : (
            <Text style={styles.pdfBtnText}>🖨 {t('cz_bt')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isIn = item.type === 'in';
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.85} onLongPress={() => confirmDelete(item)}>
        <View style={[styles.iconBadge, { backgroundColor: isIn ? colors.successBg : colors.dangerBg }]}>
          <Text style={{ fontSize: 16 }}>{isIn ? '⬇️' : '⬆️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text>
          <Text style={styles.meta}>
            {item.category ? `${t(`ca_cat_${item.category}`)} · ` : ''}{item.user?.name} · {formatDateTime(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: isIn ? colors.success : colors.danger }]}>
          {isIn ? '+' : '−'}{formatMoney(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={view === 'ops' ? items : closings}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        renderItem={view === 'ops' ? renderItem : renderClosing}
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
        ListHeaderComponent={
          <>
            {/* ---------- Solde ---------- */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{t('ca_balance')}</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: (summary?.balance ?? 0) >= 0 ? colors.success : colors.danger },
                ]}
              >
                {formatMoney(summary?.balance ?? 0)}
              </Text>
              <Text style={styles.balanceMeta}>
                {t('ca_in_total', { amount: formatMoney(summary?.total_in ?? 0) })}
                {'  ·  '}
                {t('ca_out_total', { amount: formatMoney(summary?.total_out ?? 0) })}
              </Text>
            </View>

            {/* ---------- 📊 Courbe de trésorerie (30 j) ---------- */}
            {chart.length >= 2 ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>📊 {t('ca_chart')}</Text>
                <CashBalanceChart data={chart} />
              </View>
            ) : null}

            {/* ---------- Aujourd'hui ---------- */}
            <View style={styles.todayRow}>
              <View style={[styles.todayTile, { borderColor: colors.success }]}>
                <Text style={styles.todayLabel}>{t('ca_today_in')}</Text>
                <Text style={[styles.todayValue, { color: colors.success }]}>
                  +{formatMoney(summary?.today_in ?? 0)}
                </Text>
              </View>
              <View style={[styles.todayTile, { borderColor: colors.danger }]}>
                <Text style={styles.todayLabel}>{t('ca_today_out')}</Text>
                <Text style={[styles.todayValue, { color: colors.danger }]}>
                  −{formatMoney(summary?.today_out ?? 0)}
                </Text>
              </View>
            </View>
            <Text style={styles.salesNote}>
              {t('ca_sales_today', { amount: formatMoney(summary?.sales_collected_today ?? 0) })}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.closeBtn} onPress={confirmClose} activeOpacity={0.85}>
              <Text style={styles.closeBtnText}>{t('cz_action')}</Text>
            </TouchableOpacity>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewChip, view === 'ops' && styles.viewChipActive]}
                onPress={() => setView('ops')}
              >
                <Text style={[styles.viewChipText, view === 'ops' && { color: colors.primary }]}>{t('ca_history')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewChip, view === 'closings' && styles.viewChipActive]}
                onPress={() => setView('closings')}
              >
                <Text style={[styles.viewChipText, view === 'closings' && { color: colors.primary }]}>{t('cz_list')} ({closings.length})</Text>
              </TouchableOpacity>
            </View>
            {view === 'ops' && items.length > 0 ? <Text style={styles.hint}>{t('ca_delete_hint')}</Text> : null}
          </>
        }
        ListEmptyComponent={
          view === 'ops'
            ? <EmptyState icon="💵" title={t('ca_none')} subtitle={t('ca_none_sub')} />
            : <EmptyState icon="🔒" title={t('cz_none')} subtitle={t('cz_none_sub')} />
        }
      />

      {/* ---------- Boutons ---------- */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}
          onPress={() => openForm('in')}
        >
          <Text style={[styles.actionText, { color: colors.success }]}>{t('ca_add_in')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
          onPress={() => openForm('out')}
        >
          <Text style={[styles.actionText, { color: colors.danger }]}>{t('ca_add_out')}</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- Modale ---------- */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFormOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {opType === 'in' ? t('ca_add_in') : t('ca_add_out')}
            </Text>
            <Text style={styles.label}>{t('ca_amount')}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder={t('sale_paid_ph')}
              placeholderTextColor={colors.muted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>{t('ca_category')}</Text>
            <View style={styles.catRow}>
              {CATEGORIES.filter((c) => c !== 'refund').map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, category === c && styles.catChipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catChipText, category === c && { color: '#fff' }]}>
                    {t(`ca_cat_${c}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>{t('ca_reason')}</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder={opType === 'in' ? t('ca_reason_in_ph') : t('ca_reason_out_ph')}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={[
                styles.submit,
                { backgroundColor: opType === 'in' ? colors.success : colors.danger },
                saving && { opacity: 0.6 },
              ]}
              onPress={save}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('save')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

