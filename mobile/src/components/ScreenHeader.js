/**
 * Screen Header Component
 * Premium styled header with gradient text option
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { ProfileButton } from './ProfileButton';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

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
  const horizontalPadding = inset ?? SPACING.xl;

  const action = rightAction && (
    <Pressable
      onPress={rightAction}
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
    >
      {rightIcon && (typeof rightIcon === 'string'
        ? <Icon name={rightIcon} size={16} color={COLORS.onAccent} style={styles.actionIcon} />
        : <View style={styles.actionIcon}>{rightIcon}</View>)}
      {rightLabel && <Text style={styles.actionLabel}>{rightLabel}</Text>}
    </Pressable>
  );

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + SPACING.md, paddingHorizontal: horizontalPadding }]}
    >
      <View style={styles.headingRow}>
        <View style={styles.titleAndAction}>
          <View style={styles.leftSection}>
            {showBack && (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
                <Icon name="←" size={24} color={COLORS.textPrimary} />
              </Pressable>
            )}
            <View style={styles.titleBlock}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {action}
        </View>
        {!hideProfile && (
          <View style={rightAction && styles.profileWithAction}>
            <ProfileButton />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.md,
  },
  titleAndAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: SPACING.md,
    rowGap: SPACING.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    maxWidth: '100%',
  },
  titleBlock: {
    flexShrink: 1,
    minWidth: 0,
  },
  profileWithAction: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
  backButton: {
    marginRight: SPACING.xs,
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPE.screenTitle,
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
    backgroundColor: COLORS.buttonPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    borderRadius: SPACING.xl,
    maxWidth: '100%',
  },
  actionPressed: {
    opacity: 0.9,
  },
  actionIcon: {
    marginRight: SPACING.xs,
  },
  actionLabel: {
    ...TYPE.button,
    color: COLORS.onAccent,
    flexShrink: 1,
  },
}));
