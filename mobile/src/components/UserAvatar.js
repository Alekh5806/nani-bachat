/**
 * UserAvatar
 * Round avatar for a member: the chosen picture from assets/avatar, or the
 * first letter on the member's colour when none is chosen.
 */
import React from 'react';
import { View, Text, Image } from 'react-native';
import { AVATARS } from '../utils/avatars';
import { COLORS, TYPE, themedStyles } from '../theme/colors';

export const UserAvatar = ({ person, size = 44, style }) => {
  const source = AVATARS[person?.avatar];

  const box = { width: size, height: size, borderRadius: size / 2 };
  const letter = ((person?.name || '?').trim()[0] || '?').toUpperCase();

  if (source) {
    // Plain picture: no background, border or rounding.
    return <Image source={source} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
  }
  return (
    <View style={[styles.fallback, box, { backgroundColor: person?.avatar_color || COLORS.accent }, style]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.4) }]}>{letter}</Text>
    </View>
  );
};

const styles = themedStyles(() => ({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  letter: { ...TYPE.button, color: COLORS.onAccent },
}));
