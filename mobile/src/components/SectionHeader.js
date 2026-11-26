/**
 * Section Header Component
 * Used to label sections within screens
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const SectionHeader = ({ title, actionLabel, onAction }) => (
  <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {actionLabel && (
      <Pressable onPress={onAction} accessibilityRole="button" style={styles.actionButton}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  title: {
    ...TYPE.sectionTitle,
    maxWidth: '100%',
    color: COLORS.textPrimary,
  },
  actionButton: { minHeight: 44, maxWidth: '100%', justifyContent: 'center' },
  action: {
    ...TYPE.button,
    color: COLORS.accent,
  },
}));
