/**
 * Nani Bachat - Private Group Investment Tracker
 * Main Application Entry Point
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, Appearance, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { useAuthStore } from './src/store/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';
import { toastConfig } from './src/config/toastConfig';
import { DialogHost } from './src/components/DialogHost';
import { COLORS, themedStyles } from './src/theme/colors';
import { useThemeStore } from './src/store/themeStore';
import { FONT_ASSETS, fontFamilyFor } from './src/theme/fonts';
import { loadPortfolioCache } from './src/store/portfolioStore';
import {
  addNotificationListeners,
  registerForPushNotificationsAsync,
} from './src/services/notifications';

// React Native Paper theme built from the app palette, so Paper components match.
const buildPaperTheme = () => {
  const base = COLORS.isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: COLORS.buttonPrimary,
      onPrimary: COLORS.onAccent,
      background: COLORS.background,
      surface: COLORS.cardBg,
      surfaceVariant: COLORS.surface,
      onSurface: COLORS.textPrimary,
      onSurfaceVariant: COLORS.textSecondary,
      outline: COLORS.inputBorder,
      error: COLORS.loss,
    },
  };
};

const NAV_STATE_KEY = 'navigationState';

export default function App() {
  const { token, loadToken } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const themeMode = useThemeStore((st) => st.mode);
  const backgroundColor = COLORS.background;
  const statusBarStyle = themeMode === 'dark' ? 'light' : 'dark';
  const paperTheme = useMemo(buildPaperTheme, [themeMode]);
  const navigationTheme = useMemo(() => ({
    dark: themeMode === 'dark',
    colors: {
      primary: COLORS.accent,
      background: COLORS.background,
      card: COLORS.cardBg,
      text: COLORS.textPrimary,
      border: COLORS.border,
      notification: COLORS.accent,
    },
    fonts: {
      regular: { fontFamily: fontFamilyFor('400'), fontWeight: '400' },
      medium: { fontFamily: fontFamilyFor('500'), fontWeight: '500' },
      bold: { fontFamily: fontFamilyFor('700'), fontWeight: '700' },
      heavy: { fontFamily: fontFamilyFor('800'), fontWeight: '800' },
    },
  }), [themeMode]);
  const navState = useRef();

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      const { preference, setPreference } = useThemeStore.getState();
      if (preference === 'system') setPreference('system', false);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.style.colorScheme = themeMode;
      document.documentElement.style.backgroundColor = backgroundColor;
      for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
        meta.content = backgroundColor;
      }
    }
    SystemUI.setBackgroundColorAsync(backgroundColor).catch(() => {});
  }, [themeMode, backgroundColor]);

  useEffect(() => {
    const init = async () => {
      await useThemeStore.getState().load();
      // On the web, reopen the page the user was on after a browser reload.
      if (Platform.OS === 'web') {
        try {
          const saved = await AsyncStorage.getItem(NAV_STATE_KEY);
          if (saved) navState.current = JSON.parse(saved);
        } catch (e) {
          // A broken saved state just means we start at Home.
        }
      }
      await Promise.all([loadToken(), loadPortfolioCache()]);
      setAppReady(true);
    };
    init();
  }, []);

  // After logout, forget the saved page so the next login starts at Home.
  useEffect(() => {
    if (appReady && !token) {
      navState.current = undefined;
      AsyncStorage.removeItem(NAV_STATE_KEY).catch(() => {});
    }
  }, [appReady, token]);

  useEffect(() => {
    // Push tokens need a VAPID key on the web, so push is native-only.
    if (!token || Platform.OS === 'web') return;
    registerForPushNotificationsAsync(token)
      .then((result) => {
        if (!result?.success) {
          console.log('Push notification registration failed:', result);
        }
      })
      .catch((error) => {
        console.log('Push notification registration failed:', error?.message || error);
      });
  }, [token]);

  useEffect(() => addNotificationListeners({
    onReceived: (notification) => {
      console.log('Push notification received:', notification.request?.content);
    },
    onResponse: (response) => {
      console.log('Push notification response:', response.notification.request?.content?.data);
    },
  }), []);

  if (!appReady || !(fontsLoaded || fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <StatusBar style={statusBarStyle} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <View style={styles.app}>
              <NavigationContainer
                initialState={navState.current}
                onStateChange={(state) => {
                  navState.current = state;
                  if (Platform.OS === 'web') {
                    AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state)).catch(() => {});
                  }
                }}
                theme={navigationTheme}
              >
                {token ? <MainNavigator /> : <AuthNavigator />}
              </NavigationContainer>
              <StatusBar style={statusBarStyle} />
              <Toast config={toastConfig} />
              <DialogHost />
            </View>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() => ({
  app: { flex: 1, backgroundColor: COLORS.background },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
}));
