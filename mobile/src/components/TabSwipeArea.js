import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const SWIPE_START = 20;
const SWIPE_DISTANCE = 48;
const VERTICAL_TOLERANCE = 14;

export const TabSwipeArea = ({ tab, tabKeys, onChange, style, children }) => {
  const index = tabKeys.indexOf(tab);
  const swipe = useMemo(() => Gesture.Pan()
    .enabled(index >= 0 && tabKeys.length > 1)
    .maxPointers(1)
    .activeOffsetX([-SWIPE_START, SWIPE_START])
    .failOffsetY([-VERTICAL_TOLERANCE, VERTICAL_TOLERANCE])
    .runOnJS(true)
    .onEnd(({ translationX, translationY }, success) => {
      const distance = Math.abs(translationX);
      if (!success || distance < SWIPE_DISTANCE || distance < Math.abs(translationY) * 1.5) return;

      const next = tabKeys[index + (translationX < 0 ? 1 : -1)];
      if (next !== undefined) onChange(next);
    }), [index, tabKeys, onChange]);

  return (
    <GestureDetector gesture={swipe} touchAction="pan-y pinch-zoom" userSelect="auto" enableContextMenu>
      <View collapsable={false} style={style}>{children}</View>
    </GestureDetector>
  );
};
