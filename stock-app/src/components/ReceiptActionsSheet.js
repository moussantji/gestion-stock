import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { buildReceiptText } from '../utils/receiptText'; // 🧾 v2.8 : reçu texte WhatsApp
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import {
  getSavedPrinter,
  isPrinterAvailable,
  printReceiptTicket,
} from '../utils/thermalPrinter';
import ReceiptImage from './ReceiptImage';

/**
 * 🧾 Feuille d'actions d'un reçu : PDF A5 · ticket 80mm · image PNG · Bluetooth
 * · ↩️ avoir partiel (par ligne) · ↩️ avoir total.
 * onChanged() est rappelé après un avoir (pour rafraîchir les listes).
 */
export default function ReceiptActionsSheet({ receipt, onClose, navigation, onChanged }) {
  const { t } = useLocale();
  const { hasRole } = useAuth();
  const [busy, setBusy] = useState(null); // 'pdf' | 'ticket' | 'img' | 'bt' | 'refund' | 'partial'
  const refunded = receipt?.status === 'refunded';

  // 📱 Capture image
  const shotRef = useRef(null);
  const [shotData, setShotData] = useState(null);

  // ↩️ Mode avoir partiel
  const [mode, setMode] = useState('actions'); // 'actions' | 'partial'
  const [lines, setLines] = useState([]); // { id, name, max, qty }
  const [refundCash, setRefundCash] = useState(false); // ↩️💵 rembourser via la caisse

  const visible = !!receipt;

  const resetAndClose = () => {
    setMode('actions');
    setLines([]);
    setRefundCash(false);
    onClose();
  };

  // ---------- Partage PDF ----------
  const sharePdf = async (kind) => {
    setBusy(kind);
    try {
      const token = await SecureStore.getItemAsync('token');
      const prefix = kind === 'ticket' ? 'ticket' : 'recu';
      const target = `${FileSystem.documentDirectory}${prefix}-${receipt.number}.pdf`;
      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/receipts/${receipt.id}/${kind}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      resetAndClose();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: receipt.number });
      }
    } catch (e) {
      Alert.alert('⚠️', e?.message ?? t('error_generic'));
    } finally {
      setBusy(null);
    }
  };

  // ---------- 📱 Image ----------
  const shareImage = async () => {
    setBusy('img');
    try {
      const [full, shopRes] = await Promise.all([api.get(`/receipts/${receipt.id}`), api.get('/shop')]);
      setShotData({ receipt: full.data.data, shop: shopRes.data?.shop });
      await new Promise((resolve) => setTimeout(resolve, 250));
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      setShotData(null);
      resetAndClose();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: receipt.number });
      }
    } catch (e) {
      setShotData(null);
      Alert.alert('⚠️', t('rc_image_error'));
    } finally {
      setBusy(null);
    }
  };

  // ---------- 🧾 v2.8 : partage TEXTE (WhatsApp & co — fiche système) ----------
  const shareWhatsApp = async () => {
    setBusy('wa');
    try {
      const [full, shopRes] = await Promise.all([api.get(`/receipts/${receipt.id}`), api.get('/shop')]);
      const message = buildReceiptText(full.data.data, shopRes.data?.shop, t, full.data?.tva ?? null); // 🧮 v2.9
      resetAndClose();
      await Share.share({ message }); // WhatsApp proposé par la fiche système (zéro dépendance)
    } catch (e) {
      if (String(e?.message ?? '') !== 'User did not share') Alert.alert('⚠️', t('wa_ko'));
    } finally {
      setBusy(null);
    }
  };

  // ---------- Bluetooth ----------
  const printBluetooth = async () => {
    if (!isPrinterAvailable()) {
      Alert.alert(t('pr_unavailable'), t('pr_unavailable_msg'), [
        { text: 'OK', style: 'cancel', onPress: resetAndClose },
      ]);
      return;
    }
    const saved = await getSavedPrinter();
    if (!saved) {
      Alert.alert(t('pr_no_printer'), t('pr_no_printer_msg'), [
        { text: t('pr_configure'), onPress: () => { resetAndClose(); navigation?.navigate('PrinterSettings'); } },
        { text: t('cancel'), style: 'cancel', onPress: resetAndClose },
      ]);
      return;
    }
    setBusy('bt');
    try {
      const [full, shopRes] = await Promise.all([api.get(`/receipts/${receipt.id}`), api.get('/shop')]);
      await printReceiptTicket(full.data.data, shopRes.data?.shop);
      Alert.alert(t('pr_print_done'), receipt.number, [{ text: 'OK', onPress: resetAndClose }]);
    } catch (e) {
      if (e?.code === 'NO_PRINTER') Alert.alert(t('pr_no_printer'), t('pr_no_printer_msg'));
      else Alert.alert('⚠️', String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  // ---------- ↩️ Avoir TOTAL (une seule fois) ----------
  const confirmRefund = () => {
    Alert.alert(t('av_title'), t('av_msg', { number: receipt.number }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('av_confirm'),
        style: 'destructive',
        onPress: async () => {
          setBusy('refund');
          try {
            const res = await api.post(`/receipts/${receipt.id}/refund`, { refund_cash: refundCash });
            const cashNote = res.data?.summary?.cash_out ? t('av_cash_done') : '';
            resetAndClose();
            Alert.alert('↩️', t('av_done', { number: receipt.number }) + cashNote);
            onChanged?.();
          } catch (e) {
            Alert.alert('⚠️', e?.response?.data?.message ?? t('error_generic'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  // ---------- ↩️ Avoir PARTIEL par ligne ----------
  const openPartial = async () => {
    setBusy('partial');
    try {
      const res = await api.get(`/receipts/${receipt.id}`);
      const items = (res.data?.data?.items ?? [])
        .map((it) => ({
          id: it.id,
          name: it.product_name,
          max: Math.max(0, (it.quantity ?? 0) - (it.refunded_qty ?? 0)),
          qty: 0,
        }))
        .filter((l) => l.max > 0);
      if (items.length === 0) {
        Alert.alert('↩️', t('avp_nothing'));
        return;
      }
      setLines(items);
      setMode('partial');
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const bumpLine = (id, delta) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, qty: Math.max(0, Math.min(l.max, l.qty + delta)) } : l
      )
    );
  };

  const submitPartial = async () => {
    const selected = lines.filter((l) => l.qty > 0);
    if (selected.length === 0) {
      Alert.alert('↩️', t('avp_pick'));
      return;
    }
    setBusy('refund');
    try {
      const res = await api.post(`/receipts/${receipt.id}/refund`, {
        refund_cash: refundCash,
        items: selected.map((l) => ({ receipt_item_id: l.id, quantity: l.qty })),
      });
      const count = selected.reduce((sum, l) => sum + l.qty, 0);
      const full = res.data?.summary?.fully_refunded;
      const cashNote = res.data?.summary?.cash_out ? t('av_cash_done') : '';
      resetAndClose();
      Alert.alert('↩️', (full
        ? t('av_done', { number: receipt.number })
        : t('avp_done', { count })) + cashNote);
      onChanged?.();
    } catch (e) {
      Alert.alert('⚠️', e?.response?.data?.message ?? t('error_generic'));
    } finally {
      setBusy(null);
    }
  };

  const selectedCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={resetAndClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {mode === 'actions' ? (
          <>
            <Text style={styles.title}>{t('sale_format_title')}</Text>
            <Text style={styles.number}>{receipt?.number}</Text>

            <ActionButton ionicon="document-text-outline" label={t('sale_format_a5')} loading={busy === 'pdf'} onPress={() => sharePdf('pdf')} />
            <ActionButton ionicon="print-outline" label={t('sale_format_ticket')} loading={busy === 'ticket'} onPress={() => sharePdf('ticket')} />
            <ActionButton ionicon="phone-portrait-outline" label={t('rc_share_image')} loading={busy === 'img'} onPress={shareImage} />
            <ActionButton ionicon="logo-whatsapp" label={t('wa_share')} loading={busy === 'wa'} onPress={shareWhatsApp} />
            <ActionButton ionicon="bluetooth-outline" label={t('pr_print')} loading={busy === 'bt'} loadingLabel={t('pr_printing')} onPress={printBluetooth} accent />

            {!refunded && hasRole('admin', 'manager') ? (
              <>
                {/* ↩️💵 Remboursement d'argent tracé dans la caisse */}
                <View style={styles.cashRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashLabel}>💵 {t('av_cash_refund')}</Text>
                    <Text style={styles.cashHint}>{t('av_cash_refund_hint')}</Text>
                  </View>
                  <Switch
                    value={refundCash}
                    onValueChange={setRefundCash}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                <ActionButton ionicon="arrow-undo-outline" label={t('avp_action')} loading={busy === 'partial'} onPress={openPartial} warning />
                <ActionButton ionicon="ban-outline" label={t('av_action')} loading={busy === 'refund'} onPress={confirmRefund} danger />
              </>
            ) : null}
            {refunded ? (
              <View style={styles.refundedBadge}>
                <Text style={styles.refundedText}>{t('av_badge')}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.cancelBtn} onPress={resetAndClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ---------- Mode avoir partiel ---------- */
          <>
            <Text style={styles.title}>{t('avp_title')}</Text>
            <Text style={styles.number}>{receipt?.number}</Text>
            <Text style={styles.partialHint}>{t('avp_hint')}</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {lines.map((l) => (
                <View key={l.id} style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                    <Text style={styles.lineMax}>{t('avp_max', { qty: l.max })}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => bumpLine(l.id, -1)}>
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{l.qty}</Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => bumpLine(l.id, 1)}>
                      <Ionicons name="add" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* ↩️💵 Rembourser en espèces (sortie de caisse liée) */}
            <View style={styles.cashRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cashLabel}>💵 {t('av_cash_refund')}</Text>
                <Text style={styles.cashHint}>{t('av_cash_refund_hint')}</Text>
              </View>
              <Switch
                value={refundCash}
                onValueChange={setRefundCash}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[styles.partialSubmit, (busy === 'refund' || selectedCount === 0) && { opacity: 0.6 }]}
              onPress={submitPartial}
              disabled={busy === 'refund' || selectedCount === 0}
            >
              {busy === 'refund' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.partialSubmitText}>{t('avp_submit', { count: selectedCount })}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('actions')} activeOpacity={0.8}>
              <Text style={styles.cancelText}>‹ {t('cancel')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 📱 Canvas de capture hors-champ */}
      {shotData ? (
        <View style={styles.hiddenShot} collapsable={false}>
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
            <ReceiptImage receipt={shotData.receipt} shop={shotData.shop} />
          </ViewShot>
        </View>
      ) : null}
    </Modal>
  );
}

function ActionButton({ icon, ionicon, label, onPress, loading, loadingLabel, accent, danger, warning }) {
  const tint = danger ? colors.danger : warning ? colors.warning : accent ? colors.accent : colors.text;
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        accent && { borderColor: colors.accent },
        warning && { borderColor: colors.warning, backgroundColor: colors.warningBg },
        danger && { borderColor: colors.danger, backgroundColor: colors.dangerBg },
      ]}
      onPress={onPress}
      disabled={!!loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={danger ? colors.danger : colors.accent} />
      ) : ionicon ? (
        <Ionicons name={ionicon} size={19} color={tint} style={{ width: 22, textAlign: 'center' }} />
      ) : (
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      )}
      <Text style={[styles.actionText, danger && { color: colors.danger }, warning && { color: colors.warning }]}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,6,18,0.7)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgAlt,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
  number: {
    fontSize: 12.5,
    color: colors.accent,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  actionText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  cancelBtn: { alignItems: 'center', paddingVertical: 11, marginTop: 2 },
  cancelText: { color: colors.muted, fontWeight: '700', fontSize: 13.5 },
  hiddenShot: { position: 'absolute', left: -2000, top: 0 },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  cashLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  cashHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  refundedBadge: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  refundedText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  partialHint: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginBottom: 10 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  lineMax: { fontSize: 11, color: colors.muted, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: { fontSize: 16, color: colors.text, fontWeight: '800' },
  stepQty: { width: 32, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
  partialSubmit: {
    backgroundColor: colors.warning,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  partialSubmitText: { color: '#1F2937', fontWeight: '900', fontSize: 14 },
});
