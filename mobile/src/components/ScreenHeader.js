/**
 * Screen Header Component
 * Premium styled header with gradient text option
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { ProfileButton } from './ProfileButton';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const ScreenHeader = ({
  title,
  subtitle,
  rightAction,
  rightLabel,
  rightIcon,
  onBack,
  showBack = false,
  hideProfile = false,
  inset,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.md }, inset != null && { paddingHorizontal: inset }]}>
      <View style={styles.leftSection}>
        {showBack && (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
            <Icon name="←" size={24} color={COLORS.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={inset == null ? 1 : undefined} adjustsFontSizeToFit={inset == null}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightAction && (
          <Pressable
            onPress={rightAction}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            {rightIcon && (typeof rightIcon === 'string'
              ? <Icon name={rightIcon} size={16} color={COLORS.onAccent} style={styles.actionIcon} />
              : <View style={styles.actionIcon}>{rightIcon}</View>)}
            {rightLabel && <Text style={styles.actionLabel}>{rightLabel}</Text>}
          </Pressable>
        )}
        {!hideProfile && <ProfileButton />}
      </View>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    marginRight: SPACING.xs,
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPE.sectionTitle, // same as the Home header ("Portfolio")
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPE.secondary,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    borderRadius: SPACING.xl,
    flexShrink: 0,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    marginRight: SPACING.xs,
  },
  actionLabel: {
    ...TYPE.secondaryMedium,
    color: COLORS.onAccent,
  },
}));
