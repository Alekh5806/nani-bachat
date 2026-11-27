import React from 'react';
import { useTheme } from '@react-navigation/native';

// Screens use shared palette tokens. Subscribe inside each route so a theme
// change updates its styles without remounting the screen or clearing drafts.
export const withScreenTheme = (Screen) => function ThemedScreen(props) {
  useTheme();
  return <Screen {...props} />;
};
