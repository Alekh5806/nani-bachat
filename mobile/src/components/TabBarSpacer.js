/**
 * TabBarSpacer
 * Empty space at the end of a scrolling screen so the last item can scroll
 * clear of the floating tab bar: bar height + its distance from the bottom + a gap.
 */
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/colors';

export const TAB_BAR_HEIGHT = 64;

export const TabBarSpacer = () => {
  const insets = useSafeAreaInsets();
  return <View style={{ height: TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + SPACING.lg }} />;
};
