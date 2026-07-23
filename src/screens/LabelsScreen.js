import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Text,
  TouchableOpacity, View, Share,
} from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as SecureStore from 'expo-secure-store'
import { useFocusEffect } from '@react-navigation/native'
import { useThemedStyles } from '../hooks/useThemedStyles'
import api from '../api/client'
import { useLocale } from '../context/LocaleContext'
import { colors } from '../theme/colors'
import { SERVER_URL } from '../config'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'

export default function LabelsScreen({ navigation }) {
  const { t } = useLocale()
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const styles = useThemedStyles(c => ({
    wrap: { flex: 1, backgroundColor: c.bg },
    searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
    searchInput: {
      flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 14,
      paddingVertical: 10, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border,
    },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    filterBtn: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
      backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border,
    },
    filterBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterText: { fontSize: 12, fontWeight: '700', color: c.muted },
    filterTextActive: { color: '#fff' },
    item: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    check: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2,
      borderColor: c.primary, alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    checkOn: { backgroundColor: c.primary },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    sku: { fontSize: 12, color: c.muted, marginTop: 2 },
    barcode: { fontSize: 11, color: c.primary, marginTop: 1, fontFamily: 'monospace' },
    bottomBar: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bgAlt,
      alignItems: 'center', gap: 12,
    },
    count: { flex: 1, fontSize: 13, color: c.muted },
    genBtn: {
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12,
      paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    genBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    genBtnDisabled: { opacity: 0.4 },
    searchInputFocused: { borderColor: c.primary },
  }))

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/products', { params: { per_page: 200, all: 1 } })
      setProducts(res.data.data ?? [])
    } catch (e) {
      Alert.alert('Erreur', e?.message)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { fetchData() }, []))

  const toggle = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const selectAll = () => {
    const all = {}
    filtered.forEach(p => { all[p.id] = true })
    setSelected(prev => {
      const allSelected = filtered.every(p => prev[p.id])
      if (allSelected) {
        const next = { ...prev }
        filtered.forEach(p => { delete next[p.id] })
        return next
      }
      return { ...prev, ...all }
    })
  }

  const filtered = products.filter(p => {
    if (query) {
      const q = query.toLowerCase()
      if (!p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q) && !p.barcode?.includes(q)) return false
    }
    if (filter === 'barcoded') return !!p.barcode
    if (filter === 'nobarcode') return !p.barcode
    return true
  })

  const count = Object.values(selected).filter(Boolean).length

  const generate = async () => {
    const ids = Object.entries(selected).filter(([,v]) => v).map(([k]) => k)
    if (!ids.length) return
    setBusy(true)
    try {
      const token = await SecureStore.getItemAsync('token')
      const url = `${SERVER_URL}/api/products-labels.pdf?ids=${ids.join(',')}`
      const res = await FileSystem.downloadAsync(url, `${FileSystem.documentDirectory}labels-${Date.now()}.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Étiquettes' })
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de générer les étiquettes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
          <Icon name="search" size={16} color={colors.muted} />
          <Text
            style={{ flex: 1, paddingVertical: 10, paddingLeft: 8, color: colors.text, fontSize: 15 }}
            onPress={() => navigation.navigate('Scanner', { onScan: (code) => setQuery(code) })}
          >
            {query || 'Rechercher un produit…'}
          </Text>
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
              <Icon name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'barcoded', label: 'Avec code-barres' },
          { key: 'nobarcode', label: 'Sans code-barres' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.filterBtn, { marginLeft: 'auto' }]} onPress={selectAll}>
          <Text style={styles.filterText}>Tout sélectionner</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => toggle(item.id)} activeOpacity={0.7}>
              <View style={[styles.check, selected[item.id] && styles.checkOn]}>
                {selected[item.id] ? <Icon name="check" size={14} color="#fff" /> : null}
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sku}>{item.sku}</Text>
                {item.barcode ? <Text style={styles.barcode}>{item.barcode}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState icon="search" title="Aucun produit trouvé" />}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <View style={styles.bottomBar}>
        <Text style={styles.count}>{count} produit(s) sélectionné(s)</Text>
        <TouchableOpacity
          style={[styles.genBtn, (!count || busy) && styles.genBtnDisabled]}
          onPress={generate}
          disabled={!count || busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="printer" size={18} color="#fff" />
              <Text style={styles.genBtnText}>Générer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
