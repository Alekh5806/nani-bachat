/**
 * TabBarSpacer
 * Empty space at the end of a scrolling screen so the last item can scroll
 * clear of the floating tab bar: bar height + its distance from the bottom + a gap.
 */
import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/colors';

export const TAB_BAR_HEIGHT = 64;
export const TabBarHeightContext = createContext(TAB_BAR_HEIGHT);
export const getTabBarOffset = (bottomInset) => Math.max(bottomInset, 12);

export const TabBarSpacer = () => {
  const insets = useSafeAreaInsets();
  const height = useContext(TabBarHeightContext);
  return <View style={{ height: height + getTabBarOffset(insets.bottom) + SPACING.lg }} />;
};
