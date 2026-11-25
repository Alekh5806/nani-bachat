import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  ArrowRight2, Brush2, Call, DocumentDownload, DocumentText, Edit2, Monitor, Moon, Sms, Sun1,
} from 'iconsax-react-native';
import Toast from 'react-native-toast-message';

import { expo } from '../../app.json';
import { AvatarPicker } from '../components/AvatarPicker';
import { MonthlyReportSheet } from '../components/MonthlyReportSheet';
import { ProfileSheet } from '../components/ProfileSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { UserAvatar } from '../components/UserAvatar';
import { getReportMonth } from '../services/monthlyReport';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { Alert } from '../utils/alert';

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'Use device setting', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun1 },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export const ProfileScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const logout = useAuthStore((state) => state.logout);
  const signingOut = useAuthStore((state) => state.isLoading);
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile]);

  const closeSheet = () => setActiveSheet(null);
  const currentMonth = getReportMonth();
  const themeLabel = APPEARANCE_OPTIONS.find((option) => option.value !== 'system' && option.value === preference)
    ?.label ?? 'System';
  const role = (user?.role || 'member').replace(/^./, (letter) => letter.toUpperCase());

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You can sign back in with your phone number and password.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          Toast.show({ type: 'success', text1: 'Signed out' });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" showBack hideProfile onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <View style={styles.content}>
          <View style={[styles.card, styles.identityCard]}>
            <View style={styles.identity}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change avatar"
                onPress={() => setActiveSheet('avatar')}
                style={({ pressed }) => [styles.avatarButton, pressed && styles.dim]}
              >
                <View style={styles.avatar} pointerEvents="none">
                  <UserAvatar person={user} size={64} />
                </View>
                <View style={styles.editBadge} pointerEvents="none">
                  <Edit2 size={12} color={COLORS.onAccent} variant="Bold" />
                </View>
              </Pressable>
              <View style={styles.identityText}>
                <Text style={styles.name}>{user?.name?.trim() || 'Member'}</Text>
                {!!user?.name?.trim() && <Text style={styles.role}>{role}</Text>}
              </View>
            </View>
            <View style={styles.contactDetails}>
              <ContactDetail Icon={Call} label="Phone" value={user?.phone} />
              <ContactDetail Icon={Sms} label="Email" value={user?.email} />
            </View>
          </View>

          <View style={[styles.card, styles.settingsCard]}>
            <ProfileRow
              Icon={Brush2}
              label="Appearance"
              value={themeLabel}
              ActionIcon={ArrowRight2}
              onPress={() => setActiveSheet('appearance')}
            />
            <View style={styles.divider} />
            <ProfileRow
              Icon={DocumentText}
              label="Monthly pool report"
              detail={currentMonth.label}
              ActionIcon={DocumentDownload}
              onPress={() => setActiveSheet(currentMonth)}
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: signingOut, busy: signingOut }}
              disabled={signingOut}
              onPress={confirmLogout}
              style={({ pressed }) => [styles.logout, (pressed || signingOut) && styles.dim]}
            >
              <Text style={styles.logoutText}>{signingOut ? 'Logging out…' : 'Log out'}</Text>
            </Pressable>
            <Text style={styles.appInfo}>Nani Bachat · Version {expo.version}</Text>
          </View>
          <TabBarSpacer />
        </View>
      </ScrollView>

      <AvatarPicker visible={activeSheet === 'avatar'} onDismiss={closeSheet} />
      {activeSheet === 'appearance' && (
        <ProfileSheet title="Appearance" onDismiss={closeSheet}>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
              const checked = preference === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  aria-checked={checked}
                  onPress={() => {
                    closeSheet();
                    setPreference(value);
                  }}
                  style={({ pressed }) => [
                    styles.option, checked && styles.optionSelected, pressed && styles.dim,
                  ]}
                >
                  <Icon size={20} color={COLORS.textSecondary} />
                  <Text style={styles.optionLabel}>{label}</Text>
                  {checked && <Text style={styles.check} accessible={false}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </ProfileSheet>
      )}
      {activeSheet && typeof activeSheet === 'object' && (
        <MonthlyReportSheet month={activeSheet} onDismiss={closeSheet} />
      )}
    </View>
  );
};

const ContactDetail = ({ Icon, label, value }) => (
  <View style={styles.contactRow}>
    <View style={styles.contactIcon} pointerEvents="none">
      <Icon size={18} color={COLORS.textSecondary} />
    </View>
    <View style={styles.contactText}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text selectable={!!value} textBreakStrategy="simple" style={styles.contactValue}>
        {value || '—'}
      </Text>
    </View>
  </View>
);

const ProfileRow = ({ Icon, label, detail, value, ActionIcon, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={[label, detail || value].filter(Boolean).join(', ')}
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
  >
    <View style={styles.rowIcon}>
      <Icon size={20} color={COLORS.textPrimary} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail && <Text style={styles.rowDetail}>{detail}</Text>}
    </View>
    {value && <Text style={styles.rowValue}>{value}</Text>}
    <ActionIcon size={18} color={COLORS.textSecondary} />
  </Pressable>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xs },
  content: { alignSelf: 'center', width: '100%', maxWidth: 520 },
  card: { backgroundColor: COLORS.cardBg, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.xxl },
  identityCard: { padding: SPACING.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  avatarButton: { paddingRight: SPACING.xs, paddingBottom: 3 },
  avatar: {
    width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: COLORS.surface,
  },
  editBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent,
    borderWidth: 2, borderColor: COLORS.cardBg,
  },
  dim: { opacity: 0.65 },
  identityText: { flex: 1, minWidth: 0 },
  name: { ...TYPE.screenTitle, fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  role: { ...TYPE.secondaryMedium, color: COLORS.textSecondary, marginTop: SPACING.xs },
  contactDetails: {
    marginTop: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.divider,
    gap: SPACING.lg,
  },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  contactIcon: { width: 24, alignItems: 'center', paddingTop: 2 },
  contactText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  contactLabel: { ...TYPE.captionMedium, color: COLORS.textSecondary },
  contactValue: {
    ...TYPE.body, color: COLORS.textPrimary, ...(Platform.OS === 'web' && { overflowWrap: 'anywhere' }),
  },
  settingsCard: { marginTop: SPACING.lg, overflow: 'hidden' },
  row: {
    minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
  },
  rowPressed: { backgroundColor: COLORS.surface },
  rowIcon: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, marginRight: SPACING.xs,
  },
  rowText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  rowLabel: { ...TYPE.body, fontWeight: '600', color: COLORS.textPrimary },
  rowDetail: { ...TYPE.caption, color: COLORS.textSecondary },
  rowValue: { ...TYPE.captionMedium, maxWidth: '42%', color: COLORS.textSecondary, textAlign: 'right' },
  divider: { height: 1, marginHorizontal: SPACING.lg, backgroundColor: COLORS.divider },
  footer: { alignItems: 'center', marginTop: SPACING.lg, gap: SPACING.xs, marginBottom: SPACING.sm },
  logout: { minHeight: 48, justifyContent: 'center', paddingHorizontal: SPACING.xl },
  logoutText: { ...TYPE.button, color: COLORS.loss },
  appInfo: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center' },
  options: { gap: SPACING.xs },
  option: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
  },
  optionSelected: { backgroundColor: COLORS.surface },
  optionLabel: { ...TYPE.body, color: COLORS.textPrimary, flex: 1 },
  check: { ...TYPE.sectionTitle, color: COLORS.textPrimary },
}));
