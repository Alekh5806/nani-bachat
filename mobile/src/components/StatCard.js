/**
 * Stat Card Component
 * Displays a key metric with label, value, and optional change indicator
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONTS, SHADOWS } from '../theme/colors';

export const StatCard = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  gradient = false,
  gradientColors,
  compact = false,
  style,
}) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  const content = (
    <>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.label, gradient && styles.labelLight]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          gradient && styles.valueLight,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {(change !== undefined && change !== null) && (
        <View style={styles.changeContainer}>
          <View
            style={[
              styles.changeBadge,
              gradient
                ? styles.changeBadgeOnGradient
                : isPositive
                  ? styles.changeBadgePositive
                  : isNegative
                    ? styles.changeBadgeNegative
                    : styles.changeBadgeNeutral,
            ]}
          >
            <Text
              style={[
                styles.changeText,
                gradient
                  ? styles.changeTextOnGradient
                  : isPositive
                    ? styles.changeTextPositive
                    : isNegative
                      ? styles.changeTextNegative
                      : null,
              ]}
            >
              {isPositive ? '▲' : isNegative ? '▼' : '●'}{' '}
              {typeof change === 'number' ? `${Math.abs(change).toFixed(2)}%` : change}
            </Text>
          </View>
          {changeLabel && (
            <Text style={[styles.changeLabel, gradient && { color: 'rgba(255,255,255,0.7)' }]}>
              {changeLabel}
            </Text>
          )}
        </View>
      )}
    </>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={gradientColors || [COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, styles.glassCard, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  glassCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelLight: {
    color: 'rgba(255,255,255,0.75)',
  },
  value: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  valueCompact: {
    fontSize: FONTS.xl,
  },
  valueLight: {
    color: '#FFFFFF',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  changeBadgePositive: {
    backgroundColor: COLORS.profitBg,
  },
  changeBadgeNegative: {
    backgroundColor: COLORS.lossBg,
  },
  changeBadgeNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  changeBadgeOnGradient: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  changeTextPositive: {
    color: COLORS.profit,
  },
  changeTextNegative: {
    color: COLORS.loss,
  },
  changeTextOnGradient: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  changeLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});
