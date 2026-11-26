/**
 * AvatarSelect
 * Select field for choosing a member's avatar while creating them: shows the
 * chosen avatar (or "Random avatar" when none) and opens a dialog with the grid.
 * Controlled: value is an avatar key like 'avatar-3', or '' for "pick for me".
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { DialogCard } from './DialogCard';
import { ArrowDown2, Shuffle } from 'iconsax-react-native';
import { UserAvatar } from './UserAvatar';
import { AVATAR_KEYS } from '../utils/avatars';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const AvatarSelect = ({ value, onChange, label = 'Avatar' }) => {
  const [open, setOpen] = useState(false);

  const pick = (key) => { onChange(key); setOpen(false); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)} style={styles.field}>
        {value ? (
          <UserAvatar person={{ avatar: value }} size={32} style={styles.preview} />
        ) : (
          <View style={styles.randomIcon}>
            <Shuffle size={18} color={COLORS.accent} />
          </View>
        )}
        <Text style={value ? styles.name : styles.placeholder}>
          {value ? `Avatar ${value.replace('avatar-', '')}` : 'Random avatar'}
        </Text>
        <ArrowDown2 size={18} color={COLORS.textSecondary} />
      </Pressable>

      <DialogCard
        visible={open}
        title="Choose an avatar"
        onDismiss={() => setOpen(false)}
        buttons={[{ text: 'Random', variant: 'secondary', onPress: () => pick('') }]}
      >
        <View style={styles.grid}>
          {AVATAR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => pick(key)}
              style={[styles.cell, value === key && styles.cellActive]}
            >
              <UserAvatar person={{ avatar: key }} size={48} />
            </Pressable>
          ))}
        </View>
      </DialogCard>
    </View>
  );
};

const styles = themedStyles(() => ({
  wrap: { marginBottom: SPACING.lg },
  label: { ...TYPE.inputLabel, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  preview: { marginRight: SPACING.md },
  randomIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent + '14',
    marginRight: SPACING.md,
  },
  name: { flex: 1, minWidth: 0, ...TYPE.inputText, color: COLORS.textPrimary },
  placeholder: { flex: 1, minWidth: 0, ...TYPE.inputText, color: COLORS.textMuted },
  grid: { marginTop: SPACING.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md },
  cell: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellActive: { borderColor: COLORS.accent },
}));
