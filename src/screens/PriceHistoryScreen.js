import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View, Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useThemedStyles } from '../hooks/useThemedStyles'
import api, { getErrorMessage } from '../api/client'
import { colors } from '../theme/colors'
import { useLocale } from '../context/LocaleContext'
import { formatDateTime, formatMoney } from '../utils/format'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

const { width: SW } = Dimensions.get('window')
const CHART_H = 160
const PAD = 16

export default function PriceHistoryScreen({ navigation }) {
  const { t } = useLocale()
  const [products, setProducts] = useState([])
  const [selId, setSelId] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const styles = useThemedStyles(c => ({
    wrap: { flex: 1, backgroundColor: c.bg },
    prodRow: {
      flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, gap: 8,
    },
    prodBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border,
    },
    prodBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    prodText: { fontSize: 13, fontWeight: '700', color: c.muted, maxWidth: 120 },
    prodTextActive: { color: '#fff' },
    card: {
      backgroundColor: c.card, marginHorizontal: 16, marginTop: 12,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    priceLabel: { fontSize: 12, color: c.muted },
    priceVal: { fontSize: 16, fontWeight: '900', color: c.text },
    currentPrice: { fontSize: 22, fontWeight: '900', color: c.primary },
    line: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    lineDate: { flex: 1, fontSize: 12, color: c.muted },
    lineOld: { fontSize: 13, color: c.muted, textDecorationLine: 'line-through', marginRight: 8 },
    lineNew: { fontSize: 14, fontWeight: '800', color: c.text },
    lineDiff: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
    diffUp: { color: c.success },
    diffDown: { color: c.danger },
    loading: { marginTop: 60 },
  }))

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get('/products', { params: { per_page: 200, all: 1 } })
      setProducts(res.data.data ?? [])
    } catch (e) {
      Alert.alert('Erreur', getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const selectProduct = async (id) => {
    setSelId(id)
    setHistory([])
    try {
      setLoading(true)
      const res = await api.get(`/products/${id}/price-history`)
      setHistory(res.data.data ?? [])
    } catch (e) {
      // If endpoint doesn't exist, just show empty
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const points = history.map((h, i) => ({
    x: PAD + (i / Math.max(history.length - 1, 1)) * (SW - PAD * 4),
    y: h.new_price,
  }))
  const maxY = Math.max(...points.map(p => p.y), 1)
  const minY = Math.min(...points.map(p => p.y), 0)
  const range = maxY - minY || 1
  const chartPts = points.map(p => ({
    x: p.x,
    y: CHART_H - 20 - ((p.y - minY) / range) * (CHART_H - 40),
  }))

  const selProd = products.find(p => p.id === selId)

  return (
    <View style={styles.wrap}>
      <View style={styles.prodRow}>
        {products.slice(0, 50).map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.prodBtn, selId === p.id && styles.prodBtnActive]}
            onPress={() => selectProduct(p.id)}
          >
            <Text style={[styles.prodText, selId === p.id && styles.prodTextActive]} numberOfLines={1}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : selId && selProd ? (
        <FlatList
          data={history}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{selProd.name}</Text>
                <Text style={styles.currentPrice}>{formatMoney(selProd.sale_price)}</Text>
                <Text style={styles.priceLabel}>Prix de vente actuel</Text>
              </View>

              {chartPts.length >= 2 ? (
                <View style={[styles.card, { padding: 0, overflow: 'hidden', paddingTop: 14 }]}>
                  <Svg width={SW - PAD * 2} height={CHART_H}>
                    <Defs>
                      <LinearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.primary} stopOpacity="0.2" />
                        <Stop offset="1" stopColor={colors.primary} stopOpacity="0.01" />
                      </LinearGradient>
                    </Defs>
                    {chartPts.length >= 2 ? (
                      <>
                        {chartPts.slice(0, -1).map((pt, i) => (
                          <Path
                            key={i}
                            d={`M ${pt.x} ${pt.y} L ${chartPts[i + 1].x} ${chartPts[i + 1].y}`}
                            stroke={colors.primary}
                            strokeWidth="2"
                            fill="none"
                          />
                        ))}
                        <Path
                          d={chartPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') +
                            ` L ${chartPts[chartPts.length - 1].x} ${CHART_H - 20} L ${chartPts[0].x} ${CHART_H - 20} Z`}
                          fill="url(#pg)"
                        />
                        {chartPts.map((pt, i) => (
                          <Circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill={colors.primary} />
                        ))}
                      </>
                    ) : null}
                  </Svg>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item, index }) => {
            const oldPrice = index < history.length - 1 ? history[index + 1].new_price : item.old_price
            const diff = item.new_price - (oldPrice || item.new_price)
            return (
              <View style={[styles.line, index === 0 && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}>
                <Text style={styles.lineDate}>{formatDateTime(item.created_at)}</Text>
                {oldPrice ? <Text style={styles.lineOld}>{formatMoney(oldPrice)}</Text> : null}
                <Text style={styles.lineNew}>{formatMoney(item.new_price)}</Text>
                {diff !== 0 ? (
                  <Text style={[styles.lineDiff, diff > 0 ? styles.diffUp : styles.diffDown]}>
                    {diff > 0 ? '+' : ''}{formatMoney(diff)}
                  </Text>
                ) : null}
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState icon="stats" title="Aucun historique" subtitle="L'historique des prix apparaîtra une fois que le serveur le fournit" />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      ) : (
        <EmptyState icon="search" title="Sélectionne un produit" subtitle="Choisis un produit ci-dessus pour voir son historique" />
      )}
    </View>
  )
}
