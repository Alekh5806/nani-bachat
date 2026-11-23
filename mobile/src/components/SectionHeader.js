/**
 * Section Header Component
 * Used to label sections within screens
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Icon } from './Icon';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const SectionHeader = ({ title, actionLabel, onAction, icon }) => (
  <View style={styles.container}>
    <View style={styles.left}>
            <Text style={styles.title}>{title}</Text>
    </View>
    {actionLabel && (
      <Pressable onPress={onAction}>
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
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
  },
  action: {
    ...TYPE.secondaryMedium,
    color: COLORS.accent,
  },
}));
