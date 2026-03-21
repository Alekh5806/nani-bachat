import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../store/authStore';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { login, isLoading, error } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Default to false, let storage dictate if it should be checked
  const [rememberMe, setRememberMe] = useState(false); 

  // Fetch credentials when screen mounts
  useEffect(() => {
    const fetchSavedCredentials = async () => {
      try {
        const savedPhone = await AsyncStorage.getItem('saved_phone');
        const savedPassword = await AsyncStorage.getItem('saved_password');
        
        if (savedPhone && savedPassword) {
          setPhone(savedPhone);
          setPassword(savedPassword);
          setRememberMe(true); // Check the box automatically
        }
      } catch (e) {
        console.log("Failed to load credentials", e);
      }
    };
    
    fetchSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Enter phone and password' });
      return;
    }

    // Pass the rememberMe state to the store
    const result = await login(phone.trim(), password, rememberMe);
    
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Welcome!', text2: 'Logged in successfully' });
    } else {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: result.error });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo Section ── */}
          <View style={styles.logoSection}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoIcon}>📊</Text>
            </LinearGradient>
            <Text style={styles.appName}>Nani Bachat</Text>
            <Text style={styles.tagline}>
              Smart Group Investment Tracker
            </Text>
          </View>

          {/* ── Login Form ── */}
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSubtitle}>
                Enter your credentials to continue
              </Text>

              <PremiumInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                icon="📱"
              />

              <PremiumInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                icon="🔒"
              />

              {/* Remember Me Checkbox */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                <Checkbox
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  color={rememberMe ? COLORS.accent : COLORS.textMuted}
                />
                <Text style={{ marginLeft: 8, color: COLORS.textSecondary, fontSize: FONTS.sm }}>
                  Remember Me
                </Text>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>❌ {error}</Text>
                </View>
              )}

              <PremiumButton
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                icon="→"
                style={{ marginTop: SPACING.lg }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: FONTS.hero,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.5,
  },
  formContainer: {
    width: '100%',
  },
  formCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.xxl,
  },
  formTitle: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  errorContainer: {
    backgroundColor: COLORS.lossBg,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.loss,
    fontSize: FONTS.sm,
    fontWeight: '500',
  },
});