import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatMoney } from '../utils/format';

/**
 * 📊 Courbe de trésorerie (solde de caisse par jour).
 * Rendu 100 % Views (segments inclinés + points) — AUCUNE dépendance externe,
 * fonctionne dans Expo Go.
 */
export default function CashBalanceChart({ data, height = 150 }) {
  const [width, setWidth] = useState(0);

  if (!Array.isArray(data) || data.length < 2) return null;

  const values = data.map((d) => Number(d.balance) || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min; // solde constant → ligne au milieu
  const range = max - min || 1;

  const padH = 8;
  const padTop = 16;
  const padBottom = 20;
  const innerW = Math.max(0, width - padH * 2);
  const innerH = Math.max(1, height - padTop - padBottom);

  const xAt = (i) => padH + (innerW * i) / (values.length - 1);
  const yAt = (v) => (flat
    ? padTop + innerH / 2
    : padTop + innerH * (1 - (v - min) / range));

  const pts = width > 0 ? values.map((v, i) => ({ x: xAt(i), y: yAt(v) })) : [];

  // Segments inclinés entre points consécutifs
  const segments = [];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    segments.push({
      key: `s${i}`,
      left: (pts[i].x + pts[i - 1].x) / 2 - len / 2,
      top: (pts[i].y + pts[i - 1].y) / 2 - 1,
      len,
      angle,
    });
  }

  const first = data[0];
  const last = data[data.length - 1];
  const zeroY = !flat && min < 0 && max > 0 ? yAt(0) : null;

  const styles = useThemedStyles(c => ({
    seg: {
      position: 'absolute',
      height: 2,
      borderRadius: 1,
      backgroundColor: c.primary,
    },
    dot: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.primary,
    },
    dotLast: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      marginLeft: -2,
      marginTop: -2,
      backgroundColor: c.primary,
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    zero: {
      position: 'absolute',
      height: 1,
      backgroundColor: c.border,
    },
    boundLabel: {
      position: 'absolute',
      fontSize: 9.5,
      color: c.muted,
      fontWeight: '600',
    },
    dateLabel: {
      position: 'absolute',
      fontSize: 9.5,
      color: c.muted,
    },
    lastBadge: {
      position: 'absolute',
      backgroundColor: c.primaryBg,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    lastBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: c.primary,
    },
  }));

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          {/* Ligne du zéro si la courbe traverse négatif/positif */}
          {zeroY !== null ? (
            <View style={[styles.zero, { top: zeroY, left: padH, width: innerW }]} />
          ) : null}

          {segments.map((s) => (
            <View
              key={s.key}
              style={[
                styles.seg,
                { left: s.left, top: s.top, width: s.len, transform: [{ rotate: `${s.angle}deg` }] },
              ]}
            />
          ))}

          {pts.map((p, i) => (
            <View
              key={`d${i}`}
              style={[styles.dot, { left: p.x - 2.5, top: p.y - 2.5 }, i === pts.length - 1 && styles.dotLast]}
            />
          ))}

          {/* Bornes + dates */}
          <Text style={[styles.boundLabel, { top: 0, right: padH }]}>{formatMoney(max)}</Text>
          <Text style={[styles.boundLabel, { top: height - 14, right: padH }]}>{formatMoney(min)}</Text>
          <Text style={[styles.dateLabel, { top: height - 14, left: padH }]}>{first.label}</Text>
          <View style={[styles.lastBadge, { top: Math.max(2, pts[pts.length - 1].y - 30), right: padH }]}>
            <Text style={styles.lastBadgeText}>{last.label} · {formatMoney(values[values.length - 1])}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

