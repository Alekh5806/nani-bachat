/**
 * Nani Bachat - Private Group Investment Tracker
 * Main Application Entry Point
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuthStore } from './src/store/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';
import { toastConfig } from './src/config/toastConfig';
import { COLORS } from './src/theme/colors';

export default function App() {
  const { token, isLoading, loadToken } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadToken();
      setAppReady(true);
    };
    init();
  }, []);

  if (!appReady || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: COLORS.accent,
                background: COLORS.background,
                card: COLORS.cardBg,
                text: COLORS.textPrimary,
                border: COLORS.border,
                notification: COLORS.accent,
              },
              fonts: {
                regular: { fontFamily: 'System', fontWeight: '400' },
                medium: { fontFamily: 'System', fontWeight: '500' },
                bold: { fontFamily: 'System', fontWeight: '700' },
                heavy: { fontFamily: 'System', fontWeight: '800' },
              },
            }}
          >
            {token ? <MainNavigator /> : <AuthNavigator />}
          </NavigationContainer>
          <StatusBar style="light" />
          <Toast config={toastConfig} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
