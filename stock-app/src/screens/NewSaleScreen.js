import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { getErrorMessage } from '../api/client';
import { mediaUrl } from '../config';
import { useLocale } from '../context/LocaleContext';
import { uuid } from '../utils/offlineQueue';
import { listQuotes, removeQuote, saveQuote, buildQuoteText } from '../utils/quotes'; // 🧾 v21 (v2.10)
import { effectivePrice, promoActive } from '../utils/promo'; // 🏷️ v22 (v2.11)
import { colors } from '../theme/colors';
import { formatMoney } from '../utils/format';
import Field from '../components/Field';
import PickerModal from '../components/PickerModal';
import ReceiptActionsSheet from '../components/ReceiptActionsSheet';

/** Nouvelle vente : panier multi-produits → sortie de stock + reçu (PDF A5/ticket/BT). */
export default function NewSaleScreen({ navigation }) {
  const { t } = useLocale();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // {product_id, name, unit_price, quantity, max}
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  // 👥 Fiche client CRM liée (optionnel)
  const [customer, setCustomer] = useState(null);
  const [customerPicker, setCustomerPicker] = useState(false);
  const [customers, setCustomers] = useState(null); // null = pas encore chargés
  // 💳 Paiement : comptant (total) ou crédit/partiel (montant libre)
  const [payMode, setPayMode] = useState('full'); // 'full' | 'credit'
  // 🎁 Fidélité : conversion de points en remise
  const [loyalty, setLoyalty] = useState({ earn_per: 1000, point_value: 10 });
  const [tvaCfg, setTvaCfg] = useState(null); // 🧮 v2.9 : multi-TVA du /shop (null = masqué)
  const [usePoints, setUsePoints] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shareReceipt, setShareReceipt] = useState(null); // reçu à partager/imprimer
  // 🧾 v21 (v2.10) : devis / proforma locaux (brouillons fichier, zéro serveur)
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);

  // 🏬📦 v13 : stock de MON emplacement (boutique) si fourni, sinon global
  const effQty = (p) => (p.shop_stock ?? p.quantity);

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { params: { all: 1, sort: 'name' } });
      setProducts(res.data.data.filter((p) => effQty(p) > 0));
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setLoadingProducts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoadingProducts(true);
      loadProducts();
    }, [])
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
      .slice(0, 6);
  }, [search, products]);

  // 👥 Chargement paresseux des fiches clients à l'ouverture du sélecteur
  const openCustomerPicker = async () => {
    setCustomerPicker(true);
    if (customers !== null) return;
    try {
      const res = await api.get('/customers', { params: { all: 1 } });
      setCustomers(res.data?.data ?? []);
      // 🎁 Paramètres fidélité actuels (non bloquant)
      api.get('/shop').then((r) => {
        const ly = r.data?.shop?.loyalty;
        if (ly) setLoyalty({ earn_per: ly.earn_per ?? 1000, point_value: ly.point_value ?? 10 });
        setTvaCfg(r.data?.tva ?? null); // 🧮 v2.9 : config multi-TVA (absente = vieux serveur → masquée)
      }).catch(() => {});
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
      setCustomers([]);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, effQty(product)) }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          image_url: product.image_url ?? null, // 📸 v2.9 : vignette dans le panier
          category_id: product.category_id ?? null, // 🧮 v2.9 : résolution du taux TVA
          sale_price: Math.round(parseFloat(product.sale_price) || 0),
          wholesale_price: product.wholesale_price != null
            ? Math.round(parseFloat(product.wholesale_price) || 0)
            : null,
          promo_price: product.promo_price != null ? Math.round(Number(product.promo_price)) : null, // 🏷️ v22
          unit_price: effectivePrice(product, customer?.price_tier === 'wholesale'), // 🏷️ v22 : promo active = prix promo (détail)
          quantity: 1,
          max: effQty(product), // 🏬📦 plafond = stock de mon emplacement
        },
      ];
    });
    setSearch('');
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId
          ? { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, i.max)) }
          : i
      )
    );
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.product_id !== productId));

  // ---------- 🧾 v21 (v2.10) : Devis / proforma LOCAUX (zéro serveur) ----------
  const openQuotes = async () => { setQuotes(await listQuotes()); setQuotesOpen(true); };

  const saveQuoteDraft = async () => {
    if (!cart.length) { Alert.alert('🧾', t('q_empty')); return; }
    const lines = cart.map((i) => ({ product_id: i.product_id, name: i.name, qty: i.quantity, unit_price: i.unit_price }));
    const rec = await saveQuote(lines, { customer });
    if (!rec) { Alert.alert('🧾', t('q_empty')); return; }
    setQuotes(await listQuotes());
    Alert.alert('✅', `${t('q_saved')} ${rec.id}`);
  };

  /** 📤 Texte mis en forme → fiche de partage système (WhatsApp & co). */
  const shareQuote = async (q) => {
    try {
      const shopRes = await api.get('/shop').catch(() => null);
      const message = buildQuoteText(q, shopRes?.data?.shop, t);
      setQuotesOpen(false);
      await Share.share({ message }); // WhatsApp proposé par la fiche système (zéro dépendance)
    } catch (e) {
      if (String(e?.message ?? '') !== 'User did not share') Alert.alert('⚠️', t('wa_ko'));
    }
  };

  /** ↩️ Conversion en vente : recharge le brouillon dans le panier. */
  const loadQuote = (q) => {
    const apply = () => {
      let loaded = 0; let missing = 0;
      const next = [];
      (q.lines ?? []).forEach((l) => {
        const p = products.find((x) => x.id === l.product_id);
        if (!p) { missing++; return; }
        next.push({
          product_id: p.id,
          name: p.name,
          image_url: p.image_url ?? null,
          category_id: p.category_id ?? null,
          sale_price: Math.round(parseFloat(p.sale_price) || 0),
          wholesale_price: p.wholesale_price != null ? Math.round(parseFloat(p.wholesale_price) || 0) : null,
          unit_price: l.unit_price ?? Math.round(parseFloat(p.sale_price) || 0), // prix chiffré au moment du devis
          quantity: Math.min(l.qty, Math.max(1, effQty(p))),
          max: effQty(p),
        });
        loaded++;
      });
      setCart(next);
      if (q.customer?.id) {
        const c = (customers ?? []).find((x) => x.id === q.customer.id);
        if (c) setCustomer(c);
      }
      setUsePoints(false);
      setQuotesOpen(false);
      Alert.alert('↩️', t('q_loaded', { n: loaded }) + (missing ? `\n${t('q_missing', { n: missing })}` : ''));
    };
    if (cart.length) {
      Alert.alert('🧾', t('q_confirm_replace'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('q_load'), onPress: apply },
      ]);
    } else apply();
  };

  const deleteQuote = (q) => {
    Alert.alert('🗑', q.id, [
      { text: t('cancel'), style: 'cancel' },
      { text: '🗑', style: 'destructive', onPress: async () => { await removeQuote(q.id); setQuotes(await listQuotes()); } },
    ]);
  };

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  // 🎁 Points convertibles : plafonnés au solde du client ET au total (remise ≤ total)
  const maxRedeemable = customer
    ? Math.min(customer.loyalty_points ?? 0, Math.floor(total / Math.max(1, loyalty.point_value)))
    : 0;
  const pointsDiscount = usePoints && customer ? maxRedeemable * loyalty.point_value : 0;
  const netTotal = Math.max(0, total - pointsDiscount);

  // 🧮 v2.9 — estimation « dont TVA » du panier, groupée par taux (prix TTC)
  // Même résolution que le serveur : produit → catégorie → taux par défaut.
  const tvaLines = (() => {
    if (!tvaCfg?.enabled) return [];
    const per = new Map();
    for (const i of cart) {
      const ttc = i.unit_price * i.quantity;
      if (ttc <= 0) continue;
      const rate = Number(tvaCfg.products?.[String(i.product_id)]
        ?? tvaCfg.categories?.[String(i.category_id)]
        ?? tvaCfg.default_rate ?? 0) || 0;
      if (rate > 0) per.set(rate, (per.get(rate) ?? 0) + Math.round(ttc - ttc / (1 + rate / 100)));
    }
    return [...per.entries()].sort((a, b) => a[0] - b[0]); // taux croissants (lecture comptable)
  })();

  // 💳 Aperçu du reste à payer en mode crédit (net de remise fidélité)
  const remainingPreview =
    payMode === 'credit' ? Math.max(0, netTotal - (parseInt(paidAmount, 10) || 0)) : 0;

  // 👥 Sélection d'un client : prix de gros auto si client « gros » (+ reset fidélité)
  const selectCustomer = (id) => {
    const c = (customers ?? []).find((x) => x.id === id) ?? null;
    setCustomer(c);
    setUsePoints(false);
    const wholesale = c?.price_tier === 'wholesale';
    setCart((prev) =>
      prev.map((i) => ({
        ...i,
        unit_price: wholesale ? (i.wholesale_price ?? i.sale_price) : effectivePrice(i, false), // 🏷️ v22 : retour détail = promo si active
      }))
    );
  };

  const clearCustomer = () => {
    setCustomer(null);
    setUsePoints(false);
    setCart((prev) => prev.map((i) => ({ ...i, unit_price: effectivePrice(i, false) }))); // retour au prix détail (promo si active) // 🏷️ v22
  };

  const submit = async () => {
    if (cart.length === 0) {
      Alert.alert('🛒', t('sale_empty_error'));
      return;
    }
    setSubmitting(true);
    try {
      // 💳 Comptant = total NET exact · crédit = montant saisi (plafonné côté API)
      const amountPaid =
        payMode === 'full' ? netTotal : Math.max(0, Math.min(netTotal, parseInt(paidAmount, 10) || 0));

      const res = await api.post('/receipts', {
        customer_id: customer?.id ?? null, // 👥 fiche CRM liée (snapshot nom/tél côté API)
        client_name: customer ? null : clientName.trim() || null,
        client_phone: customer ? null : clientPhone.trim() || null,
        client_uuid: uuid(),
        amount_paid: amountPaid,
        points_redeem: usePoints ? maxRedeemable : 0, // 🎁
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });

      const receipt = res.data.data;
      const earned = Number(res.data?.points_earned ?? 0); // 🎁
      const remaining = Number(receipt.remaining ?? 0);
      const successMsg = (remaining > 0
        ? t('sale_done_credit_msg', {
            number: receipt.number,
            paid: formatMoney(receipt.amount_paid),
            remaining: formatMoney(remaining),
          })
        : t('sale_done_msg', { number: receipt.number, total: formatMoney(receipt.total - (receipt.points_discount ?? 0)) })
      ) + (earned > 0 ? t('sale_points_earned', { n: earned }) : '');

      Alert.alert(remaining > 0 ? t('sale_done_credit') : t('sale_done'), successMsg, [
        { text: t('sale_share'), onPress: () => setShareReceipt({ id: receipt.id, number: receipt.number }) },
        { text: t('sale_later'), style: 'cancel' },
      ]);

      setCart([]);
      setClientName('');
      setClientPhone('');
      setCustomer(null);
      setUsePoints(false); // 🎁
      setPayMode('full');
      setPaidAmount('');
      loadProducts(); // refresh stocks
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* ---- Recherche produit ---- */}
        <TextInput
          style={styles.search}
          placeholder={t('sale_search_ph')}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {loadingProducts && search ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} /> : null}
        {filtered.length > 0 ? (
          <View style={styles.results}>
            {filtered.map((p) => (
              <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => addToCart(p)}>
                {/* 📸 v2.9 : vignette produit (placeholder 📦 si absente) */}
                {p.image_url ? (
                  <Image source={{ uri: mediaUrl(p.image_url) }} style={styles.resultThumb} />
                ) : (
                  <View style={[styles.resultThumb, styles.thumbPh]}><Text style={{ fontSize: 15 }}>📦</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{p.name}</Text>
                  {/* 🏷️ v22 : prix promo barré si actif (détail uniquement) */}
                  {promoActive(p) && customer?.price_tier !== 'wholesale' ? (
                    <Text style={styles.resultMeta}>
                      <Text style={{ color: colors.warning, fontWeight: '800' }}>{formatMoney(p.promo_price)}</Text>
                      {' '}<Text style={{ textDecorationLine: 'line-through' }}>{formatMoney(p.sale_price)}</Text>
                      {' 🏷️ · '}{effQty(p)} dispo
                    </Text>
                  ) : (
                    <Text style={styles.resultMeta}>{formatMoney(p.sale_price)} · {effQty(p)} dispo</Text>
                  )}
                </View>
                <Text style={styles.addBtn}>＋</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* ---- Panier ---- */}
        <View style={styles.cartHeadRow}>
          <Text style={styles.sectionTitle}>🛒 {t('sale_cart')}</Text>
          {/* 🧾 v20 : brouillons de devis (locaux, zéro serveur) */}
          <TouchableOpacity onPress={openQuotes} style={styles.quoteBtn} accessibilityLabel={t('q_title')}>
            <Text style={styles.quoteBtnText}>🧾 {t('q_btn')}</Text>
          </TouchableOpacity>
        </View>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={{ fontSize: 34 }}>🛒</Text>
            <Text style={styles.emptyTitle}>{t('sale_cart_empty')}</Text>
            <Text style={styles.emptySub}>{t('sale_cart_hint')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {cart.map((item) => (
              <View key={item.product_id} style={styles.cartRow}>
                {/* 📸 v2.9 : vignette de la ligne panier */}
                {item.image_url ? (
                  <Image source={{ uri: mediaUrl(item.image_url) }} style={styles.cartThumb} />
                ) : (
                  <View style={[styles.cartThumb, styles.thumbPh]}><Text style={{ fontSize: 13 }}>📦</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cartSub}>
                    {formatMoney(item.unit_price)} × {item.quantity} ={' '}
                    <Text style={{ color: colors.accent, fontWeight: '800' }}>
                      {formatMoney(item.unit_price * item.quantity)}
                    </Text>
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(item.product_id, -1)}>
                    <Text style={styles.stepText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepQty}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(item.product_id, 1)}>
                    <Text style={styles.stepText}>＋</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.product_id)} hitSlop={8} style={{ marginLeft: 10 }}>
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('sale_total')}</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            </View>
            {/* 🧮 v2.9 : estimation « dont TVA » par taux (prix TTC, ventilation au reçu) */}
            {tvaLines.map(([rate, amt]) => (
              <View key={`tva-${rate}`} style={styles.totalRow}>
                <Text style={styles.tvaLabel}>{t('tva_incl', { rate })}</Text>
                <Text style={styles.tvaValue}>{formatMoney(amt)}</Text>
              </View>
            ))}
            {pointsDiscount > 0 ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.pointsLabel}>🎁 {t('sale_points_discount', { n: maxRedeemable })}</Text>
                  <Text style={[styles.totalValue, { color: colors.success }]}>−{formatMoney(pointsDiscount)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('sale_net')}</Text>
                  <Text style={[styles.totalValue, { color: colors.accent }]}>{formatMoney(netTotal)}</Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* ---- Client ---- */}
        {/* 👥 Lien fiche CRM (optionnel) */}
        {customer ? (
          <>
            <View style={styles.customerChip}>
              <Text style={styles.customerChipIcon}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerChipName} numberOfLines={1}>
                  {customer.name}
                  {customer.price_tier === 'wholesale' ? `  🏷 ${t('cu_tier_wholesale')}` : ''}
                </Text>
                {customer.phone ? <Text style={styles.customerChipPhone}>{customer.phone}</Text> : null}
              </View>
              <TouchableOpacity onPress={clearCustomer} hitSlop={10}>
                <Text style={styles.customerChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 🎁 Fidélité : convertir les points en remise */}
            <View style={styles.pointsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsLabel}>
                  🎁 {t('sale_points_balance', { n: customer.loyalty_points ?? 0 })}
                </Text>
                <Text style={styles.pointsHint}>
                  {usePoints && maxRedeemable > 0
                    ? t('sale_points_will_redeem', { n: maxRedeemable, amount: formatMoney(pointsDiscount) })
                    : t('sale_points_hint', { value: loyalty.point_value })}
                </Text>
              </View>
              <Switch
                value={usePoints && maxRedeemable > 0 && cart.length > 0}
                onValueChange={setUsePoints}
                disabled={(customer.loyalty_points ?? 0) === 0 || cart.length === 0}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.linkCustomerBtn} onPress={openCustomerPicker}>
              <Text style={styles.linkCustomerText}>{t('sale_link_customer')}</Text>
            </TouchableOpacity>
            <Field label={t('sale_client')} placeholder={t('sale_client_ph')} value={clientName} onChangeText={setClientName} />
            <Field label={t('sale_phone')} placeholder={t('sale_phone_ph')} keyboardType="phone-pad" value={clientPhone} onChangeText={setClientPhone} />
          </>
        )}

        {/* ---- 💳 Paiement (comptant ou crédit / partiel) ---- */}
        <Text style={styles.sectionTitle}>💰 {t('sale_payment')}</Text>
        <View style={styles.payTabs}>
          <TouchableOpacity
            style={[styles.payTab, payMode === 'full' && styles.payTabActive]}
            onPress={() => setPayMode('full')}
          >
            <Text style={[styles.payTabText, payMode === 'full' && styles.payTabTextActive]}>
              {t('sale_pay_full')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payTab, payMode === 'credit' && styles.payTabCreditActive]}
            onPress={() => setPayMode('credit')}
          >
            <Text style={[styles.payTabText, payMode === 'credit' && { color: colors.warning }]}>
              {t('sale_pay_credit')}
            </Text>
          </TouchableOpacity>
        </View>
        {payMode === 'credit' ? (
          <View>
            <Field
              label={t('sale_paid_label')}
              placeholder={t('sale_paid_ph')}
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />
            <View style={styles.restRow}>
              <Text style={styles.restLabel}>{t('sale_remaining')}</Text>
              <Text
                style={[
                  styles.restValue,
                  { color: remainingPreview > 0 ? colors.warning : colors.success },
                ]}
              >
                {formatMoney(remainingPreview)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ---- Valider ---- */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || cart.length === 0) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting || cart.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('sale_submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Feuille d'actions du reçu : A5 · ticket 80mm · image · impression Bluetooth */}
      <ReceiptActionsSheet
        receipt={shareReceipt}
        onClose={() => setShareReceipt(null)}
        navigation={navigation}
      />

      {/* 🧾 v20 : modale devis (enregistrer le panier + brouillons récents) */}
      <Modal visible={quotesOpen} transparent animationType="slide" onRequestClose={() => setQuotesOpen(false)}>
        <View style={styles.quoteOverlay}>
          <View style={styles.quoteCard}>
            <View style={styles.quoteHead}>
              <Text style={styles.quoteTitle}>🧾 {t('q_title')}</Text>
              <TouchableOpacity onPress={() => setQuotesOpen(false)} hitSlop={8}>
                <Text style={{ fontSize: 17, color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.quoteSave} onPress={saveQuoteDraft} disabled={cart.length === 0}>
              <Text style={[styles.quoteSaveText, cart.length === 0 && { opacity: 0.5 }]}>➕ {t('q_save')}</Text>
            </TouchableOpacity>
            <Text style={styles.quoteSection}>{t('q_list', { n: quotes.length })}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {quotes.length === 0 ? (
                <Text style={styles.quoteNone}>{t('q_none')}</Text>
              ) : quotes.map((q) => (
                <View key={q.id} style={styles.quoteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quoteId} numberOfLines={1}>{q.id}</Text>
                    <Text style={styles.quoteMeta} numberOfLines={1}>
                      {new Date(q.created_at).toLocaleDateString('fr-FR')} · {(q.lines ?? []).length} art.
                      {q.customer?.name ? ` · ${q.customer.name}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.quoteTotal}>{formatMoney(q.total)}</Text>
                  <TouchableOpacity onPress={() => shareQuote(q)} hitSlop={6} style={styles.quoteAction} accessibilityLabel={t('q_share')}>
                    <Text style={{ fontSize: 15 }}>📤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => loadQuote(q)} hitSlop={6} style={styles.quoteAction} accessibilityLabel={t('q_load')}>
                    <Text style={{ fontSize: 15 }}>↩️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteQuote(q)} hitSlop={6} style={styles.quoteAction}>
                    <Text style={{ fontSize: 14 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 👥 Sélecteur de fiche client */}
      <PickerModal
        visible={customerPicker}
        title={t('sale_pick_customer')}
        options={(customers ?? []).map((c) => ({
          label: c.phone ? `${c.name} · ${c.phone}` : c.name,
          value: c.id,
        }))}
        value={customer?.id}
        onSelect={selectCustomer}
        onClose={() => setCustomerPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pointsLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  pointsHint: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  search: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  results: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: { fontSize: 14, fontWeight: '700', color: colors.text },
  resultMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  resultThumb: { width: 34, height: 34, borderRadius: 8, marginRight: 10, backgroundColor: colors.cardAlt }, // 📸 v2.9
  thumbPh: { alignItems: 'center', justifyContent: 'center' }, // 📸 v2.9 (placeholder 📦)
  tvaLabel: { fontSize: 12, color: colors.muted }, // 🧮 v2.9
  tvaValue: { fontSize: 12, fontWeight: '700', color: colors.muted }, // 🧮 v2.9
  addBtn: { fontSize: 22, color: colors.primary, fontWeight: '800', paddingHorizontal: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  emptyCart: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8 },
  emptySub: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartName: { fontSize: 14, fontWeight: '700', color: colors.text },
  cartSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cartThumb: { width: 30, height: 30, borderRadius: 7, marginRight: 9, backgroundColor: colors.cardAlt }, // 📸 v2.9
  // 🧾 v21 (v2.10) : devis locaux
  cartHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quoteBtn: { backgroundColor: colors.cardAlt, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  quoteBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  quoteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  quoteCard: { backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '82%' },
  quoteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  quoteTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  quoteSave: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  quoteSaveText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  quoteSection: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  quoteNone: { fontSize: 12.5, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 },
  quoteId: { fontSize: 13, fontWeight: '700', color: colors.text },
  quoteMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  quoteTotal: { fontSize: 13, fontWeight: '800', color: colors.accent, marginRight: 2 },
  quoteAction: { paddingHorizontal: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
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
  payTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  payTab: { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: 'center' },
  payTabActive: { backgroundColor: colors.primaryBg },
  payTabCreditActive: { backgroundColor: colors.warningBg },
  payTabText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  payTabTextActive: { color: colors.primary },
  restRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  restLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  restValue: { fontSize: 16, fontWeight: '900' },
  linkCustomerBtn: {
    backgroundColor: colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  linkCustomerText: { color: colors.primary, fontWeight: '800', fontSize: 13.5 },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 12,
    marginTop: 14,
  },
  customerChipIcon: { fontSize: 18, marginRight: 10 },
  customerChipName: { fontSize: 14, fontWeight: '800', color: colors.text },
  customerChipPhone: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  customerChipRemove: { fontSize: 15, color: colors.muted, fontWeight: '800', paddingHorizontal: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: colors.accent },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
