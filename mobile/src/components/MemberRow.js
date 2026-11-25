import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight2 } from 'iconsax-react-native';
import { UserAvatar } from './UserAvatar';
import { COLORS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const MemberRow = ({ member, isSelf, divided, onPress }) => {
  const status = [member.role === 'admin' && 'Admin', isSelf && 'You'].filter(Boolean).join(' · ');

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
          {!!(member.phone || status) && (
            <View style={styles.metadata}>
              {!!member.phone && <Text style={styles.phone}>{member.phone}</Text>}
              {!!status && <Text style={styles.badge}>{status}</Text>}
            </View>
          )}
        </View>
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
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: SPACING.sm,
    rowGap: SPACING.xs,
    marginTop: 2,
  },
  phone: { ...TYPE.caption, color: COLORS.textMuted, maxWidth: '100%' },
  badge: {
    ...TYPE.captionMedium,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    maxWidth: '100%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
}));
