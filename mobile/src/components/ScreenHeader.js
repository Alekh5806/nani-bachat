/**
 * Screen Header Component
 * Premium styled header with gradient text option
 */
import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
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
  const { width, fontScale } = useWindowDimensions();
  const [headerWidth, setHeaderWidth] = useState(0);
  const horizontalPadding = inset ?? SPACING.xl;
  // Reserve space for the title, the action label, and the non-scaling controls.
  const titleSpace = Math.max(90, Math.min(String(title).length, 16) * 10) * Math.max(1, fontScale);
  const actionSpace = (String(rightLabel ?? '').length * 8) * Math.max(1, fontScale)
    + SPACING.lg * 2 + (rightIcon ? 24 : 0);
  const controlsSpace = (showBack ? 52 : 0) + (hideProfile ? 0 : 60) + SPACING.md;
  const stackAction = !!rightAction
    && (headerWidth || width) - horizontalPadding * 2 < titleSpace + actionSpace + controlsSpace;

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
      onLayout={({ nativeEvent }) => setHeaderWidth(nativeEvent.layout.width)}
    >
      <View style={styles.headingRow}>
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
        {(!hideProfile || (rightAction && !stackAction)) && (
          <View style={styles.rightSection}>
            {!stackAction && action}
            {!hideProfile && <ProfileButton />}
          </View>
        )}
      </View>
      {stackAction && <View style={styles.stackedAction}>{action}</View>}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stackedAction: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: SPACING.sm },
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
    ...TYPE.button,
    color: COLORS.onAccent,
    flexShrink: 1,
  },
}));
