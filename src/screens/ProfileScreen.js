import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { LOCALE_LABELS } from '../i18n/translations';
import { colors, ROLE_LABELS } from '../theme/colors';
import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import { useThemedStyles } from '../hooks/useThemedStyles';

const MENU_ICON_MAP = {
  '🏷': 'categories', '🚚': 'suppliers', '👥': 'customers',
  '🔁': 'transfers', '📋': 'inventory', '💵': 'cash',
  '🎯': 'settings', '🏬': 'shops', '🖨': 'printer',
  '📦': 'products', '🔑': 'password', '🚪': 'logout',
  '✦': 'appearance', '🌍': 'language',
  '📅': 'recurring', '👤': 'users', '🔄': 'movements',
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, hasRole } = useAuth();
  const { t, locale, changeLocale } = useLocale();

  const [exporting, setExporting] = useState(null);

  // Modale mot de passe
  const [pwdModal, setPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const exportCsv = async (kind) => {
    setExporting(kind);
    try {
      const token = await SecureStore.getItemAsync('token');
      const filename = `${kind === 'products' ? 'produits' : 'mouvements'}.csv`;
      const target = FileSystem.documentDirectory + filename;

      const res = await FileSystem.downloadAsync(
        `${SERVER_URL}/api/export/${kind}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'text/csv', dialogTitle: filename });
      } else {
        Alert.alert('✅', res.uri);
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? getErrorMessage(e));
    } finally {
      setExporting(null);
    }
  };

  const savePassword = async () => {
    if (!currentPwd || !newPwd) {
      setPwdError(t('pwd_fill_all'));
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t('pwd_mismatch'));
      return;
    }
    setPwdError(null);
    setPwdSaving(true);
    try {
      await api.put('/password', {
        current_password: currentPwd,
        password: newPwd,
        password_confirmation: confirmPwd,
      });
      setPwdModal(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      Alert.alert('✅', t('pwd_updated'));
    } catch (e) {
      setPwdError(getErrorMessage(e));
    } finally {
      setPwdSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(t('prof_logout'), t('prof_logout_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('prof_logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const styles = useThemedStyles(c => ({
    container: { flex: 1, backgroundColor: c.bg },
    userCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    userName: { fontSize: 18, fontWeight: '800', color: c.text },
    userEmail: { fontSize: 13, color: c.muted, marginTop: 2 },
    roleBadge: { backgroundColor: c.primaryBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
    roleText: { color: c.primary, fontWeight: '800', fontSize: 12 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    },
    menuCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 12,
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text, marginHorizontal: 12 },
    langRow: { flexDirection: 'row', gap: 6 },
    langBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    langBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    langBtnText: { fontSize: 12, fontWeight: '700', color: c.muted },
    version: { textAlign: 'center', color: c.muted, fontSize: 11, marginTop: 24 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      paddingBottom: 34,
    },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 14 },
    formError: { color: c.danger, fontSize: 13, marginBottom: 10 },
  }));

  function MenuItem({ icon, label, onPress, danger, right }) {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <Icon name={MENU_ICON_MAP[icon] ?? icon} size={20} color={danger ? colors.danger : colors.primary} />
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {right ?? <Text style={{ color: colors.muted }}>›</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
    >
      {/* Carte utilisateur */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[user?.role] ?? user?.role}</Text>
        </View>
      </View>

      {/* Gestion */}
      <Text style={styles.sectionTitle}>{t('prof_management')}</Text>
      <View style={styles.menuCard}>
        <MenuItem icon="🏷" label={t('prof_categories')} onPress={() => navigation.navigate('Categories')} />
        <MenuItem icon="🚚" label={t('prof_suppliers')} onPress={() => navigation.navigate('Suppliers')} />
        <MenuItem icon="👥" label={t('prof_customers')} onPress={() => navigation.navigate('Customers')} />
        {hasRole('admin', 'manager') ? (
          <MenuItem icon="🔁" label={t('prof_transfers')} onPress={() => navigation.navigate('Transfers')} />
        ) : null}
        {hasRole('admin', 'manager') ? (
          <MenuItem icon="📋" label={t('prof_inventories')} onPress={() => navigation.navigate('Inventories')} />
        ) : null}
        {hasRole('admin', 'manager') ? (
          <MenuItem icon="💵" label={t('prof_cash')} onPress={() => navigation.navigate('Cash')} />
        ) : null}
        {hasRole('admin', 'manager') ? (
          <MenuItem icon="📅" label={t('prof_recurring')} onPress={() => navigation.navigate('RecurringSales')} />
        ) : null}
        {hasRole('admin', 'manager') ? (
          <MenuItem icon="🎯" label={t('prof_shop_settings')} onPress={() => navigation.navigate('ShopSettings')} />
        ) : null}
        {hasRole('admin') ? (
          <MenuItem icon="🏬" label={t('prof_shops')} onPress={() => navigation.navigate('Shops')} />
        ) : null}
        {hasRole('admin') ? (
          <MenuItem icon="👤" label={t('prof_users')} onPress={() => navigation.navigate('Users')} />
        ) : null}
        <MenuItem icon="🏷" label="Étiquettes code-barres" onPress={() => navigation.navigate('Labels')} />
        <MenuItem icon="↩️" label="Avoirs et retours" onPress={() => navigation.navigate('Returns')} />
        <MenuItem icon="💰" label="Mise à jour prix en lot" onPress={() => navigation.navigate('BulkPrice')} />
        <MenuItem icon="📈" label="Historique des prix" onPress={() => navigation.navigate('PriceHistory')} />
      </View>

      {/* Exports (manager+) */}
      {hasRole('admin', 'manager') ? (
        <>
          <Text style={styles.sectionTitle}>{t('prof_exports')}</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="📦"
              label={t('prof_export_products')}
              onPress={() => exportCsv('products')}
              right={exporting === 'products' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            />
            <MenuItem
              icon="🔄"
              label={t('prof_export_movements')}
              onPress={() => exportCsv('movements')}
              right={exporting === 'movements' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            />
          </View>
        </>
      ) : null}

      {/* Paramètres */}
      <Text style={styles.sectionTitle}>{t('prof_settings')}</Text>
      <View style={styles.menuCard}>
        <MenuItem icon="✦" label="Apparence et couleurs" onPress={() => navigation.navigate('Appearance')} />
        <MenuItem icon="🖨" label={t('prof_printer')} onPress={() => navigation.navigate('PrinterSettings')} />
        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
          <Icon name="language" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>{t('prof_language')}</Text>
          <View style={styles.langRow}>
            {Object.entries(LOCALE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.langBtn, locale === key && styles.langBtnActive]}
                onPress={() => changeLocale(key)}
              >
                <Text style={[styles.langBtnText, locale === key && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Compte */}
      <Text style={styles.sectionTitle}>{t('prof_account')}</Text>
      <View style={styles.menuCard}>
        <MenuItem icon="🔑" label={t('prof_change_pwd')} onPress={() => setPwdModal(true)} />
        <MenuItem icon="🚪" label={t('prof_logout')} onPress={confirmLogout} danger />
      </View>

      <Text style={styles.version}>{t('version')}</Text>

      {/* Modale mot de passe */}
      <Modal visible={pwdModal} transparent animationType="slide" onRequestClose={() => setPwdModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPwdModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t('pwd_title')}</Text>
              {pwdError ? <Text style={styles.formError}>{pwdError}</Text> : null}
              <Field label={t('pwd_current')} placeholder="••••••••" secureTextEntry value={currentPwd} onChangeText={setCurrentPwd} />
              <Field label={t('pwd_new')} placeholder="••••••••" secureTextEntry value={newPwd} onChangeText={setNewPwd} />
              <Field label={t('pwd_confirm')} placeholder="••••••••" secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} />
              <PrimaryButton title={t('pwd_save')} onPress={savePassword} loading={pwdSaving} />
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}


