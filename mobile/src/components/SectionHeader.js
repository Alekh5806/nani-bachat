/**
 * Section Header Component
 * Used to label sections within screens
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme/colors';

export const SectionHeader = ({ title, actionLabel, onAction, icon }) => (
  <View style={styles.container}>
    <View style={styles.left}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
    </View>
    {actionLabel && (
      <Pressable onPress={onAction}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
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
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  action: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
