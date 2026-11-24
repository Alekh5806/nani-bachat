/**
 * GrowthChart
 * One line over time, drawn with react-native-svg. Press and drag to read a
 * point. Drawn in the theme's primary colour.
 */
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, PanResponder, Platform } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

const PAD_X = 8;
const PAD_Y = 16;

// Smooth curve through the points (Catmull-Rom converted to cubic Beziers).
const smoothPath = (pts) => {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
};

const fmtMoney = (v) =>
  '₹' + (Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const GrowthChart = ({ data, height = 160, onScrub }) => {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);
  const geometry = useRef({ points: [] });

  const points = useMemo(() => {
    if (!width || data.length < 2) return [];
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return data.map((d, i) => ({
      x: PAD_X + (i / (data.length - 1)) * (width - PAD_X * 2),
      y: PAD_Y + (1 - (d.value - min) / span) * (height - PAD_Y * 2),
      ...d,
    }));
  }, [data, width, height]);
  geometry.current.points = points;

  const pick = (x) => {
    const pts = geometry.current.points;
    if (!pts.length) return;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((x - PAD_X) / (width - PAD_X * 2)) * (pts.length - 1))));
    setActive(i);
    onScrub && onScrub(pts[i]);
  };
  const release = () => {
    setActive(null);
    onScrub && onScrub(null);
  };

  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    }),
    [width, data]
  );

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Growth appears after two daily snapshots</Text>
      </View>
    );
  }

  const color = COLORS.accent; // theme primary, whatever the direction
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const area = points.length ? `${line} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z` : '';
  const dot = active !== null ? points[active] : last;

  return (
    <View
      // On the web the browser scrolls the page on touch unless told not to.
      style={[{ height }, Platform.OS === 'web' && { touchAction: 'none', userSelect: 'none' }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#growthFill)" />
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && (
            <Line x1={dot.x} x2={dot.x} y1={0} y2={height} stroke={COLORS.textMuted} strokeWidth={1} strokeDasharray="3,3" />
          )}
          {dot && (
            <Circle cx={dot.x} cy={dot.y} r={5} fill={color} stroke={COLORS.cardBg} strokeWidth={2.5} />
          )}
        </Svg>
      )}
    </View>
  );
};

export const formatChartPoint = (p) => ({ value: fmtMoney(p.value), date: fmtDate(p.date) });

const styles = themedStyles(() => ({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...TYPE.cardTitle,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg,
    textAlign: 'center',
  },
}));
