/**
 * AvatarPicker
 * Dialog with a grid of ready-made avatars. Tapping one saves it to the
 * member's profile.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
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
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Choose your avatar</Dialog.Title>
        <Dialog.Content>
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
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = themedStyles(() => ({
  dialog: { backgroundColor: COLORS.cardBg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'center' },
  cell: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: 'transparent' },
  cellActive: { borderColor: COLORS.accent },
}));
