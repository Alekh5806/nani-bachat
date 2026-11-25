import React, { useMemo, useState } from 'react';
import { PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AppIcon } from './Icon';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { fmtFull } from '../utils/currency';
import { dateLabel } from '../utils/portfolioHistory';

const INSET = 8;

export function GrowthChart({ data, height = 120 }) {
  const [width, setWidth] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const selected = selectedDate && data.find((point) => point.date === selectedDate);
  const point = selected || data[data.length - 1];
  const index = data.indexOf(point);

  const points = useMemo(() => {
    if (!data.length || width <= 2 * INSET) return [];
    const values = data.map((entry) => entry.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const start = Date.parse(data[0].date);
    const span = Date.parse(data[data.length - 1].date) - start;
    return data.map(({ date, value }) => ({
      date,
      x: span ? INSET + (Date.parse(date) - start) / span * (width - 2 * INSET) : width / 2,
      y: max === min ? height / 2 : INSET + (max - value) / (max - min) * (height - 2 * INSET),
    }));
  }, [data, width, height]);

  const responder = useMemo(() => {
    const pick = (event) => {
      if (!points.length) return;
      const x = event.nativeEvent.locationX;
      const nearest = points.reduce((a, b) => Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b);
      setSelectedDate(nearest.date);
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: pick,
      onPanResponderMove: pick,
    });
  }, [points]);

  if (!point) return <Text style={styles.empty}>No snapshots in this period.</Text>;

  const line = points.map(({ x, y }, i) => (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)).join(' ');
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
      <View style={[{ height }, Platform.OS === 'web' && { touchAction: 'pan-y', userSelect: 'none' }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}>
        <View pointerEvents="none">
          {points.length > 0 && (
            <Svg width={width} height={height} accessible={false}>
              {[INSET, height / 2, height - INSET].map((y) => (
                <Line key={y} x1={INSET} x2={width - INSET} y1={y} y2={y} stroke={COLORS.border} strokeDasharray="3 5" />
              ))}
              {points.length > 1 && <>
                <Path d={line + ' L' + points[points.length - 1].x + ',' + height + ' L' + points[0].x + ',' + height + ' Z'}
                  fill={COLORS.accent} fillOpacity={0.07} />
                <Path d={line} fill="none" stroke={COLORS.accent} strokeWidth={2.5} strokeLinejoin="round" />
              </>}
              {dot && <>
                {selected && <Line x1={dot.x} x2={dot.x} y1={INSET} y2={height} stroke={COLORS.textSecondary} strokeDasharray="3 4" />}
                <Circle cx={dot.x} cy={dot.y} r={4.5} fill={COLORS.accent} stroke={COLORS.cardBg} strokeWidth={2} />
              </>}
            </Svg>
          )}
        </View>
      </View>
      <View style={styles.readout}>
        {data.length > 1 && moveButton(-1, 'Previous snapshot', 'chevron-back')}
        <View style={styles.readoutText} accessibilityLiveRegion="polite">
          <Text style={styles.date}>{dateLabel(point.date)}</Text>
          <Text style={styles.amount}>{fmtFull(point.value)}</Text>
        </View>
        {data.length > 1 && moveButton(1, 'Next snapshot', 'chevron-forward')}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  readoutText: { alignItems: 'center', flexShrink: 1, paddingHorizontal: SPACING.md },
  date: { ...TYPE.caption, color: COLORS.textSecondary },
  amount: { ...TYPE.smallValue, color: COLORS.textPrimary, marginTop: SPACING.xs, fontVariant: ['tabular-nums'] },
  step: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: COLORS.surface },
  empty: { ...TYPE.secondary, textAlign: 'center', color: COLORS.textSecondary, paddingVertical: SPACING.xxl },
}));
