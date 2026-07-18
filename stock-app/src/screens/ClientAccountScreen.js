import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { SERVER_URL } from '../config';
import { colors } from '../theme/colors';

// 👤 v25 — Écran du compte CLIENT : suivi d'abonnement dans l'app (plus de clé).
// L'accès stock/caisse reste réservé aux comptes staff — le client gère sa licence ici.

const STATE_STYLE = {
  active: { icon: '🟢', color: colors.success },
  expiring: { icon: '🟠', color: colors.warning },
  grace: { icon: '🟠', color: colors.warning },
  expired: { icon: '🔴', color: colors.danger },
  revoked: { icon: '⚫', color: colors.muted },
};

export default function ClientAccountScreen() {
  const { user, subscription, refreshMe, logout } = useAuth();
  const { t } = useLocale();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshMe();
    } catch (e) {
      // hors ligne → on garde le dernier état connu
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const openPortal = () => {
    Linking.openURL(`${SERVER_URL}/compte`).catch(() => {});
  };

  const confirmLogout = () => {
    Alert.alert(t('prof_logout'), t('prof_logout_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('prof_logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const state = subscription?.state ?? null;
  const code = state?.code ?? null;
  const st = code ? STATE_STYLE[code] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.logoMark}><Text style={{ fontSize: 22, color: '#fff' }}>👤</Text></View>
        <Text style={styles.title}>{t('cl_title')}</Text>
        <Text style={styles.subtitle}>{user?.name} · {user?.email}</Text>
      </View>

      {/* Carte abonnement */}
      {subscription && st ? (
        <View style={[styles.card, code === 'expired' && { borderColor: colors.danger }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: st.color }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>
                {st.icon} {t(`cl_status_${code}`)}
              </Text>
            </View>
            {refreshing ? <ActivityIndicator size="small" color={colors.muted} /> : null}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('cl_plan')}</Text>
            <Text style={styles.value}>{subscription.plan_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{code === 'expired' ? t('cl_expired_on') : t('cl_until')}</Text>
            <Text style={[styles.value, { color: st.color }]}>
              {new Date(subscription.expires_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>

          {code === 'active' || code === 'expiring' ? (
            <Text style={styles.hint}>⏳ {t('cl_days_left', { count: state.days_left })}</Text>
          ) : null}
          {code === 'grace' ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>⚠️ {t('cl_grace_left', { count: state.grace_left })}</Text>
            </View>
          ) : null}
          {code === 'expired' ? (
            <View style={styles.dangerBox}>
              <Text style={styles.dangerText}>🔒 {t('cl_blocked')}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={{ textAlign: 'center', fontSize: 34 }}>🌱</Text>
          <Text style={styles.noSubTitle}>{t('ac_no_subs')}</Text>
          <Text style={styles.hint}>{t('cl_no_sub_hint')}</Text>
        </View>
      )}

      {/* Renouveler → portail web (commande prolongée automatiquement) */}
      <TouchableOpacity style={styles.primaryBtn} onPress={openPortal} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{t('cl_renew')}</Text>
      </TouchableOpacity>
      <Text style={styles.footHint}>{t('cl_renew_hint')}</Text>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>🚪 {t('prof_logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', marginBottom: 24 },
  logoMark: {
    width: 58, height: 58, borderRadius: 17, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontSize: 13.5, color: colors.muted },
  value: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  hint: { fontSize: 12.5, color: colors.muted, marginTop: 10, textAlign: 'center' },
  warnBox: { backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 10, padding: 11, marginTop: 12 },
  warnText: { color: colors.warning, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  dangerBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 11, marginTop: 12 },
  dangerText: { color: colors.danger, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  noSubTitle: { textAlign: 'center', fontSize: 15.5, fontWeight: '800', color: colors.text, marginTop: 8 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  footHint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12, lineHeight: 17 },
  logoutBtn: {
    marginTop: 26, borderRadius: 13, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 14 },
});
