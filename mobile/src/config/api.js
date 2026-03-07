/**
 * API Configuration
 * Axios instance with JWT interceptor
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Base URL Configuration ──
const DEV_MACHINE_IP = '192.168.1.144'; // Your Mac's LAN IP (for local dev)

// Production backend URL (Render)
const PRODUCTION_URL = 'https://nanibachat-api.onrender.com/api';

const getBaseURL = () => {
  if (__DEV__) {
    // In development, use local server
    return `http://${DEV_MACHINE_IP}:8000/api`;
  }
  // Production APK uses the deployed Render backend
  return PRODUCTION_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT Token ──
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
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
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${getBaseURL()}/auth/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          await AsyncStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and force logout
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        if (logoutCallback) logoutCallback();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
