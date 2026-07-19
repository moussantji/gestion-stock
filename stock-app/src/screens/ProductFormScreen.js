import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { mediaUrl } from '../config';
import { useLocale } from '../context/LocaleContext';
import { colors } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import PickerModal from '../components/PickerModal';

export default function ProductFormScreen({ route, navigation }) {
  const { t } = useLocale();
  const editing = route.params?.product ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [sku, setSku] = useState(editing?.sku ?? '');
  const [barcode, setBarcode] = useState(editing?.barcode ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [purchasePrice, setPurchasePrice] = useState(String(editing?.purchase_price ?? ''));
  const [salePrice, setSalePrice] = useState(String(editing?.sale_price ?? ''));
  const [wholesalePrice, setWholesalePrice] = useState(String(editing?.wholesale_price ?? '')); // 👥 prix de gros
  const [quantity, setQuantity] = useState(String(editing?.quantity ?? '0'));
  const [threshold, setThreshold] = useState(String(editing?.alert_threshold ?? '5'));
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? null);
  const [supplierId, setSupplierId] = useState(editing?.supplier_id ?? null);

  // photo : asset local choisi OU url existante (édition)
  const [photo, setPhoto] = useState(null); // ImagePicker asset

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [picker, setPicker] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [cats, sups] = await Promise.all([api.get('/categories'), api.get('/suppliers')]);
        setCategories(cats.data.data);
        setSuppliers(sups.data.data);
      } catch (e) {
        setError(getErrorMessage(e));
      }
    })();
  }, []);

  // Code-barres revenant du scanner
  useEffect(() => {
    if (route.params?.scannedBarcode) {
      setBarcode(route.params.scannedBarcode);
      navigation.setParams({ scannedBarcode: undefined });
    }
  }, [route.params?.scannedBarcode]);

  // ---------- Choix de la photo ----------
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pf_photo_perm'), t('pf_photo_perm_msg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pf_photo_perm'), t('pf_photo_perm_msg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const choosePhotoSource = () => {
    Alert.alert(t('pf_photo_title'), '', [
      { text: t('pf_photo_camera'), onPress: takePhoto },
      { text: t('pf_photo_gallery'), onPress: pickPhoto },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  // ---------- Enregistrement ----------
  const save = async () => {
    if (!name.trim() || !sku.trim()) {
      setError(t('pf_required'));
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // FormData (multipart) pour pouvoir joindre la photo
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('sku', sku.trim());
      if (barcode.trim()) fd.append('barcode', barcode.trim());
      if (description.trim()) fd.append('description', description.trim());
      fd.append('purchase_price', String(parseFloat((purchasePrice || '0').replace(',', '.')) || 0));
      fd.append('sale_price', String(parseFloat((salePrice || '0').replace(',', '.')) || 0));
      if (wholesalePrice.trim()) fd.append('wholesale_price', String(parseFloat(wholesalePrice.replace(',', '.')) || 0)); // 👥 prix de gros (optionnel)
      fd.append('alert_threshold', String(parseInt(threshold, 10) || 0));
      if (categoryId) fd.append('category_id', String(categoryId));
      if (supplierId) fd.append('supplier_id', String(supplierId));

      if (photo?.uri) {
        fd.append('image', {
          uri: photo.uri,
          name: photo.fileName ?? 'produit.jpg',
          type: photo.mimeType ?? 'image/jpeg',
        });
      }

      if (editing) {
        fd.append('_method', 'PUT'); // spoofing Laravel (multipart + PUT)
        await api.post(`/products/${editing.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('✅', t('pf_updated'));
      } else {
        fd.append('quantity', String(parseInt(quantity, 10) || 0));
        await api.post('/products', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('✅', t('pf_created'));
      }
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { label: t('pf_none'), value: null },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];
  const supplierOptions = [
    { label: t('pf_none'), value: null },
    ...suppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const photoUri = photo?.uri ?? (editing?.image_url ? mediaUrl(editing.image_url) : null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ---------- Photo ---------- */}
        <TouchableOpacity style={styles.photoBox} onPress={choosePhotoSource} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={34} color={colors.muted} />
              <Text style={styles.photoHint}>{t('pf_photo_add')}</Text>
              <Text style={styles.photoSub}>{t('pf_photo_sub')}</Text>
            </View>
          )}
          {photoUri ? (
            <View style={styles.photoEdit}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('pf_photo_change')}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <Field label={t('pf_name')} placeholder={t('pf_name_ph')} value={name} onChangeText={setName} />
        <Field
          label={t('pf_sku')}
          placeholder={t('pf_sku_ph')}
          autoCapitalize="characters"
          value={sku}
          onChangeText={setSku}
        />

        <Text style={styles.label}>{t('pf_barcode')}</Text>
        <View style={styles.barcodeRow}>
          <Field
            style={{ flex: 1, marginBottom: 0 }}
            placeholder={t('pf_barcode_ph')}
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('Scanner', { mode: 'fill', returnScreen: 'ProductForm' })}
          >
            <Ionicons name="scan-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('pf_category')}</Text>
        <TouchableOpacity style={styles.select} onPress={() => setPicker('category')}>
          <Text style={selectedCategory ? styles.selectText : styles.selectPlaceholder}>
            {selectedCategory ? selectedCategory.name : t('pf_none')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </TouchableOpacity>

        <Text style={styles.label}>{t('pf_supplier')}</Text>
        <TouchableOpacity style={styles.select} onPress={() => setPicker('supplier')}>
          <Text style={selectedSupplier ? styles.selectText : styles.selectPlaceholder}>
            {selectedSupplier ? selectedSupplier.name : t('pf_none')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.row}>
          <Field
            style={{ flex: 1, marginRight: 8 }}
            label={t('pf_purchase')}
            placeholder="0"
            keyboardType="decimal-pad"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
          />
          <Field
            style={{ flex: 1, marginLeft: 8 }}
            label={t('pf_sale')}
            placeholder="0"
            keyboardType="decimal-pad"
            value={salePrice}
            onChangeText={setSalePrice}
          />
        </View>

        <Field
          label={t('pf_wholesale')}
          placeholder="0"
          keyboardType="decimal-pad"
          value={wholesalePrice}
          onChangeText={setWholesalePrice}
        />

        <View style={styles.row}>
          {editing ? (
            <View style={{ flex: 1, marginRight: 8, marginBottom: 14 }}>
              <Text style={styles.label}>{t('pf_qty_stock')}</Text>
              <View style={styles.qtyReadonly}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>{editing.quantity}</Text>
              </View>
            </View>
          ) : (
            <Field
              style={{ flex: 1, marginRight: 8 }}
              label={t('pf_qty_initial')}
              placeholder="0"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          )}
          <Field
            style={{ flex: 1, marginLeft: 8 }}
            label={t('pf_threshold')}
            placeholder="5"
            keyboardType="number-pad"
            value={threshold}
            onChangeText={setThreshold}
          />
        </View>

        {editing ? <Text style={styles.hint}>{t('pf_qty_hint')}</Text> : null}

        <Field
          label={t('pf_desc')}
          placeholder={t('pf_desc_ph')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <PrimaryButton
          title={editing ? t('pf_save_edit') : t('pf_save_create')}
          onPress={save}
          loading={saving}
          style={{ marginTop: 10 }}
        />
      </ScrollView>

      <PickerModal
        visible={picker === 'category'}
        title={t('pf_category')}
        options={categoryOptions}
        value={categoryId}
        onSelect={setCategoryId}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'supplier'}
        title={t('pf_supplier')}
        options={supplierOptions}
        value={supplierId}
        onSelect={setSupplierId}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  photoBox: {
    height: 150,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoHint: { color: colors.text, fontWeight: '700', marginTop: 8, fontSize: 14 },
  photoSub: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  photoEdit: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  scanBtn: {
    marginLeft: 10,
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  select: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  selectText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  selectPlaceholder: { fontSize: 15, color: colors.muted },
  row: { flexDirection: 'row' },
  qtyReadonly: {
    backgroundColor: colors.primaryBg,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 12, marginTop: -4 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
