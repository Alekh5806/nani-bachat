/**
 * Authentication State Management (Zustand)
 * Handles login, logout, token persistence
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePortfolioStore } from './portfolioStore';
import api, { revokeSession, setLogoutCallback, setSessionTokens } from '../config/api';
import { forgetRememberedMember, rememberMember } from '../utils/rememberedMember';

const SESSION_KEYS = ['access_token', 'refresh_token', 'user'];

export const useAuthStore = create((set, get) => {
  const finishLogout = async () => {
    setSessionTokens(null, null);
    try {
      await AsyncStorage.multiRemove(SESSION_KEYS);
    } finally {
      await usePortfolioStore.getState().clearCache();
      set({ token: null, user: null, rememberMe: false, isLoading: false, error: null });
    }
  };
  setLogoutCallback(finishLogout);

  return {
    // ── State ──
    user: null,
    token: null,
    rememberMe: false,
    isLoading: false,
    error: null,

    // ── Load persisted token on app start ──
    loadToken: async () => {
      set({ isLoading: true });
      try {
        const { access_token: token, refresh_token: refresh, user: userStr } = Object.fromEntries(
          await AsyncStorage.multiGet(SESSION_KEYS)
        );

        if (token && refresh && userStr) {
          const user = JSON.parse(userStr);
          await rememberMember(user);
          setSessionTokens(token, refresh, true);
          set({ token, user, rememberMe: true, isLoading: false });

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
        if (get().user?.id !== member?.id) await usePortfolioStore.getState().clearCache();

        if (rememberMe) {
          await AsyncStorage.multiSet([
            ['access_token', access],
            ['refresh_token', refresh],
            ['user', JSON.stringify(member)],
          ]);
          await rememberMember(member);
        } else {
          await AsyncStorage.multiRemove(SESSION_KEYS);
          await forgetRememberedMember();
        }
        setSessionTokens(access, refresh, rememberMe);
        set({
          token: access,
          rememberMe,
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
      if (get().isLoading) return;
      set({ isLoading: true });
      await revokeSession().catch(() => {});
      await finishLogout();
    },

    // ── Update user data ──
    updateUser: async (userData) => {
      const { user, rememberMe } = get();
      if (!user || user.id !== userData.id) return;
      set({ user: userData });
      if (rememberMe) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        if (get().user === userData) await rememberMember(userData);
      }
    },

    // ── Clear error ──
    clearError: () => set({ error: null }),

    // ── Fetch fresh profile data from API ──
    fetchProfile: async () => {
      try {
        const response = await api.get('/auth/profile/');
        const freshUser = response.data;
        await get().updateUser(freshUser);
        return freshUser;
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }
    },
  };
});
