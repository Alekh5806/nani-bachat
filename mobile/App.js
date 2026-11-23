/**
 * Nani Bachat - Private Group Investment Tracker
 * Main Application Entry Point
 */
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

import { useAuthStore } from './src/store/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';
import { toastConfig } from './src/config/toastConfig';
import { COLORS, themedStyles } from './src/theme/colors';
import { useThemeStore } from './src/store/themeStore';
import { FONT_ASSETS, fontFamilyFor } from './src/theme/fonts';
import { loadPortfolioCache } from './src/store/portfolioStore';
import {
  addNotificationListeners,
  registerForPushNotificationsAsync,
} from './src/services/notifications';

export default function App() {
  const { token, isLoading, loadToken } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const themeVersion = useThemeStore((st) => st.version);
  const themeMode = useThemeStore((st) => st.mode);
  const navState = useRef();

  useEffect(() => {
    const init = async () => {
      await useThemeStore.getState().load();
      await Promise.all([loadToken(), loadPortfolioCache()]);
      setAppReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!token) return;
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

  if (!appReady || isLoading || !(fontsLoaded || fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View key={themeVersion} style={{ flex: 1 }}>
          <NavigationContainer
            initialState={navState.current}
            onStateChange={(state) => { navState.current = state; }}
            theme={{
              dark: COLORS.isDark,
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
            }}
          >
            {token ? <MainNavigator /> : <AuthNavigator />}
          </NavigationContainer>
          <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
          <Toast config={toastConfig} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() => ({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
}));
