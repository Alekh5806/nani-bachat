/**
 * AllocationDonut
 * Ring chart of shares that add up to a whole. `slices` is
 * [{ value, color }]; the centre shows a label and a value.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPE, themedStyles } from '../theme/colors';

const GAP = 2; // space between slices, in px along the ring

export const AllocationDonut = ({ slices, size = 180, thickness = 26, label, value, half = false }) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // A half ring uses only the top half of the circle.
  const span = half ? circumference / 2 : circumference;
  const start = half ? -180 : -90;
  const height = half ? size / 2 + thickness / 2 : size;
  let offset = 0;

  return (
    <View style={{ width: size, height, alignSelf: 'center' }}>
      <Svg width={size} height={height}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={COLORS.surface} strokeWidth={thickness} fill="none"
          {...(half ? { strokeDasharray: `${span} ${circumference}`, rotation: start, origin: `${size / 2}, ${size / 2}` } : {})}
        />
        {total > 0 && slices.map((slice, i) => {
          const length = (slice.value / total) * span;
          const dash = Math.max(length - (slices.length > 1 ? GAP : 0), 0);
          const circle = (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              stroke={slice.color} strokeWidth={thickness} fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              rotation={start} origin={`${size / 2}, ${size / 2}`}
            />
          );
          offset += length;
          return circle;
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {!!label && <Text style={styles.label}>{label}</Text>}
        {!!value && <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>}
      </View>
    </View>
  );
};

const styles = themedStyles(() => ({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  label: { ...TYPE.caption, fontSize: TYPE.caption.fontSize - 2, color: COLORS.textMuted },
  value: { ...TYPE.cardTitle, fontSize: TYPE.cardTitle.fontSize - 2, color: COLORS.textPrimary, marginTop: 2 },
}));
