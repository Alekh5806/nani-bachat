/**
 * Card Component
 * Clean flat card — Groww-style, no glassmorphism
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme/colors';

export const GlassCard = ({
  children,
  style,
  gradient = false,
  gradientColors,
  borderGlow = false,
  padding = SPACING.lg,
}) => {
  if (gradient) {
    return (
      <LinearGradient
        colors={gradientColors || [COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientCard, { padding }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        borderGlow && styles.borderHighlight,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.cardLight,
  },
  gradientCard: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  borderHighlight: {
    borderColor: COLORS.accent + '30',
    borderWidth: 1,
  },
});
