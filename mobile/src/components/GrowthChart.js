import React, { useMemo, useState } from 'react';
import { PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AppIcon } from './Icon';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { fmtFull } from '../utils/currency';
import { chartGeometry, dateLabel } from '../utils/portfolioHistory';

const INSET = 8;

export function GrowthChart({ data = [], height = 120 }) {
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

  const paths = { recorded: '', carried: '' };
  let line = '';
  points.forEach((point, i) => {
    const previous = points[i - 1];
    const move = 'M' + point.x.toFixed(1) + ',' + point.y.toFixed(1);
    if (!previous) { line = move; return; }
    const carried = point.carried || previous.carried;
    const segment = carried ? 'H' + point.x.toFixed(1) + 'V' + point.y.toFixed(1)
      : 'L' + point.x.toFixed(1) + ',' + point.y.toFixed(1);
    line += segment;
    paths[carried ? 'carried' : 'recorded'] += 'M' + previous.x.toFixed(1) + ',' + previous.y.toFixed(1) + segment;
  });
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
                {!!paths.recorded && <Path d={paths.recorded} fill="none" stroke={COLORS.accent} strokeWidth={2.5} strokeLinejoin="round" />}
                {!!paths.carried && <Path d={paths.carried} fill="none" stroke={COLORS.accent} strokeWidth={2} strokeDasharray="4 4" />}
              </>}
              {dot && <>
                {selected && <Line x1={dot.x} x2={dot.x} y1={INSET} y2={height} stroke={COLORS.textSecondary} strokeDasharray="3 4" />}
                <Circle cx={dot.x} cy={dot.y} r={4.5} fill={COLORS.accent} stroke={COLORS.cardBg} strokeWidth={2} />
              </>}
            </Svg>
          )}
        </View>
      </View>
      {data.length > 1 && <View style={styles.axis}>
        <Text style={styles.date}>{dateLabel(data[0].date)}</Text>
        <Text style={styles.date}>{dateLabel(data[data.length - 1].date)}</Text>
      </View>}
      <View style={styles.readout}>
        {data.length > 1 && moveButton(-1, 'Previous day', 'chevron-back')}
        <View style={styles.readoutText} accessibilityLiveRegion="polite">
          <Text style={styles.date}>{dateLabel(point.date)}</Text>
          <Text style={styles.amount}>{fmtFull(point.value)}</Text>
          {point.carried && <Text style={styles.date}>Last recorded {dateLabel(point.sourceDate)}</Text>}
          {data.length === 1 && <Text style={styles.date}>One recorded day</Text>}
        </View>
        {data.length > 1 && moveButton(1, 'Next day', 'chevron-forward')}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  axis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm, marginTop: SPACING.xs },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  readoutText: { alignItems: 'center', flexShrink: 1, paddingHorizontal: SPACING.md },
  date: { ...TYPE.caption, color: COLORS.textSecondary },
  amount: { ...TYPE.smallValue, color: COLORS.textPrimary, marginTop: SPACING.xs, fontVariant: ['tabular-nums'] },
  step: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: COLORS.surface },
  empty: { ...TYPE.secondary, textAlign: 'center', color: COLORS.textSecondary, paddingVertical: SPACING.xxl },
}));
