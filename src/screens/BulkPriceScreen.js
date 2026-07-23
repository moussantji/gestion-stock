import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator, Alert, FlatList, ScrollView, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useThemedStyles } from '../hooks/useThemedStyles'
import api, { getErrorMessage } from '../api/client'
import { colors } from '../theme/colors'
import { useLocale } from '../context/LocaleContext'
import { formatMoney } from '../utils/format'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'

export default function BulkPriceScreen({ navigation }) {
  const { t } = useLocale()
  const [categories, setCategories] = useState([])
  const [catId, setCatId] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('pct') // pct | fixed
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState({})

  const styles = useThemedStyles(c => ({
    wrap: { flex: 1, backgroundColor: c.bg },
    catRow: {
      flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, gap: 8,
    },
    catBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border,
    },
    catBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    catText: { fontSize: 13, fontWeight: '700', color: c.muted },
    catTextActive: { color: '#fff' },
    controls: {
      backgroundColor: c.card, marginHorizontal: 16, marginTop: 12,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border,
    },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    modeBtn: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border,
    },
    modeBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    modeText: { fontSize: 12, fontWeight: '700', color: c.muted },
    modeTextActive: { color: '#fff' },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: {
      flex: 1, backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 12,
      paddingVertical: 10, color: c.text, fontSize: 16, fontWeight: '700',
      borderWidth: 1, borderColor: c.border, textAlign: 'center',
    },
    applyBtn: {
      backgroundColor: c.primary, borderRadius: 10, paddingVertical: 12,
      paddingHorizontal: 20, alignItems: 'center',
    },
    applyBtnDisabled: { opacity: 0.4 },
    applyText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    item: {
      backgroundColor: c.card, marginHorizontal: 16, marginTop: 8,
      borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border,
    },
    itemName: { fontSize: 14, fontWeight: '700', color: c.text },
    itemSku: { fontSize: 11, color: c.muted, marginTop: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
    oldPrice: { fontSize: 13, color: c.muted, textDecorationLine: 'line-through' },
    newPrice: { fontSize: 16, fontWeight: '900', color: c.success },
    noChange: { fontSize: 13, color: c.muted },
    saveBar: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bgAlt,
      alignItems: 'center', gap: 12,
    },
    saveCount: { flex: 1, fontSize: 13, color: c.muted },
    saveBtn: {
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12,
      paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    loading: { marginTop: 60 },
  }))

  const load = async () => {
    try {
      setLoading(true)
      const [catRes] = await Promise.all([api.get('/categories')])
      setCategories(catRes.data.data ?? [])
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const selectCat = async (id) => {
    setCatId(id)
    setChanges({})
    setValue('')
    try {
      setLoading(true)
      const res = await api.get('/products', { params: { category_id: id, per_page: 500 } })
      setProducts(res.data.data ?? [])
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const preview = () => {
    const v = parseFloat(value)
    if (isNaN(v) || v === 0) { setChanges({}); return }
    const next = {}
    products.forEach(p => {
      const base = parseFloat(p.sale_price) || 0
      if (base <= 0) return
      const newPrice = mode === 'pct' ? base * (1 + v / 100) : base + v
      if (newPrice <= 0 || newPrice === base) return
      next[p.id] = { old: base, new: Math.round(newPrice * 100) / 100 }
    })
    setChanges(next)
  }

  const save = async () => {
    const entries = Object.entries(changes)
    if (!entries.length) return
    setSaving(true)
    try {
      const payload = entries.map(([id, p]) => ({ id: Number(id), sale_price: p.new }))
      await api.post('/products/bulk-price', { products: payload })
      Alert.alert('✅', `${entries.length} produit(s) mis à jour`)
      setChanges({})
      setValue('')
      selectCat(catId)
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.catRow}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catBtn, catId === c.id && styles.catBtnActive]}
              onPress={() => selectCat(c.id)}
            >
              <Text style={[styles.catText, catId === c.id && styles.catTextActive]}>
                {c.name} ({c.products_count ?? 0})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {catId ? (
          <View style={styles.controls}>
            <View style={styles.modeRow}>
              {[
                { key: 'pct', label: '%' },
                { key: 'fixed', label: 'Montant fixe' },
              ].map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
                  onPress={() => { setMode(m.key); setChanges({}) }}
                >
                  <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder={mode === 'pct' ? '+15' : '+500'}
                placeholderTextColor={colors.muted}
              />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.muted }}>
                {mode === 'pct' ? '%' : 'FCFA'}
              </Text>
              <TouchableOpacity style={[styles.applyBtn, (!value || saving) && styles.applyBtnDisabled]} onPress={preview} disabled={!value || saving}>
                <Text style={styles.applyText}>Aperçu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        ) : catId ? (
          (Object.keys(changes).length > 0 ? products : products.filter(p => p.sale_price > 0)).map(p => {
            const ch = changes[p.id]
            return (
              <View key={p.id} style={styles.item}>
                <Text style={styles.itemName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.itemSku}>{p.sku} • Pris actuel : {formatMoney(p.sale_price)}</Text>
                {ch ? (
                  <View style={styles.priceRow}>
                    <Text style={styles.oldPrice}>{formatMoney(ch.old)}</Text>
                    <Icon name="arrowRight" size={16} color={colors.success} />
                    <Text style={styles.newPrice}>{formatMoney(ch.new)}</Text>
                    <Text style={{ fontSize: 12, color: colors.success }}>
                      ({mode === 'pct' ? `${value}%` : formatMoney(parseFloat(value || '0'))})
                    </Text>
                  </View>
                ) : null}
              </View>
            )
          })
        ) : (
          <EmptyState icon="categories" title="Sélectionne une catégorie" subtitle="Les produits de la catégorie s'afficheront ici" />
        )}
      </ScrollView>

      {Object.keys(changes).length > 0 ? (
        <View style={styles.saveBar}>
          <Text style={styles.saveCount}>{Object.keys(changes).length} produit(s) modifié(s)</Text>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.4 }]} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}
