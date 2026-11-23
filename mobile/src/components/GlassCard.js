/**
 * Card Component
 * Flat card with a hairline border. `gradient` is accepted for old callers and ignored
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, themedStyles } from '../theme/colors';

export const GlassCard = ({
  children,
  style,
  gradient = false,
  gradientColors,
  borderGlow = false,
  padding = SPACING.lg,
}) => {
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

const styles = themedStyles(() => ({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  borderHighlight: {
    borderColor: COLORS.accent + '30',
    borderWidth: 1,
  },
}));
