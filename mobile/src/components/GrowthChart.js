import React, { useId, useMemo, useState } from 'react';
import { PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { AppIcon } from './Icon';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { fmtFull } from '../utils/currency';
import { chartGeometry, dateLabel } from '../utils/portfolioHistory';

const INSET = 8;

export function GrowthChart({ data = [], height = 96 }) {
  const fillId = 'growth-fill-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [width, setWidth] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const selected = selectedDate && data.find((point) => point.date === selectedDate);
  const point = selected || data[data.length - 1];
  const index = data.indexOf(point);

  const points = useMemo(() => chartGeometry(data, width, height, INSET), [data, width, height]);

  const responder = useMemo(() => {
    const pick = (event) => {
      if (!points.length) return;
      const x = event.nativeEvent.locationX;
      if (!Number.isFinite(x)) return;
      const nearest = points.reduce((a, b) => Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b);
      setSelectedDate(nearest.date);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: pick,
      onPanResponderMove: pick,
      onPanResponderTerminationRequest: () => true,
    });
  }, [points]);

  if (!point) return <Text style={styles.empty}>No snapshots in this period.</Text>;

  // Smooth curve through the points (Catmull-Rom converted to cubic Beziers).
  const line = points.map((point, i) => {
    if (i === 0) return 'M' + point.x.toFixed(1) + ',' + point.y.toFixed(1);
    const p0 = points[i - 2] || points[i - 1];
    const p1 = points[i - 1];
    const p3 = points[i + 1] || point;
    const c1 = (p1.x + (point.x - p0.x) / 6).toFixed(1) + ',' + (p1.y + (point.y - p0.y) / 6).toFixed(1);
    const c2 = (point.x - (p3.x - p1.x) / 6).toFixed(1) + ',' + (point.y - (p3.y - p1.y) / 6).toFixed(1);
    return 'C' + c1 + ' ' + c2 + ' ' + point.x.toFixed(1) + ',' + point.y.toFixed(1);
  }).join(' ');
  const dot = points[index];
  const moveButton = (step, label, icon) => {
    const target = data[index + step];
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !target }}
        disabled={!target} onPress={() => setSelectedDate(target.date)}
        style={({ pressed }) => [styles.step, !target && styles.disabled, pressed && styles.pressed]}>
        <AppIcon name={icon} size={16} color={COLORS.textSecondary} />
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.readout}>
        {data.length > 1 && moveButton(-1, 'Previous day', 'chevron-back')}
        <View style={styles.readoutText} accessibilityLiveRegion="polite">
          <Text style={styles.date}>{dateLabel(point.date)}</Text>
          <Text style={styles.amount}>{fmtFull(point.value)}</Text>
        </View>
        {data.length > 1 && moveButton(1, 'Next day', 'chevron-forward')}
      </View>
      <View style={[{ height }, Platform.OS === 'web' && { touchAction: 'pan-y', userSelect: 'none' }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}>
        <View pointerEvents="none">
          {points.length > 0 && (
            <Svg width={width} height={height} accessible={false}>
              <Defs>
                <LinearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0" stopColor={COLORS.accent} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={COLORS.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {points.length > 1 && <>
                <Path d={line + ' L' + points[points.length - 1].x + ',' + height + ' L' + points[0].x + ',' + height + ' Z'}
                  fill={'url(#' + fillId + ')'} />
                <Path d={line} fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </>}
              {dot && <>
                {selected && <Line x1={dot.x} x2={dot.x} y1={INSET} y2={height} stroke={COLORS.textSecondary} strokeOpacity={0.3} />}
                <Circle cx={dot.x} cy={dot.y} r={5} fill={COLORS.accent} stroke={COLORS.cardBg} strokeWidth={2.5} />
              </>}
            </Svg>
          )}
        </View>
      </View>
      {data.length > 1 && <View style={styles.axis}>
        <Text style={styles.date}>{dateLabel(data[0].date)}</Text>
        <Text style={styles.date}>{dateLabel(data[data.length - 1].date)}</Text>
      </View>}
    </View>
  );
}

const styles = themedStyles(() => ({
  axis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm, marginTop: SPACING.xs },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readoutText: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexWrap: 'wrap', justifyContent: 'center', columnGap: SPACING.sm, paddingHorizontal: SPACING.sm },
  date: { ...TYPE.caption, color: COLORS.textSecondary },
  amount: { ...TYPE.smallValue, color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
  step: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: COLORS.surface },
  empty: { ...TYPE.secondary, textAlign: 'center', color: COLORS.textSecondary, paddingVertical: SPACING.xxl },
}));
