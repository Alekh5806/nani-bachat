/**
 * AvatarSelect
 * Select field for choosing a member's avatar while creating them: shows the
 * chosen avatar (or "Random avatar" when none) and opens a dialog with the grid.
 * Controlled: value is an avatar key like 'avatar-3', or '' for "pick for me".
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
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

      <Pressable onPress={() => setOpen(true)} style={styles.field}>
        {value ? (
          <UserAvatar person={{ avatar: value }} size={32} style={styles.preview} />
        ) : (
          <View style={styles.randomIcon}>
            <Shuffle size={18} color={COLORS.accent} />
          </View>
        )}
        <Text style={value ? styles.name : styles.placeholder} numberOfLines={1}>
          {value ? `Avatar ${value.replace('avatar-', '')}` : 'Random avatar'}
        </Text>
        <ArrowDown2 size={18} color={COLORS.textSecondary} />
      </Pressable>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog}>
          <Dialog.Title>Choose an avatar</Dialog.Title>
          <Dialog.Content>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => pick('')}>Random</Button>
            <Button onPress={() => setOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  name: { flex: 1, ...TYPE.inputText, color: COLORS.textPrimary },
  placeholder: { flex: 1, ...TYPE.inputText, color: COLORS.textMuted },
  dialog: { backgroundColor: COLORS.cardBg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md },
  cell: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellActive: { borderColor: COLORS.accent },
}));
