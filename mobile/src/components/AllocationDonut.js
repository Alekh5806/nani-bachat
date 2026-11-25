/**
 * AllocationDonut
 * Ring chart of shares that add up to a whole. `slices` is
 * [{ value, color }]; the centre shows a label and a value.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPE, themedStyles } from '../theme/colors';

export const AllocationDonut = ({ slices, size = 180, thickness = 26, label, value, half = false }) => {
  const [renderedWidth, setRenderedWidth] = useState(size);
  const [caption, setCaption] = useState({ width: 0, height: 0 });
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // A half ring uses only the top half of the circle.
  const span = half ? circumference / 2 : circumference;
  const start = half ? -180 : -90;
  const height = half ? size / 2 + thickness / 2 : size;
  const hole = (size - 2 * thickness) * renderedWidth / size;
  const captionFits = Math.hypot(caption.width, caption.height) + 8 <= hole;
  let offset = 0;

  return (
    <View style={[styles.chart, { width: size }]}
      onLayout={(event) => setRenderedWidth(event.nativeEvent.layout.width)}>
      <View style={{ width: '100%', aspectRatio: size / height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${height}`}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={COLORS.surface} strokeWidth={thickness} fill="none"
            {...(half ? { strokeDasharray: `${span} ${circumference}`, rotation: start, origin: `${size / 2}, ${size / 2}` } : {})}
          />
          {total > 0 && slices.map((slice, i) => {
            const length = (slice.value / total) * span;
            const circle = (
              <Circle
                key={i}
                cx={size / 2} cy={size / 2} r={radius}
                stroke={slice.color} strokeWidth={thickness} fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                rotation={start} origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += length;
            return circle;
          })}
        </Svg>
      </View>
      {(label || value) && <View style={[styles.caption, captionFits && styles.center]} pointerEvents="none">
        <View style={styles.captionText} onLayout={({ nativeEvent: { layout } }) => {
          setCaption((last) => last.width === layout.width && last.height === layout.height
            ? last : { width: layout.width, height: layout.height });
        }}>
          {!!label && <Text style={styles.label}>{label}</Text>}
          {!!value && <Text style={styles.value}>{value}</Text>}
        </View>
      </View>}
    </View>
  );
};

const styles = themedStyles(() => ({
  chart: { alignSelf: 'center', maxWidth: '100%' },
  caption: { alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject },
  captionText: { alignItems: 'center', maxWidth: '100%' },
  label: { ...TYPE.caption, color: COLORS.textSecondary, textAlign: 'center' },
  value: { ...TYPE.cardTitle, color: COLORS.textPrimary, textAlign: 'center', marginTop: 2 },
}));
