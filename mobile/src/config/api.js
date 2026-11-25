/**
 * API Configuration
 * Axios instance with JWT interceptor
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const LOGIN_PATH = '/auth/login/';
const LOGOUT_PATH = '/auth/logout/';
let nextSessionId = 0;
let session = null;
let logoutCallback = null;
export const setLogoutCallback = (fn) => { logoutCallback = fn; };

export const setSessionTokens = (access, refresh, rememberMe) => {
  session = access && refresh
    ? { id: ++nextSessionId, access, refresh, rememberMe, refreshRequest: null, signingOut: false }
    : null;
};

export const revokeSession = async () => {
  const current = session;
  if (!current) return;
  current.signingOut = true;
  await current.refreshRequest?.catch(() => {});
  await api.post(LOGOUT_PATH, undefined, { _sessionId: current.id });
};

api.interceptors.request.use((config) => {
  const isLogout = config.url === LOGOUT_PATH;
  if ((config._sessionId && config._sessionId !== session?.id) || (session?.signingOut && !isLogout)) {
    throw new axios.CanceledError('Session ended');
  }
  if (session && config.url !== LOGIN_PATH) {
    config._sessionId = session.id;
    config.headers.Authorization = `Bearer ${session.access}`;
    // The logout retry must revoke the newly rotated refresh token.
    if (isLogout) config.data = { refresh: session.refresh };
  }
  return config;
});

const refreshTokens = async (current) => {
  try {
    const { data } = await axios.post(
      `${getBaseURL()}/auth/token/refresh/`,
      { refresh: current.refresh },
      { timeout: api.defaults.timeout }
    );
    if (current !== session) return;

    const refresh = data.refresh || current.refresh;
    if (current.rememberMe && !current.signingOut) {
      await AsyncStorage.multiSet([
        ['access_token', data.access],
        ['refresh_token', refresh],
      ]).catch(() => console.error('Unable to save renewed session'));
    }
    current.access = data.access;
    current.refresh = refresh;
  } catch (error) {
    const status = error.response?.status;
    if (current === session && !current.signingOut && (status === 400 || status === 401)) {
      await logoutCallback?.();
    }
    throw error;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const current = session;
    if (response?.status !== 401 || !config?._sessionId || config._retry ||
        config._sessionId !== current?.id || (current.signingOut && config.url !== LOGOUT_PATH)) {
      throw error;
    }

    // Parallel 401s must share one rotation because the server invalidates the old refresh token.
    if (config.headers.Authorization === `Bearer ${current.access}`) {
      current.refreshRequest ??= refreshTokens(current).finally(() => {
        current.refreshRequest = null;
      });
      await current.refreshRequest;
    }

    config._retry = true;
    return api(config);
  }
);

export default api;
