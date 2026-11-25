import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeSlash, InfoCircle, Lock1, Mobile, People, ShieldTick, TickSquare } from 'iconsax-react-native';
import Toast from 'react-native-toast-message';

import { LoginArtwork, LoginMark } from '../components/LoginArtwork';
import { UserAvatar } from '../components/UserAvatar';
import { useAuthStore } from '../store/authStore';
import { COLORS, themedStyles } from '../theme/colors';
import {
  firstName, forgetRememberedMember, greetingForHour,
  isRememberedPhone, loadRememberedMember,
} from '../utils/rememberedMember';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 960;
  const compact = width < 380;
  const { login, isLoading, error, clearError } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remembered, setRemembered] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [errors, setErrors] = useState({});
  const [helpVisible, setHelpVisible] = useState(false);
  const [hour, setHour] = useState(new Date().getHours());
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const edited = useRef(false);
  const submitting = useRef(false);
  const entrance = useRef(new Animated.Value(1)).current;
  const member = isRememberedPhone(remembered, phone) ? remembered : null;
  const name = firstName(member?.name);

  useEffect(() => {
    let active = true;
    loadRememberedMember().then((saved) => {
      if (active && !edited.current) {
        setRemembered(saved.member);
        setPhone(saved.phone);
      }
    });
    const timer = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    let animation;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      entrance.setValue(0);
      animation = Animated.timing(entrance, {
        toValue: 1, duration: 480, useNativeDriver: true,
      });
      animation.start();
    }).catch(() => {});
    return () => { active = false; animation?.stop(); };
  }, [entrance]);

  const changeField = (field, value) => {
    edited.current = true;
    if (field === 'phone') {
      setPhone(value);
      if (password) setPassword('');
    } else setPassword(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (error) clearError();
  };

  const switchAccount = () => {
    edited.current = true;
    setRemembered(null);
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setErrors({});
    clearError();
    forgetRememberedMember().catch(() => {});
    phoneRef.current?.focus();
  };

  const toggleRememberMe = () => setRememberMe((current) => !current);
  const handleRememberKeyDown = (event) => {
    if (isLoading || event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) toggleRememberMe();
  };

  const handleLogin = async () => {
    if (isLoading || submitting.current) return;
    const nextErrors = {
      phone: !phone.trim() ? 'Enter your phone number.' : undefined,
      password: !password ? 'Enter your password.' : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.phone || nextErrors.password) {
      (nextErrors.phone ? phoneRef : passwordRef).current?.focus();
      return;
    }
    submitting.current = true;
    try {
      const result = await login(phone.trim(), password, rememberMe);
      if (result.success) {
        const signedInName = firstName(result.member?.name);
        Toast.show({
          type: 'success',
          text1: signedInName ? `Welcome back, ${signedInName}` : 'Welcome back',
          text2: 'Your circle. Your shared future.',
        });
      }
    } finally {
      submitting.current = false;
    }
  };

  return (
    <View style={[styles.screen, wide && styles.screenWide]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, wide && { padding: 24, minHeight: height }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.layout, wide && styles.layoutWide]}>
            <View style={[styles.hero, wide ? styles.heroWide : { paddingTop: insets.top + 24 }]}>
              <View style={styles.heroOrb} pointerEvents="none" />
              <View style={styles.brand}>
                <View style={styles.brandMark}><LoginMark size={34} /></View>
                <View>
                  <Text style={styles.brandName}>nani bachat<Text style={styles.brandDot}>.</Text></Text>
                  <Text style={styles.brandCaption}>YOUR PRIVATE INVESTMENT CIRCLE</Text>
                </View>
              </View>
              <View style={[styles.heroMain, wide && styles.heroMainWide]}>
                <View style={[styles.proverbFrame, wide && styles.proverbFrameWide]}>
                  <Text
                    accessibilityLanguage="gu-IN"
                    lang="gu"
                    style={[styles.proverb, compact && styles.proverbCompact, wide && styles.proverbWide]}
                  >
                    “ધીરજનાં ફળ મીઠાં”
                  </Text>
                </View>
                <View
                  style={[styles.artwork, wide ? styles.artworkWide : styles.artworkMobile]}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                ><LoginArtwork /></View>
              </View>
              {wide && <View style={styles.heroFooter}>
                <View style={styles.circleIcon}><People size={18} color="#C3D1F1" /></View>
                <Text style={styles.heroFooterText}>Your people. Your goals. Your growth.</Text>
              </View>}
            </View>

            <View style={[
              styles.formSide,
              wide ? styles.formSideWide : { paddingBottom: Math.max(insets.bottom, 24) },
              compact && styles.formSideCompact,
            ]}>
              {wide && <View style={styles.privateBadge}>
                <ShieldTick size={15} color={COLORS.textSecondary} />
                <Text style={styles.privateBadgeText}>A space for your circle</Text>
              </View>}
              <Animated.View style={[
                styles.formContent, wide && styles.formContentWide,
                { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
              ]}>
                {(wide || member) && <View style={[styles.welcomeIcon, !wide && styles.welcomeIconMobile]}>
                  {member ? <UserAvatar person={member} size={44} /> : <Lock1 size={24} color={COLORS.isDark ? '#A8BCFF' : '#4966C9'} />}
                </View>}
                <Text style={styles.formEyebrow}>{member ? 'YOUR CIRCLE MISSED YOU' : 'WELCOME TO YOUR CIRCLE'}</Text>
                <Text style={[styles.greeting, wide && styles.greetingWide, !wide && member && { paddingRight: 48 }]} accessibilityRole="header">
                  {greetingForHour(hour)},{'\n'}<Text style={styles.greetingName}>{name ? `${name}.` : 'welcome home.'}</Text>
                </Text>
                <Text style={styles.formDescription}>
                  {member ? 'Good to see you again. Let’s keep growing.' : 'Sign in to a future we’re building together.'}
                </Text>

                <View style={styles.form}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label} nativeID="login-phone-label">Phone number</Text>
                    {remembered && <Pressable
                      onPress={switchAccount} disabled={isLoading} accessibilityRole="button" hitSlop={8}
                      style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
                    ><Text style={styles.smallActionText}>Switch account</Text></Pressable>}
                  </View>
                  <View style={[styles.inputShell, focused === 'phone' && styles.inputFocused, errors.phone && styles.inputError]}>
                    <Mobile size={20} color={focused === 'phone' ? styles.accent.color : styles.inputIcon.color} />
                    <TextInput
                      ref={phoneRef} value={phone} onChangeText={(value) => changeField('phone', value)}
                      placeholder="Enter your phone number" placeholderTextColor={styles.placeholder.color}
                      keyboardType="phone-pad" autoComplete="username" textContentType="username"
                      autoCapitalize="none" autoCorrect={false} returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()} submitBehavior="submit"
                      onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} editable={!isLoading}
                      accessibilityLabel="Phone number" accessibilityLabelledBy="login-phone-label"
                      aria-invalid={Boolean(errors.phone)} style={styles.input}
                    />
                  </View>
                  {errors.phone && <Text style={styles.fieldError} accessibilityLiveRegion="polite">{errors.phone}</Text>}

                  <Text style={[styles.label, styles.passwordLabel]} nativeID="login-password-label">Password</Text>
                  <View style={[styles.inputShell, focused === 'password' && styles.inputFocused, errors.password && styles.inputError]}>
                    <Lock1 size={20} color={focused === 'password' ? styles.accent.color : styles.inputIcon.color} />
                    <TextInput
                      ref={passwordRef} value={password} onChangeText={(value) => changeField('password', value)}
                      placeholder="Enter your password" placeholderTextColor={styles.placeholder.color}
                      secureTextEntry={!showPassword} autoComplete="current-password" textContentType="password"
                      autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={handleLogin}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} editable={!isLoading}
                      accessibilityLabel="Password" accessibilityLabelledBy="login-password-label"
                      aria-invalid={Boolean(errors.password)} style={styles.input}
                    />
                    <Pressable
                      onPress={() => setShowPassword((current) => !current)} accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityState={{ checked: showPassword }}
                      style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
                    >{showPassword ? <EyeSlash size={20} color={styles.inputIcon.color} /> : <Eye size={20} color={styles.inputIcon.color} />}</Pressable>
                  </View>
                  {errors.password && <Text style={styles.fieldError} accessibilityLiveRegion="polite">{errors.password}</Text>}
                  <Pressable
                    onPress={toggleRememberMe} disabled={isLoading}
                    onKeyDown={Platform.OS === 'web' ? handleRememberKeyDown : undefined}
                    accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe, disabled: isLoading }}
                    accessibilityLabel="Remember me on this device"
                    style={({ pressed }) => [styles.rememberRow, pressed && styles.pressed]}
                  >
                    <View style={[styles.rememberBox, rememberMe && styles.rememberBoxChecked]} aria-hidden>
                      {rememberMe && <TickSquare size={24} color={styles.accent.color} variant="Bold" />}
                    </View>
                    <Text style={styles.label}>Remember me on this device</Text>
                  </Pressable>
                  {error && <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <InfoCircle size={18} color={COLORS.loss} /><Text style={styles.errorText}>{error}</Text>
                  </View>}
                  <Pressable
                    onPress={handleLogin} disabled={isLoading} accessibilityRole="button" accessibilityLabel="Sign in"
                    accessibilityState={{ disabled: isLoading, busy: isLoading }}
                    style={({ pressed, hovered }) => [styles.signInButton, hovered && styles.signInHovered, pressed && styles.signInPressed, isLoading && styles.signInLoading]}
                  >
                    {isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
                    <Text style={styles.signInText}>{isLoading ? 'Welcoming you in…' : 'Sign in'}</Text>
                  </Pressable>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.memberNote}>Every great journey starts with a circle.</Text>
                  <Pressable
                    onPress={() => setHelpVisible((visible) => !visible)} accessibilityRole="button"
                    accessibilityState={{ expanded: helpVisible }} hitSlop={6}
                    style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}
                  ><Text style={styles.helpButtonText}>Need help signing in?</Text></Pressable>
                  {helpVisible && <View style={styles.helpBox}><Text style={styles.helpText}>
                    Your group admin creates your account. Contact them if you need your registered phone number, a password reset, or an invitation to the circle.
                  </Text></View>}
                </View>
              </Animated.View>
              <View style={[styles.footer, wide && styles.footerWide]}>
                <Text style={styles.footerText}>A LITTLE TODAY. A LOT, TOGETHER.</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#101D33' },
  screenWide: { backgroundColor: COLORS.isDark ? '#090F1C' : '#EEF1F7' },
  scroll: { flexGrow: 1 },
  layout: { flex: 1, width: '100%', alignSelf: 'center' },
  layoutWide: { flexDirection: 'row', maxWidth: 1480, minHeight: 780, borderRadius: 28, overflow: 'hidden' },
  hero: { backgroundColor: '#101D33', overflow: 'hidden', paddingHorizontal: 28, paddingBottom: 22 },
  heroWide: { width: '51%', padding: 44, paddingBottom: 34 },
  heroOrb: { position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: '#152640', top: -270, right: -260, opacity: 0.7 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1 },
  brandMark: { width: 45, height: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2C47', borderWidth: 1, borderColor: '#344360' },
  brandName: { color: '#F4F6FF', fontSize: 23, fontWeight: '600', letterSpacing: -0.9 },
  brandDot: { color: '#A9C1FF' },
  brandCaption: { color: '#9DACCA', fontSize: 9, fontWeight: '500', letterSpacing: 1.3, marginTop: 4 },
  heroMain: { marginTop: 24, minHeight: 70, justifyContent: 'center' },
  heroMainWide: { flex: 1, marginTop: 66, minHeight: 555, justifyContent: 'center' },
  proverbFrame: { alignSelf: 'flex-start', maxWidth: '100%', borderLeftWidth: 2, borderLeftColor: '#BD9B69', paddingLeft: 14, paddingVertical: 5, zIndex: 1 },
  proverbFrameWide: { paddingLeft: 24, paddingVertical: 8 },
  proverb: { color: '#F0DAB4', fontFamily: 'NotoSerifGujarati_600SemiBold', fontSize: 31, lineHeight: 46 },
  proverbCompact: { fontSize: 27, lineHeight: 42 },
  proverbWide: { fontSize: 52, lineHeight: 75 },
  artwork: { alignSelf: 'center' },
  artworkWide: { width: '116%', height: 340, marginTop: 24, marginLeft: -10 },
  artworkMobile: { position: 'absolute', width: 196, height: 140, right: -76, top: -33, opacity: 0.28 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: '#29374F', paddingTop: 22 },
  circleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E2E48', alignItems: 'center', justifyContent: 'center' },
  heroFooterText: { color: '#B7C3D9', fontSize: 12, fontWeight: '400' },
  formSide: { backgroundColor: COLORS.isDark ? '#101725' : '#FBFCFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -1, paddingHorizontal: 28, paddingTop: 30, flex: 1 },
  formSideCompact: { paddingHorizontal: 22 },
  formSideWide: { width: '49%', borderRadius: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0, paddingHorizontal: 48, paddingTop: 36, paddingBottom: 30, alignItems: 'center', justifyContent: 'space-between' },
  privateBadge: { flexDirection: 'row', gap: 7, alignSelf: 'flex-end', alignItems: 'center' },
  privateBadgeText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '400' },
  formContent: { width: '100%', maxWidth: 410, alignSelf: 'center' },
  formContentWide: { paddingVertical: 36 },
  welcomeIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: COLORS.isDark ? '#202C46' : '#EDF1FC', borderWidth: 1, borderColor: COLORS.isDark ? '#2C3A56' : '#E0E7F9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  welcomeIconMobile: { position: 'absolute', right: 0, top: 0, width: 44, height: 44, borderRadius: 14, marginBottom: 0 },
  formEyebrow: { color: COLORS.isDark ? '#9CAED8' : '#687BA4', fontSize: 10, fontWeight: '600', letterSpacing: 1.4, marginBottom: 12 },
  greeting: { color: COLORS.isDark ? '#EEF2FC' : '#14213B', fontSize: 31, lineHeight: 40, fontWeight: '500', letterSpacing: -1.3 },
  greetingWide: { fontSize: 37, lineHeight: 46, letterSpacing: -1.7 },
  greetingName: { color: COLORS.isDark ? '#A8BCFF' : '#627CB7' },
  formDescription: { color: COLORS.isDark ? '#A0ADC5' : '#727F96', fontSize: 14, lineHeight: 22, fontWeight: '400', marginTop: 12 },
  form: { marginTop: 30 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24, marginBottom: 8 },
  label: { color: COLORS.isDark ? '#D4DCEE' : '#33415B', fontSize: 14, fontWeight: '500' },
  passwordLabel: { marginTop: 21, marginBottom: 11 },
  inputShell: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, gap: 12, borderWidth: 1, borderColor: COLORS.isDark ? '#2C374E' : '#DFE5EF', borderRadius: 12, backgroundColor: COLORS.isDark ? '#151F31' : '#FFFFFF' },
  inputFocused: { borderColor: COLORS.isDark ? '#8DA9FF' : '#6C85C4', backgroundColor: COLORS.isDark ? '#1B2941' : '#FFFFFF' },
  inputError: { borderColor: COLORS.loss },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 15, paddingRight: 8, color: COLORS.isDark ? '#F0F4FF' : '#1E2C48', fontSize: 16, fontWeight: '400', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  placeholder: { color: COLORS.isDark ? '#7F8EA8' : '#8B97AB' },
  inputIcon: { color: COLORS.isDark ? '#94A4C1' : '#7B8CA9' },
  accent: { color: COLORS.isDark ? '#A8BCFF' : '#4A67B2' },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  smallAction: { paddingVertical: 5, paddingLeft: 8 },
  smallActionText: { color: COLORS.isDark ? '#A8BCFF' : '#4A67B2', fontSize: 11, fontWeight: '500' },
  fieldError: { color: COLORS.loss, fontSize: 12, fontWeight: '400', marginTop: 7 },
  rememberRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 9, marginTop: 7 },
  rememberBox: { width: 20, height: 20, borderWidth: 1, borderColor: COLORS.isDark ? '#8291B0' : '#7283A6', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  rememberBoxChecked: { borderColor: 'transparent' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.lossBg, borderRadius: 10, padding: 12, marginTop: 16 },
  errorText: { flex: 1, color: COLORS.loss, fontSize: 12, lineHeight: 19, fontWeight: '400' },
  signInButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#4164DA', marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#2A4CA9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 2 },
  signInHovered: { backgroundColor: '#3557CD' },
  signInPressed: { backgroundColor: '#2F50C3', transform: [{ scale: 0.99 }] },
  signInLoading: { opacity: 0.8 },
  signInText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
  helpSection: { marginTop: 29, paddingTop: 24, borderTopWidth: 1, borderTopColor: COLORS.isDark ? '#263147' : '#E7EBF3', alignItems: 'center' },
  memberNote: { color: COLORS.isDark ? '#96A4BD' : '#7B879D', fontSize: 11, fontWeight: '400', textAlign: 'center' },
  helpButton: { minHeight: 42, justifyContent: 'center' },
  helpButtonText: { color: COLORS.isDark ? '#A8BCFF' : '#4A67B2', fontSize: 12, fontWeight: '500' },
  helpBox: { backgroundColor: COLORS.isDark ? '#1B273D' : '#EEF2FA', padding: 14, borderRadius: 10, marginTop: 4 },
  helpText: { color: COLORS.isDark ? '#B9C6DD' : '#5F6F89', fontSize: 12, lineHeight: 20, fontWeight: '400' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerWide: { marginTop: 0 },
  footerText: { color: COLORS.isDark ? '#7F8DA8' : '#8A97AC', fontSize: 8, fontWeight: '500', letterSpacing: 1.8, textAlign: 'center' },
  pressed: { opacity: 0.65 },
}));
