/**
 * Member Row Component
 * Displays a member with their contribution and portfolio value
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS, SHADOWS } from '../theme/colors';

export const MemberRow = ({ member, onPress }) => {
  const isProfit = (member.profit_loss || 0) >= 0;
  const pnlColor = isProfit ? COLORS.profit : COLORS.loss;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          { backgroundColor: member.avatar_color || COLORS.accent },
        ]}
      >
        <Text style={styles.avatarText}>
          {(member.name || '').charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Member Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.phone}>{member.phone}</Text>
        {member.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>ADMIN</Text>
          </View>
        )}
      </View>

      {/* Values */}
      <View style={styles.valuesContainer}>
        <Text style={styles.contribution}>
          ₹{(member.total_contribution || 0).toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.value, { color: pnlColor }]}>
          {isProfit ? '+' : ''}₹{(member.profit_loss || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
          })}
        </Text>
        <Text style={styles.ownership}>
          {member.ownership_percentage || 0}% share
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.cardLight,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phone: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: COLORS.gradientPurple + '30',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  adminText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.gradientPurple,
    letterSpacing: 1,
  },
  valuesContainer: {
    alignItems: 'flex-end',
  },
  contribution: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  ownership: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
