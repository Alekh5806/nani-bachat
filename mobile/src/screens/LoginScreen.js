import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../store/authStore';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { login, isLoading, error } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Fetch credentials when screen mounts
  useEffect(() => {
    const fetchSavedCredentials = async () => {
      try {
        const savedPhone = await AsyncStorage.getItem('saved_phone');
        const savedPassword = await AsyncStorage.getItem('saved_password');
        
        if (savedPhone && savedPassword) {
          setPhone(savedPhone);
          setPassword(savedPassword);
        }
      } catch (e) {
        console.log("Failed to load credentials", e);
      }
    };
    
    fetchSavedCredentials();
  }, []);

  // Empty fields get a red border until edited.
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setErrors({ phone: !phone.trim() ? 'Required' : undefined, password: !password.trim() ? 'Required' : undefined });
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Enter your phone number and password' });
      return;
    }

    // Always remembered: the session stays signed in on this device.
    const result = await login(phone.trim(), password, true);
    
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Signed in' });
    } else {
      Toast.show({ type: 'error', text1: 'Sign in failed', text2: result.error });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top: 3D illustration ── */}
          <View style={styles.tiles}>
            <Image source={require('../../assets/login/growth.webp')} style={styles.art} resizeMode="contain" />
          </View>

          {/* ── Heading ── */}
          <Text style={styles.title}>Let's sign you in</Text>
          <Text style={styles.subtitle}>Welcome back,{'\n'}Nani Bachat is waiting</Text>

          {/* ── Form ── */}
          <View style={styles.form}>
            <PremiumInput
              value={phone}
              error={errors.phone}
              onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <PremiumInput
              value={password}
              error={errors.password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
              placeholder="Password"
              secureTextEntry
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* ── Bottom: note and Sign in ── */}
          <View style={styles.bottom}>
            <Text style={styles.note}>Accounts are created by your group admin</Text>
            <PremiumButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              buttonStyle={{ minHeight: 44, paddingVertical: SPACING.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  tiles: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    marginBottom: SPACING.xxl,
  },
  art: {
    width: 220,
    height: 180,
  },
  title: {
    ...TYPE.screenTitle,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...TYPE.body,
    lineHeight: 22,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxxl,
  },
  form: {
    width: '100%',
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: SPACING.xxxl,
  },
  note: {
    ...TYPE.secondary,
    textAlign: 'center',
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  errorContainer: {
    backgroundColor: COLORS.lossBg,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPE.secondary,
    color: COLORS.loss,
  },
}));
