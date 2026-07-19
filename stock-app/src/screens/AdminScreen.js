import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { getErrorMessage } from '../api/client';
import { SERVER_URL } from '../config';
import { useLocale } from '../context/LocaleContext';
import { scheduleLicenseReminders } from '../utils/notifications';
import { colors } from '../theme/colors';
import { formatMoney, formatDate } from '../utils/format';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const TABS = [
  { key: 'overview', label: '📊 Résumé' },
  { key: 'orders', label: '🧾 Commandes' },
  { key: 'licenses', label: '👤 Abonnements' }, // v25 : comptes clients (plus de clé)
];

const ORDER_BADGE = {
  pending: { label: '⏳ En attente', color: colors.warning },
  paid: { label: '✅ Payée', color: colors.success },
  cancelled: { label: 'Annulée', color: colors.muted },
};

const LICENSE_BADGE = {
  active: { label: '✅ Active', color: colors.success },
  expired: { label: '⌛ Expirée', color: colors.muted },
  revoked: { label: '🚫 Révoquée', color: colors.danger },
};

export default function AdminScreen() {
  const { t } = useLocale();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [shop, setShop] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orders, setOrders] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setError(null);
    try {
      if (tab === 'overview') {
        const [res, shopRes] = await Promise.all([api.get('/admin/overview'), api.get('/shop')]);
        setOverview(res.data);
        setShop(shopRes.data?.shop ?? null);
        // 🔔 Planifie les rappels locaux (J-3 / J-1) pour les licences expirantes
        if (res.data?.expiring_licenses?.length) {
          scheduleLicenseReminders(
            res.data.expiring_licenses,
            t('notif_title'),
            (license, daysBefore) =>
              t('notif_body', { name: license.buyer_name, date: new Date(license.expires_at).toLocaleDateString('fr-FR') })
          );
        }
      } else if (tab === 'orders') {
        const res = await api.get('/admin/orders', { params: { per_page: 50 } });
        setOrders(res.data.data ?? []);
      } else {
        const res = await api.get('/admin/licenses', { params: { per_page: 50 } });
        setLicenses(res.data.data ?? []);
      }
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
    }, [tab])
  );

  // ---------- 👤 Actions comptes clients (v25 — plus de clé de licence) ----------

  /** Partage WhatsApp : identifiants du portail client (site + email + mot de passe). */
  const shareAccount = async ({ email, password, planName, expiresAt }) => {
    try {
      await Share.share({
        message: t('ac_share_msg', {
          url: `${SERVER_URL}/compte`,
          email,
          password: password ?? t('ac_pwd_unchanged'),
          plan: planName,
          date: expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR') : '—',
        }),
      });
    } catch (e) {}
  };

  const validateOrder = (order) => {
    Alert.alert(
      'Valider le paiement',
      `Confirmer le paiement de ${formatMoney(order.amount)} par ${order.buyer_name} (${order.payment_method}) ?\n\n${t('ac_validate_hint')}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '✅ Valider',
          onPress: async () => {
            setBusyId(order.id);
            try {
              const res = await api.post(`/admin/orders/${order.id}/validate`);
              const sub = res.data.subscription;
              const dateStr = sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString('fr-FR') : '—';
              if (sub?.note === 'email_conflict') {
                // Email déjà pris par un compte staff → pas de compte client
                Alert.alert(t('ac_conflict'), t('ac_conflict_body'));
              } else if (sub?.account_created && sub?.password_plain) {
                // 🎉 Nouveau compte : le mot de passe n'est transmis QU'ICI (+ email)
                Alert.alert(
                  t('ac_account_ready'),
                  t('ac_account_ready_body', { email: sub.email, password: sub.password_plain, date: dateStr }),
                  [
                    { text: t('ac_share'), onPress: () => shareAccount({ email: sub.email, password: sub.password_plain, planName: sub.plan_name, expiresAt: sub.expires_at }) },
                    { text: 'OK' },
                  ]
                );
              } else if (sub) {
                // 🔁 Renouvellement (même email) : prolongation, mot de passe inchangé
                Alert.alert(t('ac_extended'), t('ac_extended_body', { email: sub.email, date: dateStr }));
              }
              load();
            } catch (e) {
              Alert.alert('Erreur', getErrorMessage(e));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  /** 🔑↻ Régénère le mot de passe du compte client (perdu, jamais reçu…) */
  const resetPassword = (license) => {
    Alert.alert(t('ac_reset_title'), t('ac_reset_confirm', { email: license.buyer_email }), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: '🔑↻ OK',
        onPress: async () => {
          setBusyId(license.id);
          try {
            const res = await api.post(`/admin/licenses/${license.id}/password-reset`);
            const pwd = res.data.password_plain;
            Alert.alert(
              t('ac_reset_done'),
              t('ac_reset_done_body', { email: res.data.email, password: pwd }),
              [
                { text: t('ac_share'), onPress: () => shareAccount({ email: res.data.email, password: pwd, planName: license.plan_name, expiresAt: license.expires_at }) },
                { text: 'OK' },
              ]
            );
          } catch (e) {
            Alert.alert('⚠️', getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const cancelOrder = (order) => {
    Alert.alert('Annuler la commande', `Annuler ${order.reference} ? L'abonnement éventuel sera révoqué.`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setBusyId(order.id);
          try {
            await api.post(`/admin/orders/${order.id}/cancel`);
            load();
          } catch (e) {
            Alert.alert('Erreur', getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const toggleLicense = async (license) => {
    setBusyId(license.id);
    try {
      const res = await api.post(`/admin/licenses/${license.id}/toggle`);
      Alert.alert('✅', res.data.message);
      load();
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  // ---------- 🏪 Logo de la boutique (reçus PDF) ----------
  const pickAndUploadLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('pf_photo_perm'), t('pf_photo_perm_msg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', {
        uri: asset.uri,
        name: asset.fileName ?? 'shop-logo.png',
        type: asset.mimeType ?? 'image/png',
      });
      const res = await api.post('/admin/shop-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShop((prev) => ({ ...(prev ?? {}), logo_url: res.data.logo_url }));
      Alert.alert(t('adm_logo_updated'), res.data.message);
    } catch (e) {
      Alert.alert('⚠️', getErrorMessage(e));
    } finally {
      setUploadingLogo(false);
    }
  };

  // ---------- Renders ----------

  const renderOverview = () => {
    const s = overview?.stats;
    if (!s) return null;

    return (
      <>
        <View style={styles.grid}>
          <StatCard ionicon="cash" label="Revenu total" value={formatMoney(s.revenue_total)} color={colors.primary} style={{ marginRight: 8 }} />
          <StatCard ionicon="trending-up" label="Revenu ce mois" value={formatMoney(s.revenue_month)} color={colors.success} style={{ marginLeft: 8 }} />
        </View>
        <View style={[styles.grid, { marginTop: 12 }]}>
          <StatCard ionicon="receipt" label="Cmd. en attente" value={s.orders_pending} color={colors.warning} style={{ marginRight: 8 }} />
          <StatCard ionicon="ribbon" label="Abonnements actifs" value={s.licenses_active} color={colors.accent} style={{ marginHorizontal: 8 }} />
          <StatCard ionicon="people" label="Utilisateurs" value={s.users_count} color={colors.info} style={{ marginLeft: 8 }} />
        </View>
        <View style={[styles.grid, { marginTop: 12 }]}>
          <StatCard ionicon="cube" label="Produits" value={s.products_count} color={colors.primary} style={{ marginRight: 8 }} />
          <StatCard ionicon="warning" label="Stock bas" value={s.low_stock_count} color={colors.warning} style={{ marginLeft: 8 }} />
        </View>

        {/* 🏪 Boutique — logo affiché sur les reçus PDF */}
        <Text style={styles.sectionTitle}>{t('adm_shop')}</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {shop?.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.logoPreview} />
            ) : (
              <View style={[styles.logoPreview, styles.logoPlaceholder]}>
                <Ionicons name="storefront" size={26} color={colors.muted} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop?.name ?? '—'}
              </Text>
              <Text style={styles.meta}>
                {shop?.logo_url ? shop?.phone : t('adm_no_logo')}
              </Text>
              <Text style={styles.logoHint}>{t('adm_logo_hint')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoBtn}
            onPress={pickAndUploadLogo}
            disabled={uploadingLogo}
            activeOpacity={0.85}
          >
            {uploadingLogo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.logoBtnText}>{t('adm_logo_change')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 👤 Abonnements expirant bientôt */}
        <Text style={styles.sectionTitle}>{t('adm_expiring')}</Text>
        {overview.expiring_licenses?.length ? (
          overview.expiring_licenses.map((l) => (
            <View key={l.id} style={[styles.card, { borderColor: 'rgba(251,191,36,0.4)' }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.planBig}>{l.plan_name}</Text>
                <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '800' }}>
                  {formatDate(l.expires_at)}
                </Text>
              </View>
              <Text style={styles.client}>{l.buyer_name}</Text>
              <Text style={styles.meta}>{l.buyer_email}</Text>
            </View>
          ))
        ) : (
          <EmptyState ionicon="sparkles-outline" title={t('adm_no_expiring')} />
        )}

        <Text style={styles.sectionTitle}>Dernières commandes</Text>
        {overview.recent_orders?.length ? (
          overview.recent_orders.map((o) => renderOrderCard(o, true))
        ) : (
          <EmptyState ionicon="receipt-outline" title="Aucune commande" subtitle="Les commandes du site apparaîtront ici." />
        )}
      </>
    );
  };

  const renderOrderCard = (o, compact = false) => {
    const badge = ORDER_BADGE[o.status] ?? ORDER_BADGE.pending;
    return (
      <View key={o.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.ref}>{o.reference}</Text>
          <Text style={[styles.badge, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.client}>{o.buyer_name} · {o.buyer_email}</Text>
        <Text style={styles.meta}>
          {o.plan_name} · <Text style={{ color: colors.accent, fontWeight: '800' }}>{formatMoney(o.amount)}</Text>
          {o.payment_method ? ` · ${o.payment_method}` : ''}
        </Text>
        {o.license ? (
          <Text style={styles.subChip}>👤 {o.license.plan_name} · jusqu'au {formatDate(o.license.expires_at)}</Text>
        ) : null}

        {!compact || o.status === 'pending' ? (
          <View style={styles.cardActions}>
            {o.status === 'pending' ? (
              <TouchableOpacity
                style={[styles.actionBtnSmall, { backgroundColor: colors.successBg }]}
                onPress={() => validateOrder(o)}
                disabled={busyId === o.id}
              >
                {busyId === o.id ? <ActivityIndicator size="small" color={colors.success} /> : <Text style={[styles.actionText, { color: colors.success }]}>✅ Valider</Text>}
              </TouchableOpacity>
            ) : null}
            {o.status !== 'cancelled' ? (
              <TouchableOpacity
                style={[styles.actionBtnSmall, { backgroundColor: colors.dangerBg }]}
                onPress={() => cancelOrder(o)}
                disabled={busyId === o.id}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>✖ Annuler</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  // 👤 v25 : onglet Abonnements — identité + état, reset mot de passe, révoquer (jamais de clé)
  const renderLicenses = () => (
    <>
      {licenses.length ? (
        licenses.map((l) => {
          const badge = LICENSE_BADGE[l.effective_status] ?? LICENSE_BADGE.active;
          return (
            <View key={l.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.planBig}>{l.plan_name}</Text>
                <Text style={[styles.badge, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Text style={styles.client}>{l.buyer_name}</Text>
              <Text style={styles.meta}>{l.buyer_email}</Text>
              <Text style={styles.meta}>expire le {formatDate(l.expires_at)}</Text>
              {l.order?.reference ? <Text style={styles.meta2}>{l.order.reference}</Text> : null}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtnSmall, { backgroundColor: colors.primaryBg }]}
                  onPress={() => resetPassword(l)}
                  disabled={busyId === l.id}
                >
                  {busyId === l.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.actionText, { color: colors.primary }]}>🔑↻ Mot de passe</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnSmall, { backgroundColor: l.status === 'active' ? colors.dangerBg : colors.successBg }]}
                  onPress={() => toggleLicense(l)}
                  disabled={busyId === l.id}
                >
                  <Text style={[styles.actionText, { color: l.status === 'active' ? colors.danger : colors.success }]}>
                    {l.status === 'active' ? '🚫 Révoquer' : '✅ Réactiver'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      ) : (
        <EmptyState ionicon="person-outline" title={t('ac_no_subs')} subtitle={t('ac_no_subs_sub')} />
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Segments */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        >
          {tab === 'overview' && renderOverview()}
          {tab === 'orders' && (orders.length ? orders.map((o) => renderOrderCard(o)) : (
            <EmptyState ionicon="receipt-outline" title="Aucune commande" subtitle="Les commandes du site apparaîtront ici." />
          ))}
          {tab === 'licenses' && renderLicenses()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', padding: 14, paddingBottom: 6, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12.5, fontWeight: '800', color: colors.muted },
  grid: { flexDirection: 'row' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  badge: { fontSize: 12, fontWeight: '800' },
  client: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 8 },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  meta2: { fontSize: 11.5, color: colors.muted, marginTop: 2, fontFamily: 'monospace' },
  subChip: { fontSize: 12.5, color: colors.accent, fontWeight: '700', marginTop: 6 },
  planBig: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtnSmall: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  actionText: { fontSize: 12.5, fontWeight: '800' },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  logoPreview: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    resizeMode: 'contain',
  },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 15, fontWeight: '800', color: colors.text },
  logoHint: { fontSize: 10.5, color: colors.muted, marginTop: 4 },
  logoBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  logoBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});
