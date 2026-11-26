/**
 * Stat Card Component
 * A label, a figure and an optional change. Always flat; `gradient` props are
 * accepted for old callers and ignored
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { COLORS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const StatCard = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  compact = false,
  style,
}) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  const content = (
    <>
      <View style={styles.header}>
                <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
      {(change !== undefined && change !== null) && (
        <View style={styles.changeContainer}>
          <View
            style={[
              styles.changeBadge,
              isPositive
                ? styles.changeBadgePositive
                : isNegative
                  ? styles.changeBadgeNegative
                  : styles.changeBadgeNeutral,
            ]}
          >
            <Text
              style={[
                styles.changeText,
                isPositive
                  ? styles.changeTextPositive
                  : isNegative
                    ? styles.changeTextNegative
                    : null,
              ]}
            >
              {isPositive ? '+' : isNegative ? '-' : ''}
              {typeof change === 'number' ? `${Math.abs(change).toFixed(2)}%` : change}
            </Text>
          </View>
          {changeLabel && (
            <Text style={styles.changeLabel}>
              {changeLabel}
            </Text>
          )}
        </View>
      )}
    </>
  );

  return <View style={[styles.card, styles.glassCard, style]}>{content}</View>;
};

const styles = themedStyles(() => ({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
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
    minHeight: 38,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  label: {
    ...TYPE.secondary,
    flex: 1,
    minWidth: 0,
    color: COLORS.textSecondary,
  },
  value: {
    ...TYPE.stockPrice,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  valueCompact: {
    ...TYPE.stockPrice,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  changeBadgePositive: {
    backgroundColor: COLORS.profitBg,
  },
  changeBadgeNegative: {
    backgroundColor: COLORS.lossBg,
  },
  changeBadgeNeutral: {
    backgroundColor: COLORS.neutralBg,
  },
  changeText: {
    ...TYPE.plPercent,
    color: COLORS.textSecondary,
  },
  changeTextPositive: {
    color: COLORS.profit,
  },
  changeTextNegative: {
    color: COLORS.loss,
  },
  changeLabel: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
}));
