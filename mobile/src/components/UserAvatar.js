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
    return (
      <View style={[styles.imageWrap, box, style]}>
        <Image source={source} style={{ width: size * 0.9, height: size * 0.9 }} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={[styles.fallback, box, { backgroundColor: person?.avatar_color || COLORS.accent }, style]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.4) }]}>{letter}</Text>
    </View>
  );
};

const styles = themedStyles(() => ({
  imageWrap: {
    backgroundColor: '#FFF7DA',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  letter: { ...TYPE.button, color: COLORS.onAccent },
}));
