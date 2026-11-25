/**
 * Authentication State Management (Zustand)
 * Handles login, logout, token persistence
 * Users stay logged in for 30 days (refresh token lifetime)
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePortfolioStore } from './portfolioStore';
import api, { setLogoutCallback, setSessionTokens } from '../config/api';
import { forgetRememberedMember, rememberMember } from '../utils/rememberedMember';

export const useAuthStore = create((set, get) => {
  // Register the force-logout callback so the API interceptor
  // can kick the user back to login if the refresh token expires
  setLogoutCallback(() => {
    usePortfolioStore.getState().clearCache();
    set({ token: null, refreshToken: null, user: null, error: null });
  });

  return {
    // ── State ──
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null,

    // ── Load persisted token on app start ──
    loadToken: async () => {
      set({ isLoading: true });
      try {
        const token = await AsyncStorage.getItem('access_token');
        const refresh = await AsyncStorage.getItem('refresh_token');
        const userStr = await AsyncStorage.getItem('user');

        if (token && refresh && userStr) {
          const user = JSON.parse(userStr);
          await rememberMember(user);
          set({ token, refreshToken: refresh, user, isLoading: false });

          // Validate in the background so cold starts never block the UI.
          api.get('/portfolio/dashboard/').catch(() => {});
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false, error: 'Failed to load session' });
      }
    },

    // ── Login ──
    login: async (phone, password, rememberMe = true) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.post('/auth/login/', { phone, password });
        const { access, refresh, member } = response.data;
        setSessionTokens(access, refresh);
        if (get().user?.id !== member?.id) await usePortfolioStore.getState().clearCache();

        if (rememberMe) {
          await AsyncStorage.multiSet([
            ['access_token', access],
            ['refresh_token', refresh],
            ['user', JSON.stringify(member)],
          ]);
          await rememberMember(member);
        } else {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          await forgetRememberedMember();
        }
        set({
          token: access,
          refreshToken: refresh,
          user: member,
          isLoading: false,
          error: null,
        });

        return { success: true, member };
      } catch (error) {
        const message = error.response?.data?.detail || 'Invalid credentials';
        set({ isLoading: false, error: message });
        return { success: false, error: message };
      }
    },

    // ── Logout ──
    logout: async () => {
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        if (refresh) {
          await api.post('/auth/logout/', { refresh }).catch(() => {});
        }
      } catch (e) {
        // Ignore logout API errors
      }

      setSessionTokens(null, null);
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      await usePortfolioStore.getState().clearCache();
      set({ token: null, refreshToken: null, user: null, error: null });
    },

    // ── Update user data ──
    updateUser: async (userData) => {
      set({ user: userData });
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await rememberMember(userData);
    },

    // ── Clear error ──
    clearError: () => set({ error: null }),

    // ── Fetch fresh profile data from API ──
    fetchProfile: async () => {
      try {
        const response = await api.get('/auth/profile/');
        const freshUser = response.data;
        set({ user: freshUser });
        await AsyncStorage.setItem('user', JSON.stringify(freshUser));
        await rememberMember(freshUser);
        return freshUser;
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }
    },
  };
});
