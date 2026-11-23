/**
 * API Configuration
 * Axios instance with JWT interceptor
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Base URL Configuration ──
const DEV_MACHINE_IP = '192.168.0.209'; // Your Mac's LAN IP (for local dev)

// Production backend URL (Render)
const PRODUCTION_URL = 'https://nani-bachat.onrender.com/api';
const DEV_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEV_MACHINE_IP}:8000/api`;

const getBaseURL = () => {
  if (__DEV__) {
    return DEV_URL;
  }

  return PRODUCTION_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // Keep this at 60 seconds for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tokens for the current session, kept in memory. Used when the user did not
// tick "Remember me", so nothing is written to storage but requests still work.
const sessionTokens = { access: null, refresh: null };
export const setSessionTokens = (access, refresh) => {
  sessionTokens.access = access || null;
  sessionTokens.refresh = refresh || null;
};

// ── Request Interceptor: Attach JWT Token ──
api.interceptors.request.use(
  async (config) => {
    try {
      const token = sessionTokens.access || (await AsyncStorage.getItem('access_token'));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error reading token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle token refresh ──
// Store a reference to the logout function (set by authStore)
let logoutCallback = null;
export const setLogoutCallback = (fn) => { logoutCallback = fn; };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet, try refreshing token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = sessionTokens.refresh || (await AsyncStorage.getItem('refresh_token'));
        if (refreshToken) {
          const response = await axios.post(
            `${getBaseURL()}/auth/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          sessionTokens.access = access;
          const stored = await AsyncStorage.getItem('access_token');
          if (stored) await AsyncStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and force logout
        setSessionTokens(null, null);
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        if (logoutCallback) logoutCallback();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
