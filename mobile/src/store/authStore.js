/**
 * Authentication State Management (Zustand)
 * Handles login, logout, token persistence
 * Users stay logged in for 30 days (refresh token lifetime)
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutCallback } from '../config/api';

export const useAuthStore = create((set, get) => {
  // Register the force-logout callback so the API interceptor
  // can kick the user back to login if the refresh token expires
  setLogoutCallback(() => {
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
          set({ token, refreshToken: refresh, user, isLoading: false });

          // Silently validate the token in the background
          // If it's expired, the interceptor will auto-refresh it
          try {
            const res = await api.get('/portfolio/dashboard/');
            // Token is valid, user stays logged in
          } catch (e) {
            // If both access+refresh are expired, interceptor clears tokens
            // and calls logoutCallback — user will see login screen
          }
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false, error: 'Failed to load session' });
      }
    },

    // ── Login ──
 // ── Login ──
    login: async (phone, password, rememberMe = true) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.post('/auth/login/', { phone, password });
        const { access, refresh, member } = response.data;

       if (rememberMe) {
        // Save session tokens
        await AsyncStorage.setItem('access_token', access);
        await AsyncStorage.setItem('refresh_token', refresh);
        await AsyncStorage.setItem('user', JSON.stringify(member));
        
        // NEW: Save the actual text for the UI to fill in later
        await AsyncStorage.setItem('saved_phone', phone);
        await AsyncStorage.setItem('saved_password', password); 
       } else {
        // Clear everything if they don't want to be remembered
        await AsyncStorage.multiRemove([
            'access_token', 
            'refresh_token', 
            'user',
            'saved_phone',    // NEW: Clear saved phone
            'saved_password'  // NEW: Clear saved password
        ]);
       }
        set({
          token: access,
          refreshToken: refresh,
          user: member,
          isLoading: false,
          error: null,
        });

        return { success: true };
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

      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      set({ token: null, refreshToken: null, user: null, error: null });
    },

    // ── Update user data ──
    updateUser: async (userData) => {
      set({ user: userData });
      await AsyncStorage.setItem('user', JSON.stringify(userData));
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
        return freshUser;
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }
    },
  };
});

