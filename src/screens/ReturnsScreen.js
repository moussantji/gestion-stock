import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator, FlatList, Text, TouchableOpacity, View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useThemedStyles } from '../hooks/useThemedStyles'
import api from '../api/client'
import { colors } from '../theme/colors'
import { useLocale } from '../context/LocaleContext'
import { formatDateTime, formatMoney } from '../utils/format'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'

export default function ReturnsScreen({ navigation }) {
  const { t } = useLocale()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const styles = useThemedStyles(c => ({
    wrap: { flex: 1, backgroundColor: c.bg },
    item: {
      backgroundColor: c.card, marginHorizontal: 16, marginTop: 12,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    num: { fontSize: 15, fontWeight: '800', color: c.text },
    date: { fontSize: 12, color: c.muted, marginTop: 4 },
    client: { fontSize: 13, fontWeight: '600', color: c.text, marginTop: 6 },
    amount: { fontSize: 18, fontWeight: '900', color: c.danger, marginTop: 6 },
    reason: { fontSize: 12, color: c.muted, marginTop: 4, fontStyle: 'italic' },
    badge: {
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 8, backgroundColor: c.dangerBg,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: c.danger },
    loading: { marginTop: 60 },
  }))

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/receipts/credits', { params: { per_page: 50 } })
      setData(res.data.data ?? [])
    } catch (e) {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { fetchData() }, []))

  return (
    <View style={styles.wrap}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.num}>{item.number}</Text>
                  <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>AVOIR</Text>
                </View>
              </View>
              {item.client_name ? <Text style={styles.client}>{item.client_name}</Text> : null}
              <Text style={styles.amount}>-{formatMoney(item.total)}</Text>
              {item.notes ? <Text style={styles.reason}>{item.notes}</Text> : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState icon="sale" title="Aucun avoir" subtitle="Les remboursements et retours apparaîtront ici" />}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
        />
      )}
    </View>
  )
}
