import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, Text,
  TouchableOpacity, View, StatusBar, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { colors, ROLE_LABELS } from '../theme/colors';
import { formatDateTime, formatMoney } from '../utils/format';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { useThemedStyles } from '../hooks/useThemedStyles';

const { width: SW } = Dimensions.get('window');
const PAD = 16;

function smooth(data, mx, w, h) {
  const p = 4;
  const pts = data.map((v, i) => ({ x: p + (i / (data.length - 1)) * (w - p * 2), y: h - p - (v / mx) * (h - p * 2) }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) * 0.3} ${p1.y + (p2.y - p0.y) * 0.3}, ${p2.x - (p3.x - p1.x) * 0.3} ${p2.y - (p3.y - p1.y) * 0.3}, ${p2.x} ${p2.y}`;
  }
  return { d, pts };
}

function HeroBg({ w, h }) {
  const c1 = smooth([4,6,5,8,7,10,9,12,11,13,14], 16, w, h);
  const c2 = smooth([3,5,7,6,9,8,11,10,13,12,14], 16, w, h);
  const c3 = smooth([5,3,4,7,6,8,10,9,12,11,13], 16, w, h);
  const f = (d) => d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', right: 0, top: 0, opacity: 0.5 }}>
      <Defs>
        <LinearGradient id="h1" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={colors.accent} stopOpacity="0"/><Stop offset="0.4" stopColor={colors.accent} stopOpacity="0.12"/><Stop offset="1" stopColor={colors.accent} stopOpacity="0.25"/></LinearGradient>
        <LinearGradient id="h2" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={colors.primary} stopOpacity="0"/><Stop offset="0.4" stopColor={colors.primary} stopOpacity="0.10"/><Stop offset="1" stopColor={colors.primary} stopOpacity="0.20"/></LinearGradient>
        <LinearGradient id="h3" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#D4A0FF" stopOpacity="0"/><Stop offset="0.4" stopColor="#D4A0FF" stopOpacity="0.06"/><Stop offset="1" stopColor="#D4A0FF" stopOpacity="0.15"/></LinearGradient>
      </Defs>
      <Path d={f(c3.d)} fill="url(#h3)"/><Path d={f(c2.d)} fill="url(#h2)"/><Path d={f(c1.d)} fill="url(#h1)"/>
      <Path d={c3.d} fill="none" stroke="#D4A0FF" strokeWidth="1.5" opacity="0.4"/>
      <Path d={c2.d} fill="none" stroke={colors.primary} strokeWidth="1.5" opacity="0.5"/>
      <Path d={c1.d} fill="none" stroke={colors.accent} strokeWidth="2" opacity="0.6"/>
    </Svg>
  );
}

function VentesChart({ data: chartData }) {
  if (!chartData?.labels?.length) return null;
  const YW = 30, CH = 160, GAP = 10;
  const iw = SW - PAD * 2 - YW - GAP - 36;
  const vals = chartData.in.map((v, i) => v + (chartData.out[i] ?? 0));
  const mx = Math.max(...vals, 1);
  const { d, pts } = smooth(vals, mx, iw, CH);
  const area = d + ` L ${pts[pts.length - 1].x} ${CH} L ${pts[0].x} ${CH} Z`;
  const segments = 4;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: CH }}>
        <View style={{ width: YW, justifyContent: 'space-between', paddingVertical: 2 }}>
          {[mx, mx*0.75, mx*0.5, mx*0.25, 0].map((l,i) => (
            <Text key={i} style={{fontSize:9,color:colors.muted,textAlign:'right',width:28}}>
              {l >= 1000 ? `${(l/1000).toFixed(1)}k` : Math.round(l)}
            </Text>
          ))}
        </View>
        <View style={{ flex:1, marginLeft: GAP, overflow:'hidden' }}>
          {Array.from({length: segments + 1}).map((_,i) => (
            <View key={i} style={{position:'absolute',left:0,right:0,top:(i/segments)*CH,height:1,backgroundColor:colors.border,opacity:0.2}} />
          ))}
          <Svg width={iw} height={CH}>
            <Defs><LinearGradient id="vG" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.accent} stopOpacity="0.30"/><Stop offset="1" stopColor={colors.accent} stopOpacity="0.01"/></LinearGradient></Defs>
            <Path d={area} fill="url(#vG)"/>
            <Path d={d} fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round"/>
            {pts.map((p,i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r="5" fill={colors.bg} stroke={colors.accent} strokeWidth="2.5"/>
                <Circle cx={p.x} cy={p.y} r="2" fill={colors.accent}/>
              </React.Fragment>
            ))}
          </Svg>
        </View>
      </View>
      <View style={{flexDirection:'row',marginTop:6,marginLeft:40}}>
        {chartData.labels.map((l,i) => (
          <Text key={i} style={{fontSize:9,color:colors.muted,textAlign:'center',flex:1,textTransform:'capitalize'}}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function DonutChart({ items = [], size = 110, stroke = 14 }) {
  if (!items.length) return null;
  const total = items.reduce((a, d) => a + d.val, 0);
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${cx}, ${cy}`}>
        {items.map((d, i) => {
          const len = (d.val / total) * circ;
          const dash = `${len} ${circ - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={dash} strokeDashoffset={dashOffset} strokeLinecap="round" opacity={0.85}
            />
          );
        })}
      </G>
    </Svg>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, hasRole } = useAuth();
  const { t } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fcCount, setFcCount] = useState(0);
  const [categories, setCategories] = useState([]);

  const CAT_COLORS = [colors.primary, colors.accent, colors.info, colors.success, colors.warning, colors.muted];

  const s = useThemedStyles(colors => ({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: PAD, paddingTop: 12 },
    hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    hi: { fontSize: 22, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14, marginBottom: 12 },
    errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
    
    hero: { backgroundColor: colors.card, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 22, marginBottom: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', minHeight: 120 },
    heroL: { fontSize: 12, color: colors.muted, marginBottom: 8 },
    heroR: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    heroV: { fontSize: 24, fontWeight: '900', color: colors.text },
    badge: { backgroundColor: colors.primaryBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    badgeT: { fontSize: 11, fontWeight: '700', color: colors.primary },
    heroS: { fontSize: 11, color: colors.muted },
    
    saleBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
        marginBottom: 14,
        shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
    saleBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    statsBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.cardAlt, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
        marginBottom: 14, borderWidth: 1, borderColor: colors.primary,
    },
    statsBtnText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
    
    row2: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, paddingRight: 48, borderWidth: 1, borderColor: colors.border },
    statL: { fontSize: 11, color: colors.muted, marginBottom: 4 },
    statV: { fontSize: 22, fontWeight: '900', color: colors.text },
    statS: { fontSize: 10, color: colors.muted, marginTop: 2 },
    statIco: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    
    fcChip: {
      marginTop: 0, marginBottom: 14, alignSelf: 'flex-start',
      backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warning,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    },
    fcChipText: { color: colors.warning, fontSize: 12, fontWeight: '800' },
    
    cd: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    cdH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cdTR: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    cdT: { fontSize: 15, fontWeight: '700', color: colors.text },
    link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    
    vR: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingVertical: 12 },
    vV: { fontSize: 22, fontWeight: '900', color: colors.text },
    moveQty: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
    
    section: {
      backgroundColor: colors.card, borderRadius: 16, padding: 14,
      marginBottom: 14, borderWidth: 1, borderColor: colors.border,
    },
    sectionH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionT: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
    
    skR: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    skL: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    skIco: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    skN: { fontSize: 13, color: colors.text, fontWeight: '600' },
    skR2: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    pT: { flex: 1, height: 6, backgroundColor: colors.cardAlt, borderRadius: 3, overflow: 'hidden' },
    pF: { height: '100%', borderRadius: 3 },
    skP: { fontSize: 12, fontWeight: '700', color: colors.text, width: 36, textAlign: 'right' },

    row: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    rowMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
    rowQty: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  }));

  const fetchData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const [dashRes, catRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/categories').catch(() => ({ data: { data: [] } })),
      ]);
      setData(dashRes.data);
      setCategories(catRes.data?.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
    try {
      const rf = await api.get('/products/restock-forecast');
      setFcCount((rf.data?.data ?? []).filter((r) => Number(r?.days_left ?? 99) <= 7).length);
    } catch { setFcCount(0); }
  };

  useFocusEffect(
    useCallback(() => { fetchData(); }, [])
  );

  const stats = data?.stats;
  const categoriesList = categories.map((c, i) => ({
    label: c.name, val: Number(c.products_count ?? 0),
    color: CAT_COLORS[i % CAT_COLORS.length],
  })).filter((c) => c.val > 0);
  const catItems = categoriesList;
  const totalItems = catItems.reduce((a, c) => a + c.val, 0);
  const stockItems = categoriesList.map((c) => ({
    name: c.label, pct: totalItems > 0 ? Math.round((c.val / totalItems) * 100) : 0, color: c.color,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData()} colors={[colors.primary]} />}
      >
        {/* Header */}
        <View style={s.hdr}>
          <View>
            <Text style={s.hi}>{t('dash_hello')}, {user?.name?.split(' ')[0]}</Text>
            <Text style={s.sub}>{ROLE_LABELS[user?.role] ?? user?.role}</Text>
          </View>
          <Icon name="products" size={34} color={colors.primary} />
        </View>

        {error ? (
          <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
        ) : null}

        {!data && !error ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : null}

        {/* Hero */}
        <View style={s.hero}>
          <HeroBg w={SW - PAD * 2} h={130} />
          <Text style={s.heroL}>{t('dash_stock_value')}</Text>
          <View style={s.heroR}>
            <Text style={s.heroV}>{stats ? formatMoney(stats.stock_value) : '—'}</Text>
            {typeof stats?.movement_trend === 'number' ? (
              <View style={s.badge}>
                <Text style={s.badgeT}>
                  {stats.movement_trend >= 0 ? '↗' : '↘'} {stats.movement_trend > 0 ? '+' : ''}{stats.movement_trend}%
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={s.heroS}>{'Valeur totale du stock'}</Text>
        </View>

        {/* New Sale + Stats buttons */}
        <TouchableOpacity style={s.saleBtn} onPress={() => navigation.navigate('NewSale')} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="sale" size={22} color="#fff" />
            <Text style={s.saleBtnText}>{'Nouvelle vente'}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {hasRole('admin', 'manager') ? (
          <TouchableOpacity style={s.statsBtn} onPress={() => navigation.navigate('Stats')} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="stats" size={22} color={colors.primary} />
              <Text style={s.statsBtnText}>{'Stats des ventes'}</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Stat cards */}
        <View style={s.row2}>
          <View style={s.stat}>
            <Text style={s.statL}>{t('dash_products')}</Text>
            <Text style={s.statV}>{stats?.products ?? '—'}</Text>
            <Text style={s.statS}>{'Références'}</Text>
            <View style={[s.statIco, { backgroundColor: colors.primaryBg, position: 'absolute', top: 12, right: 12 }]}>
              <Icon name="products" size={20} color={colors.primary} />
            </View>
          </View>
          <View style={s.stat}>
            <Text style={s.statL}>{t('dash_low_stock')}</Text>
            <Text style={[s.statV, { color: colors.warning }]}>{stats?.low_stock ?? '—'}</Text>
            <Text style={s.statS}>{'À réapprovisionner'}</Text>
            <View style={[s.statIco, { backgroundColor: colors.warningBg, position: 'absolute', top: 12, right: 12 }]}>
              <Icon name="alertCircle" size={20} color={colors.warning} />
            </View>
          </View>
        </View>

        <View style={s.row2}>
          <View style={s.stat}>
            <Text style={s.statL}>{t('dash_out_of_stock')}</Text>
            <Text style={[s.statV, { color: colors.danger }]}>{stats?.out_of_stock ?? '—'}</Text>
            <Text style={s.statS}>{'En rupture'}</Text>
            <View style={[s.statIco, { backgroundColor: colors.dangerBg, position: 'absolute', top: 12, right: 12 }]}>
              <Icon name="closeCircle" size={20} color={colors.danger} />
            </View>
          </View>
          <View style={s.stat}>
            <Text style={s.statL}>{t('dash_moves_today')}</Text>
            <Text style={[s.statV, { color: colors.info }]}>{stats?.movements_today ?? '—'}</Text>
            <Text style={s.statS}>{'Mouvements'}</Text>
            <View style={[s.statIco, { backgroundColor: colors.infoBg, position: 'absolute', top: 12, right: 12 }]}>
              <Icon name="movements" size={20} color={colors.info} />
            </View>
          </View>
        </View>

        {/* Restock forecast chip */}
        {fcCount > 0 && (
          <TouchableOpacity style={s.fcChip} onPress={() => navigation.navigate('Alerts')} activeOpacity={0.85}>
            <Text style={s.fcChipText}>{t('db_fc_chip', { n: fcCount })}</Text>
          </TouchableOpacity>
        )}

        {/* Ventes chart */}
        <View style={s.cd}>
          <View style={s.cdH}>
            <View style={s.cdTR}>
              <View style={[s.dot, { backgroundColor: colors.accent }]} />
              <Text style={s.cdT}>{t('dash_chart')}</Text>
            </View>
          </View>
          {data?.chart?.labels?.length ? (
            <>
              <View style={s.vR}>
                <Text style={s.vV}>{stats ? formatMoney(stats.stock_value) : '—'}</Text>
                {typeof stats?.movement_trend === 'number' ? (
                  <View style={s.badge}><Text style={s.badgeT}>
                    {stats.movement_trend >= 0 ? '↗' : '↘'} {stats.movement_trend > 0 ? '+' : ''}{stats.movement_trend}%
                  </Text></View>
                ) : null}
              </View>
              <VentesChart data={data.chart} />
            </>
          ) : (
            <EmptyState icon="📈" title={t('dash_no_chart')} />
          )}
        </View>

        {/* Donut */}
        <View style={s.cd}>
          <View style={s.cdH}>
            <View style={s.cdTR}>
              <View style={[s.dot, { backgroundColor: colors.primary }]} />
              <Text style={s.cdT}>Répartition du stock</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DonutChart items={catItems} size={110} stroke={14} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              {catItems.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color, marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: colors.muted }}>{d.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    {totalItems > 0 ? Math.round((d.val / totalItems) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stock levels */}
        <View style={s.cd}>
          <View style={s.cdH}>
            <View style={s.cdTR}>
              <View style={[s.dot, { backgroundColor: colors.info }]} />
              <Text style={s.cdT}>Niveau des stocks</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={s.link}>{t('dash_see_all')}</Text>
            </TouchableOpacity>
          </View>
          {stockItems.map((it, i) => (
            <View key={i} style={[s.skR, i < stockItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}> 
              <View style={s.skL}>
                <View style={[s.skIco, { backgroundColor: it.color + '22' }]}>
                  <Icon name="products" size={13} color={it.color} />
                </View>
                <Text style={s.skN}>{it.name}</Text>
              </View>
              <View style={s.skR2}>
                <View style={s.pT}><View style={[s.pF, { width: `${it.pct}%`, backgroundColor: it.color }]} /></View>
                <Text style={s.skP}>{it.pct}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Low stock alerts */}
        <View style={s.section}>
          <View style={s.sectionH}>
            <Text style={s.sectionT}>{t('dash_alerts_title')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={s.link}>{t('dash_see_all')}</Text>
            </TouchableOpacity>
          </View>
          {data?.low_stock_products?.length ? (
            data.low_stock_products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.row}
                onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
              >
                <Text style={s.rowName} numberOfLines={1}>{p.name}</Text>
                <Text style={[s.rowQty, { color: p.quantity === 0 ? colors.danger : colors.warning }]}>
                  {p.quantity} / seuil {p.alert_threshold}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState icon="🎉" title={t('dash_no_alert')} subtitle={t('dash_no_alert_sub')} />
          )}
        </View>

        {/* Recent activity */}
        <View style={s.section}>
          <Text style={s.sectionT}>{t('dash_recent')}</Text>
          {data?.recent_movements?.length ? (
            data.recent_movements.map((m) => (
              <View key={m.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>{m.product?.name ?? '—'}</Text>
                  <Text style={s.rowMeta}>{m.user?.name} · {formatDateTime(m.created_at)}</Text>
                </View>
                <Text style={[s.moveQty, { color: m.type === 'in' ? colors.success : colors.danger }]}>
                  {m.type === 'in' ? '+' : '-'}{m.quantity}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState icon="🕐" title={t('dash_no_recent')} />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
