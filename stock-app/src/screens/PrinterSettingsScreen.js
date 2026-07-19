import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import {
  clearPrinter,
  connectPrinter,
  getSavedPrinter,
  isPrinterAvailable,
  listPairedPrinters,
  printTestPage,
  savePrinter,
} from '../utils/thermalPrinter';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';

/**
 * 🖨 Réglages de l'imprimante thermique Bluetooth (80mm ESC/POS) :
 * choix parmi les appareils appairés + page de test.
 * Sans development build, la carte d'info indique la marche à suivre.
 */
export default function PrinterSettingsScreen() {
  const { t } = useLocale();

  const available = isPrinterAvailable();
  const [saved, setSaved] = useState(null);
  const [devices, setDevices] = useState(null); // null = pas encore scanné
  const [scanning, setScanning] = useState(false);
  const [connectingTo, setConnectingTo] = useState(null);
  const [testing, setTesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => setSaved(await getSavedPrinter()))();
    }, [])
  );

  // ---------- Scan des appareils appairés ----------
  const scan = async () => {
    setScanning(true);
    setDevices(null);
    try {
      const list = await listPairedPrinters();
      setDevices(list);
    } catch (e) {
      Alert.alert('⚠️', t('pr_bt_off_msg'));
      setDevices([]);
    } finally {
      setScanning(false);
    }
  };

  // ---------- Connexion + mémorisation ----------
  const pick = async (device) => {
    setConnectingTo(device.address);
    try {
      await connectPrinter(device.address);
      await savePrinter(device);
      setSaved(device);
      Alert.alert('✅', `${t('pr_saved')} : ${device.name}`);
    } catch (e) {
      Alert.alert('⚠️', t('pr_connect_error'));
    } finally {
      setConnectingTo(null);
    }
  };

  // ---------- Déconnexion ----------
  const disconnect = async () => {
    await clearPrinter();
    setSaved(null);
  };

  // ---------- Page de test ----------
  const testPrint = async () => {
    setTesting(true);
    try {
      const shopRes = await api.get('/shop');
      await printTestPage(shopRes.data?.shop);
      Alert.alert('✅', t('pr_test_done'));
    } catch (e) {
      const msg = e?.code === 'NO_PRINTER' ? t('pr_no_printer_msg') : getErrorMessage(e);
      Alert.alert('⚠️', msg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.hintBox}>{t('pr_hint')}</Text>

      {/* Module natif absent (Expo Go) */}
      {!available ? (
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={26} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.warningTitle}>{t('pr_unavailable')}</Text>
            <Text style={styles.warningText}>{t('pr_unavailable_msg')}</Text>
          </View>
        </View>
      ) : null}

      {/* Imprimante actuellement connectée */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('pr_saved')}</Text>
        {saved ? (
          <View style={styles.savedRow}>
            <View style={styles.printerIcon}>
              <Ionicons name="print" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedName}>{saved.name}</Text>
              <Text style={styles.savedMac}>{saved.address}</Text>
            </View>
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
              <Text style={styles.disconnectText}>{t('pr_disconnect')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('pr_no_saved')}</Text>
        )}

        {saved && available ? (
          <PrimaryButton
            title={testing ? t('pr_printing') : t('pr_test')}
            onPress={testPrint}
            loading={testing}
            style={{ marginTop: 12 }}
          />
        ) : null}
      </View>

      {/* Recherche d'appareils */}
      <PrimaryButton
        title={scanning ? t('pr_scanning') : t('pr_scan')}
        onPress={scan}
        loading={scanning}
        variant="outline"
        disabled={!available}
        style={{ marginBottom: 4 }}
      />

      {devices !== null ? (
        devices.length ? (
          <View style={styles.devicesBox}>
            <Text style={styles.pickHint}>{t('pr_pick')}</Text>
            {devices.map((d) => (
              <TouchableOpacity
                key={d.address}
                style={[styles.deviceRow, saved?.address === d.address && styles.deviceRowActive]}
                onPress={() => pick(d)}
                disabled={!!connectingTo}
              >
                <Ionicons name="print-outline" size={20} color={colors.text} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.deviceName}>{d.name}</Text>
                  <Text style={styles.deviceMac}>{d.address}</Text>
                </View>
                {connectingTo === d.address ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : saved?.address === d.address ? (
                  <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState ionicon="search-outline" title={t('pr_none_paired')} />
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hintBox: {
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    padding: 12,
    color: colors.info,
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 14,
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  warningTitle: { color: colors.warning, fontWeight: '800', fontSize: 13.5 },
  warningText: { color: colors.warning, fontSize: 12, marginTop: 3, opacity: 0.9 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  savedRow: { flexDirection: 'row', alignItems: 'center' },
  printerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedName: { fontSize: 15, fontWeight: '800', color: colors.text },
  savedMac: { fontSize: 11.5, color: colors.muted, fontFamily: 'monospace', marginTop: 2 },
  disconnectBtn: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.dangerBg,
  },
  disconnectText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  emptyText: { color: colors.muted, fontSize: 13 },
  devicesBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickHint: { fontSize: 12.5, color: colors.muted, marginBottom: 8, paddingHorizontal: 4 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  deviceRowActive: { backgroundColor: colors.primaryBg },
  deviceName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  deviceMac: { fontSize: 11, color: colors.muted, fontFamily: 'monospace', marginTop: 1 },
});
