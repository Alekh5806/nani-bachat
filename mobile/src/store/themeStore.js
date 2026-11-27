/**
 * Theme preference: 'system' | 'light' | 'dark'.
 * The resolved mode changes only when the active palette changes.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyThemeMode, resolveMode, COLORS } from '../theme/colors';

const KEY = 'theme_preference';

export const useThemeStore = create((set, get) => ({
  preference: 'system',
  mode: COLORS.isDark ? 'dark' : 'light',

  load: async () => {
    let preference = 'system';
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        preference = saved;
      }
    } catch (e) {
      // Fall back to the system theme
    }
    get().setPreference(preference, false);
  },

  setPreference: (preference, persist = true) => {
    const mode = resolveMode(preference);
    if (mode !== get().mode) applyThemeMode(mode);
    set({ preference, mode });
    if (persist) AsyncStorage.setItem(KEY, preference).catch(() => {});
  },
}));
