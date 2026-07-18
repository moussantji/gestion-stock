import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api, { getErrorMessage } from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';

/**
 * mode "lookup"    : recherche le produit par code-barres
 * mode "fill"      : renvoie le code au formulaire produit
 * mode "inventory" : 🔄 comptage en continu pour un inventaire (+1 à chaque scan)
 */
export default function ScannerScreen({ route, navigation }) {
  const { t } = useLocale();
  const mode = route.params?.mode ?? 'lookup';
  const returnScreen = route.params?.returnScreen ?? 'ProductForm';
  const inventoryId = route.params?.inventoryId ?? null;
  const inventoryRef = route.params?.inventoryRef ?? '';

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastScan, setLastScan] = useState(null); // feedback du dernier comptage

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 44 }}>📷</Text>
        <Text style={styles.permText}>{t('sc_perm')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t('sc_perm_btn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lookup = async (code) => {
    setBusy(true);
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      const product = res.data.data;
      navigation.replace('ProductDetail', { productId: product.id, product });
    } catch (e) {
      if (e?.response?.status === 404) {
        Alert.alert(t('sc_not_found'), t('sc_not_found_msg', { code }), [
          { text: t('sc_rescan'), onPress: () => setScanned(false) },
          { text: t('sc_create'), onPress: () => navigation.replace('ProductForm', { scannedBarcode: code }) },
          { text: t('cancel'), style: 'cancel', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Erreur', getErrorMessage(e), [{ text: 'OK', onPress: () => setScanned(false) }]);
      }
    } finally {
      setBusy(false);
    }
  };

  // ---------- 🔄 Mode inventaire : +1 à chaque scan, en continu ----------
  const inventoryCount = async (code) => {
    setBusy(true);
    try {
      const res = await api.post(`/inventories/${inventoryId}/count`, {
        barcode: code,
        quantity: 1,
        mode: 'increment',
      });
      const item = res.data?.data;
      setLastScan({
        ok: true,
        text: t('inv_scan_feedback', {
          name: item?.product?.name ?? code,
          qty: item?.counted_quantity ?? '?',
        }),
      });
    } catch (e) {
      setLastScan({
        ok: false,
        text:
          e?.response?.status === 422
            ? getErrorMessage(e)
            : t('sc_not_found_msg', { code }),
      });
    } finally {
      setBusy(false);
      // Petit délai anti double-lecture, puis scan à nouveau actif
      setTimeout(() => setScanned(false), 900);
    }
  };

  const handleScan = ({ data }) => {
    if (scanned || busy) return;
    setScanned(true);

    if (mode === 'fill') {
      navigation.navigate({
        name: returnScreen,
        params: { scannedBarcode: data },
        merge: true,
      });
    } else if (mode === 'inventory') {
      inventoryCount(data); // bandeau de feedback + scan continu
    } else {
      lookup(data);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {mode === 'fill'
            ? t('sc_hint_fill')
            : mode === 'inventory'
              ? t('sc_hint_inventory', { ref: inventoryRef })
              : t('sc_hint_lookup')}
        </Text>
        {/* 🔄 Feedback du comptage en mode inventaire */}
        {lastScan ? (
          <View
            style={[
              styles.scanBadge,
              { backgroundColor: lastScan.ok ? 'rgba(52,211,153,0.92)' : 'rgba(248,113,113,0.92)' },
            ]}
          >
            <Text style={styles.scanBadgeText} numberOfLines={2}>{lastScan.text}</Text>
          </View>
        ) : null}
        {scanned && mode !== 'inventory' ? (
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('sc_rescan')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText: { color: '#fff', textAlign: 'center', marginVertical: 18, fontSize: 15 },
  permBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240,
    height: 160,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', marginTop: 18, fontSize: 14, fontWeight: '600' },
  scanBadge: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 300,
  },
  scanBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13.5, textAlign: 'center' },
  rescanBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
});
