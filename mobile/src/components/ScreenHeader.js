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
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.md }]}>
      <View style={styles.leftSection}>
        {showBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Icon name="←" size={24} color={COLORS.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightAction && (
          <Pressable
            onPress={rightAction}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionPressed,
            ]}
          >
            {rightIcon && <Icon name={rightIcon} size={16} color={COLORS.accent} style={styles.actionIcon} />}
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
    alignItems: 'flex-end',
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
    marginRight: SPACING.md,
    padding: SPACING.xs,
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
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
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
    color: COLORS.accent,
  },
}));
