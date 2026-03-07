/**
 * Loading Skeleton Component
 * Animated placeholder for loading states
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

export const LoadingSkeleton = ({ width = '100%', height = 20, style, borderRadius }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, opacity, borderRadius: borderRadius || RADIUS.sm },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton = () => (
  <View style={styles.container}>
    <LoadingSkeleton height={120} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.lg }} />
    <View style={styles.row}>
      <LoadingSkeleton width="48%" height={90} borderRadius={RADIUS.lg} />
      <LoadingSkeleton width="48%" height={90} borderRadius={RADIUS.lg} />
    </View>
    <LoadingSkeleton height={200} borderRadius={RADIUS.lg} style={{ marginTop: SPACING.lg }} />
    {[1, 2, 3].map((i) => (
      <LoadingSkeleton
        key={i}
        height={70}
        borderRadius={RADIUS.lg}
        style={{ marginTop: SPACING.md }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.surface,
  },
  container: {
    padding: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
