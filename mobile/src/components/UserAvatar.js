/**
 * UserAvatar
 * Round avatar for a member: the chosen picture from assets/avatar, or the
 * first letter on the member's colour when none is chosen.
 */
import React from 'react';
import { View, Text, Image } from 'react-native';
import { AVATARS } from '../utils/avatars';
import { COLORS, TYPE, themedStyles } from '../theme/colors';

const avatarLuminance = (color) => {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) return null;
  const hex = color.length === 4 ? color.slice(1).replace(/./g, (digit) => digit + digit) : color.slice(1);
  const [red, green, blue] = hex.match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const UserAvatar = ({ person, size = 44, style }) => {
  const source = AVATARS[person?.avatar];

  const box = { width: size, height: size, borderRadius: size / 2 };
  const letter = ((person?.name || '?').trim()[0] || '?').toUpperCase();

  if (source) {
    // Plain picture: no background, border or rounding.
    return <Image source={source} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
  }
  const luminance = avatarLuminance(person?.avatar_color);
  const backgroundColor = luminance === null ? COLORS.buttonPrimary : person.avatar_color;
  // Black has higher contrast than white above this relative luminance.
  const color = luminance > 0.179 ? '#000000' : COLORS.onAccent;
  return (
    <View style={[styles.fallback, box, { backgroundColor }, style]}>
      <Text style={[styles.letter, { color, fontSize: Math.round(size * 0.4) }]}>{letter}</Text>
    </View>
  );
};

const styles = themedStyles(() => ({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  letter: TYPE.button,
}));
