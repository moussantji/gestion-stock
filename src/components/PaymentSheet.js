import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/format';

/**
 * 💳 Modale de versement sur un crédit (reçu non soldé).
 * Partagée par MovementsScreen (onglet Crédits) et CustomerDetailScreen.
 * receipt: { id, number, remaining } · onPaid(receiptMisAJour)
 */
export default function PaymentSheet({ receipt, onClose, onPaid }) {
  const { t } = useLocale();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    setAmount(receipt ? String(receipt.remaining ?? 0) : ''); // « tout solder » pré-rempli
  }, [receipt]);

  const submit = async () => {
    const value = parseInt(amount, 10) || 0;
    if (value <= 0) {
      Alert.alert('⚠️', t('cr_amount_invalid'));
      return;
    }
    setPaying(true);
    try {
      const res = await api.post(`/receipts/${receipt.id}/payments`, { amount: value });
      const remaining = Number(res.data?.data?.remaining ?? 0);
      onClose();
      Alert.alert('✅', remaining > 0 ? t('cr_added_msg', { remaining: formatMoney(remaining) }) : t('cr_settled'));
      onPaid?.(res.data?.data);
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setPaying(false);
    }
  };

  const styles = useThemedStyles(c => ({
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
    title: { fontSize: 16, fontWeight: '800', color: c.text },
    number: { fontSize: 12.5, color: c.accent, fontFamily: 'monospace', marginTop: 3 },
    due: { fontSize: 13, color: c.warning, fontWeight: '700', marginTop: 8, marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 },
    input: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    allBtn: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 4, paddingVertical: 4 },
    allText: { color: c.accent, fontWeight: '800', fontSize: 13 },
    submit: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 12,
    },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  }));

  return (
    <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('cr_settle')}</Text>
          <Text style={styles.number}>{receipt?.number}</Text>
          <Text style={styles.due}>
            {t('cr_remaining', { amount: formatMoney(receipt?.remaining ?? 0) })}
          </Text>

          <Text style={styles.label}>{t('cr_amount')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder={t('sale_paid_ph')}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            style={styles.allBtn}
            onPress={() => setAmount(String(receipt?.remaining ?? 0))}
          >
            <Text style={styles.allText}>{t('cr_pay_all')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submit, paying && { opacity: 0.6 }]}
            onPress={submit}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('cr_validate')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

