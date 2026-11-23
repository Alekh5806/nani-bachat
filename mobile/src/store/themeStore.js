/**
 * Theme preference: 'system' | 'light' | 'dark'.
 * `version` changes on every switch; App uses it as a key so screens remount
 * with the new palette.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyThemeMode, resolveMode, COLORS, getThemeVersion } from '../theme/colors';

const KEY = 'theme_preference';

export const useThemeStore = create((set, get) => ({
  preference: 'system',
  mode: COLORS.isDark ? 'dark' : 'light',
  version: getThemeVersion(),

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        get().setPreference(saved, false);
      }
    } catch (e) {
      // Fall back to the system theme
    }
  },

  setPreference: (preference, persist = true) => {
    const mode = resolveMode(preference);
    const version = applyThemeMode(mode);
    set({ preference, mode, version });
    if (persist) AsyncStorage.setItem(KEY, preference).catch(() => {});
  },
}));
