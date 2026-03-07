/**
 * Screen Header Component
 * Premium styled header with gradient text option
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONTS } from '../theme/colors';

export const ScreenHeader = ({
  title,
  subtitle,
  rightAction,
  rightLabel,
  rightIcon,
  onBack,
  showBack = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.md }]}>
      <View style={styles.leftSection}>
        {showBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {rightAction && (
        <Pressable
          onPress={rightAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionPressed,
          ]}
        >
          {rightIcon && <Text style={styles.actionIcon}>{rightIcon}</Text>}
          {rightLabel && <Text style={styles.actionLabel}>{rightLabel}</Text>}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  actionLabel: {
    color: COLORS.accent,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
});
