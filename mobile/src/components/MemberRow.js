import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight2 } from 'iconsax-react-native';
import { UserAvatar } from './UserAvatar';
import { COLORS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const MemberRow = ({ member, isSelf, divided, onPress }) => {
  const isAdmin = member.role === 'admin';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens member profile"
      style={({ pressed, hovered }) => [styles.container, (pressed || hovered) && styles.highlighted]}
    >
      <UserAvatar person={member} size={40} style={styles.avatar} />
      <View style={[styles.body, divided && styles.divided]}>
        <View style={styles.info}>
          <Text style={styles.name}>{member.name}</Text>
          {!!member.phone && <Text style={styles.phone}>{member.phone}</Text>}
        </View>
        {(isAdmin || isSelf) && (
          <View style={styles.badges}>
            {isAdmin && <Text style={[styles.badge, styles.admin]}>Admin</Text>}
            {isSelf && <Text style={styles.badge}>You</Text>}
          </View>
        )}
        <ArrowRight2 size={14} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md },
  highlighted: { backgroundColor: COLORS.accent + '0D' },
  avatar: { marginRight: SPACING.md },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: SPACING.sm, paddingVertical: SPACING.sm },
  divided: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  info: { flex: 1, minWidth: 0 },
  name: { ...TYPE.cardTitle, color: COLORS.textPrimary },
  phone: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  badges: { alignItems: 'flex-end', gap: SPACING.xs },
  badge: {
    ...TYPE.captionMedium,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.textMuted + '1F',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  admin: { color: COLORS.accent, backgroundColor: COLORS.accent + '14' },
}));
