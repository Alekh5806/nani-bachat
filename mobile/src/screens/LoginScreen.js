import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeSlash, InfoCircle, Lock1, Mobile, TickSquare } from 'iconsax-react-native';
import Toast from 'react-native-toast-message';

import { LoginArtwork } from '../components/LoginArtwork';
import { UserAvatar } from '../components/UserAvatar';
import { useAuthStore } from '../store/authStore';
import { COLORS, TYPE, themedStyles } from '../theme/colors';
import {
  firstName, forgetRememberedMember, greetingForHour,
  isRememberedPhone, loadRememberedMember,
} from '../utils/rememberedMember';

const PROVERB_FONT = 'NotoSerifGujarati_600SemiBold';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const wide = width >= 960 && fontScale <= 1.3;
  const compact = width < 380;
  const stackBrand = !wide && fontScale > 1.3;
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

  const proverb = (
    <Text
      accessibilityLanguage="gu-IN"
      lang="gu"
      style={[styles.proverb, compact && styles.proverbCompact, wide && styles.proverbWide]}
    >
      “ધીરજનાં ફળ મીઠાં”
    </Text>
  );

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
            <View style={[
              styles.hero,
              wide ? styles.heroWide : { paddingTop: insets.top + 24 },
              compact && styles.heroCompact,
            ]}>
              <View style={[styles.heroContent, wide && styles.heroContentWide, stackBrand && styles.heroContentStacked]}>
                <View style={!wide && !stackBrand && styles.brandMobile}>
                  <Text style={[styles.brandName, wide && styles.brandNameWide]}>Nani Bachat</Text>
                  <Text style={styles.brandCaption}>Private investment circle</Text>
                  {!wide && proverb}
                </View>
                <View style={wide ? styles.heroFeatureWide : [styles.heroFeatureMobile, compact && styles.heroFeatureCompact]}>
                  <LoginArtwork />
                  {wide && proverb}
                </View>
              </View>
            </View>

            <View style={[
              styles.formSide,
              wide ? styles.formSideWide : { paddingBottom: Math.max(insets.bottom, 24) },
              compact && styles.formSideCompact,
            ]}>
              <Animated.View style={[
                styles.formContent,
                { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
              ]}>
                {member && <View style={[styles.welcomeIcon, !wide && styles.welcomeIconMobile]}>
                  <UserAvatar person={member} size={44} />
                </View>}
                <Text style={[styles.greeting, wide && styles.greetingWide, !wide && member && { paddingRight: 48 }]} accessibilityRole="header">
                  {greetingForHour(hour)},{'\n'}<Text style={styles.greetingName}>{name ? `${name}.` : 'welcome home.'}</Text>
                </Text>
                <Text style={styles.formDescription}>
                  {member ? 'Enter your password to continue.' : 'Use your registered phone number.'}
                </Text>

                <View style={[styles.form, compact && styles.formCompact]}>
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
                      placeholder="Enter your phone number" placeholderTextColor={COLORS.placeholder}
                      keyboardAppearance={COLORS.isDark ? 'dark' : 'light'}
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
                      placeholder="Enter your password" placeholderTextColor={COLORS.placeholder}
                      keyboardAppearance={COLORS.isDark ? 'dark' : 'light'}
                      secureTextEntry={!showPassword} autoComplete="current-password" textContentType="password"
                      autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={handleLogin}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} editable={!isLoading}
                      accessibilityLabel="Password" accessibilityLabelledBy="login-password-label"
                      aria-invalid={Boolean(errors.password)} style={styles.input}
                    />
                    <Pressable
                      onPress={() => setShowPassword((current) => !current)} accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
                    >{showPassword ? <EyeSlash size={20} color={styles.inputIcon.color} /> : <Eye size={20} color={styles.inputIcon.color} />}</Pressable>
                  </View>
                  {errors.password && <Text style={styles.fieldError} accessibilityLiveRegion="polite">{errors.password}</Text>}
                  <Pressable
                    onPress={toggleRememberMe} disabled={isLoading}
                    onKeyDown={Platform.OS === 'web' ? handleRememberKeyDown : undefined}
                    accessibilityRole="checkbox" aria-checked={rememberMe}
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
                    aria-busy={isLoading}
                    style={({ pressed, hovered }) => [styles.signInButton, hovered && styles.signInHovered, pressed && styles.signInPressed, isLoading && styles.signInLoading]}
                  >
                    {isLoading && <ActivityIndicator size="small" color={COLORS.onAccent} />}
                    <Text style={styles.signInText}>{isLoading ? 'Welcoming you in…' : 'Sign in'}</Text>
                  </Pressable>
                </View>

                <View style={styles.helpSection}>
                  <Pressable
                    onPress={() => setHelpVisible((visible) => !visible)} accessibilityRole="button"
                    aria-expanded={helpVisible} hitSlop={6}
                    style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}
                  ><Text style={styles.helpButtonText}>Need help signing in?</Text></Pressable>
                  {helpVisible && <View style={styles.helpBox}><Text style={styles.helpText}>
                    Your group admin creates your account. Contact them if you need your registered phone number, a password reset, or an invitation to the circle.
                  </Text></View>}
                </View>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.surface },
  screenWide: { backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  layout: { flex: 1, width: '100%', alignSelf: 'center' },
  layoutWide: { flexDirection: 'row', maxWidth: 1480, minHeight: 640, borderRadius: 28, overflow: 'hidden' },
  hero: { backgroundColor: COLORS.surface, paddingHorizontal: 28, paddingBottom: 24 },
  heroCompact: { paddingHorizontal: 22 },
  heroWide: { width: '51%', padding: 44, borderRightWidth: 1, borderRightColor: COLORS.border },
  heroContent: { width: '100%', maxWidth: 410, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 2 },
  heroContentWide: { flex: 1, maxWidth: '100%', flexDirection: 'column', alignItems: 'stretch', gap: 14 },
  heroContentStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  brandMobile: { flex: 1, minWidth: 0 },
  brandName: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '600' },
  brandNameWide: { fontSize: 28, fontWeight: '600' },
  brandCaption: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: 4 },
  heroFeatureMobile: { width: 128, marginRight: -8 },
  heroFeatureCompact: { width: 98 },
  heroFeatureWide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 36 },
  proverb: { color: COLORS.warning, fontFamily: PROVERB_FONT, fontSize: 22, lineHeight: 32, marginTop: 12 },
  proverbCompact: { fontFamily: PROVERB_FONT, fontSize: 20, lineHeight: 30 },
  proverbWide: { fontFamily: PROVERB_FONT, fontSize: 40, lineHeight: 58, textAlign: 'center', marginTop: 4 },
  formSide: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -1, paddingHorizontal: 28, paddingTop: 30, flex: 1 },
  formSideCompact: { paddingHorizontal: 22, paddingTop: 24 },
  formSideWide: { width: '49%', borderRadius: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0, paddingHorizontal: 48, paddingVertical: 40, justifyContent: 'center' },
  formContent: { width: '100%', maxWidth: 410, alignSelf: 'center' },
  welcomeIcon: { alignSelf: 'flex-start', marginBottom: 18 },
  welcomeIconMobile: { position: 'absolute', right: 0, top: 0, marginBottom: 0 },
  greeting: { color: COLORS.textPrimary, fontSize: 31, lineHeight: 40, fontWeight: '500', letterSpacing: -0.6 },
  greetingWide: { fontSize: 42, lineHeight: 52, fontWeight: '500', letterSpacing: -0.9 },
  greetingName: { color: COLORS.accent },
  formDescription: { ...TYPE.body, color: COLORS.textSecondary, marginTop: 12 },
  form: { marginTop: 30 },
  formCompact: { marginTop: 24 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', minHeight: 24, marginBottom: 8 },
  label: { ...TYPE.inputLabel, flexShrink: 1, color: COLORS.textPrimary },
  passwordLabel: { marginTop: 20, marginBottom: 12 },
  inputShell: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, gap: 12, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, backgroundColor: COLORS.inputBg },
  inputFocused: { borderColor: COLORS.inputFocus },
  inputError: { borderColor: COLORS.loss },
  input: { ...TYPE.inputText, flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 15, paddingRight: 8, color: COLORS.textPrimary, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  inputIcon: { color: COLORS.textSecondary },
  accent: { color: COLORS.accent },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  smallAction: { paddingVertical: 4, paddingLeft: 8 },
  smallActionText: { ...TYPE.button, color: COLORS.accent },
  fieldError: { ...TYPE.secondary, color: COLORS.loss, marginTop: 8 },
  rememberRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginTop: 8 },
  rememberBox: { width: 20, height: 20, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  rememberBoxChecked: { borderColor: 'transparent' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.lossBg, borderRadius: 10, padding: 12, marginTop: 16 },
  errorText: { ...TYPE.secondary, flex: 1, color: COLORS.loss },
  signInButton: { minHeight: 56, borderRadius: 12, backgroundColor: COLORS.buttonPrimary, marginTop: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  signInHovered: { backgroundColor: COLORS.buttonPrimaryPressed },
  signInPressed: { transform: [{ scale: 0.99 }] },
  signInLoading: { opacity: 0.9 },
  signInText: { ...TYPE.button, flexShrink: 1, color: COLORS.onAccent, textAlign: 'center', letterSpacing: 0.1 },
  helpSection: { marginTop: 18, alignItems: 'center' },
  helpButton: { minHeight: 44, justifyContent: 'center' },
  helpButtonText: { ...TYPE.button, color: COLORS.accent, textAlign: 'center' },
  helpBox: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 10, marginTop: 4 },
  helpText: { ...TYPE.secondary, color: COLORS.textSecondary },
  pressed: { opacity: 0.65 },
}));
