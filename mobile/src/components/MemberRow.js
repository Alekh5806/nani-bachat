/**
 * Member Row Component
 * List row for a member: avatar, name, phone and role. Money details live
 * on the member's own screen.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { UserAvatar } from './UserAvatar';
import { COLORS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const MemberRow = ({ member, onPress }) => {
  const isAdmin = member.role === 'admin';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <UserAvatar person={member} size={40} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{member.phone}</Text>
      </View>

      <Text style={[styles.role, isAdmin && styles.roleAdmin]}>{isAdmin ? 'Admin' : 'Partner'}</Text>
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
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  avatar: { marginRight: SPACING.md },
  info: { flex: 1, minWidth: 0, marginRight: SPACING.sm },
  name: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary, flexShrink: 1 },
  role: {
    ...TYPE.captionMedium,
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: COLORS.textMuted + '1F',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  roleAdmin: { color: COLORS.accent, backgroundColor: COLORS.accent + '14' },
  sub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
}));
