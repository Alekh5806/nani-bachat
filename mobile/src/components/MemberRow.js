/**
 * Member Row Component
 * Displays a member with their contribution and portfolio value
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { UserAvatar } from './UserAvatar';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

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
      <UserAvatar person={member} size={44} style={styles.avatarGap} />

      {/* Member Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {member.name}
        </Text>
        <Text style={styles.phone}>{member.phone}</Text>
        {member.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>ADMIN</Text>
          </View>
        )}
      </View>

      {/* Values */}
      <View style={styles.valuesContainer}>
        <Text style={styles.contribution} numberOfLines={1} adjustsFontSizeToFit>
          ₹{(member.total_contribution || 0).toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.value, { color: pnlColor }]} numberOfLines={1} adjustsFontSizeToFit>
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

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  avatarGap: { marginRight: SPACING.md },
  infoContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  name: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  phone: {
    ...TYPE.caption,
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
    ...TYPE.caption,
    fontWeight: '500',
    color: COLORS.gradientPurple,
  },
  valuesContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 116,
  },
  contribution: {
    ...TYPE.smallValue,
    color: COLORS.textSecondary,
  },
  value: {
    ...TYPE.smallValue,
    marginTop: 2,
  },
  ownership: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
}));
