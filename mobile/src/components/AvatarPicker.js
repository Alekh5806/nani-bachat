/**
 * AvatarPicker
 * Dialog with a grid of ready-made avatars. Tapping one saves it to the
 * member's profile.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { DialogCard } from './DialogCard';
import Toast from 'react-native-toast-message';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';
import { UserAvatar } from './UserAvatar';
import { AVATAR_KEYS } from '../utils/avatars';
import { COLORS, SPACING, themedStyles } from '../theme/colors';

export const AvatarPicker = ({ visible, onDismiss }) => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [saving, setSaving] = useState(false);

  const choose = async (seed) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile/', { avatar: seed });
      await updateUser({ ...user, ...res.data });
      onDismiss();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not save', text2: 'Try again' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogCard visible={visible} title="Choose your avatar" onDismiss={onDismiss}>
      <View style={styles.grid}>
        {AVATAR_KEYS.map((seed) => (
          <Pressable
            key={seed}
            onPress={() => choose(seed)}
            style={[styles.cell, user?.avatar === seed && styles.cellActive]}
          >
            <UserAvatar person={{ avatar: seed }} size={48} />
          </Pressable>
        ))}
      </View>
    </DialogCard>
  );
};

const styles = themedStyles(() => ({
  grid: { marginTop: SPACING.lg, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'center' },
  cell: { padding: 4, borderRadius: 40, borderWidth: 2, borderColor: 'transparent' },
  cellActive: { borderColor: COLORS.accent },
}));
