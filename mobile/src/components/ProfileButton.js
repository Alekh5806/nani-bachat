/**
 * ProfileButton
 * Round avatar (user's first letter) for the top-right of every header.
 * Opens the Profile screen, which is no longer a bottom tab.
 */
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { UserAvatar } from './UserAvatar';
import { COLORS, themedStyles } from '../theme/colors';

export const ProfileButton = ({ size = 36 }) => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={() => navigation.navigate('Profile')}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <UserAvatar person={user} size={size - 2} />
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  circle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
}));
