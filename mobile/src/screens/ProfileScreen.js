/**
 * Profile Screen
 * User profile, settings, and logout
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { Crown1, Brush2, DocumentDownload, Logout, ArrowRight2, Gallery } from 'iconsax-react-native';
import Toast from 'react-native-toast-message';
import { Alert } from '../utils/alert';

import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import api from '../config/api';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { UserAvatar } from '../components/UserAvatar';
import { AvatarPicker } from '../components/AvatarPicker';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, fetchProfile } = useAuthStore();
  const { dashboard, fetchDashboard } = usePortfolioStore();
  const themePreference = useThemeStore((st) => st.preference);
  const setThemePreference = useThemeStore((st) => st.setPreference);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch fresh profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [freshUser, dashData] = await Promise.all([
        fetchProfile(),
        fetchDashboard(),
      ]);
      if (freshUser) {
        setProfileData(freshUser);
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Toast.show({ type: 'success', text1: 'Signed out' });
          },
        },
      ]
    );
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      Toast.show({
        type: 'info',
        text1: 'Generating Report',
        text2: 'Your PDF report is being prepared...',
      });
      const month = new Date().toISOString().slice(0, 7);
      Alert.alert(
        'Report',
        `Monthly report for ${month} will be generated. Check your backend at /api/reports/monthly/?month=${month}`,
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to generate report');
    }
    setDownloading(false);
  };

  // Use fresh profile data if available, fallback to stored user
  const displayUser = profileData || user;

  // Tapping Appearance steps through System, Light and Dark.
  const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
  const nextTheme = () => {
    const index = THEMES.findIndex(([value]) => value === themePreference);
    setThemePreference(THEMES[(index + 1) % THEMES.length][0]);
  };
  const themeLabel = THEMES.find(([value]) => value === themePreference)?.[1] || 'System';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Profile"
        subtitle="Your account"
        showBack
        onBack={() => navigation.goBack()}
        hideProfile
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <AvatarPicker visible={pickerOpen} onDismiss={() => setPickerOpen(false)} />

        {/* ── Profile hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => setPickerOpen(true)}>
              <UserAvatar person={{ ...displayUser, avatar: user?.avatar ?? displayUser?.avatar }} size={64} />
            </Pressable>
            <View style={styles.heroText}>
              <Text style={styles.name} numberOfLines={1}>{displayUser?.name || 'Member'}</Text>
              <Text style={styles.heroSub} numberOfLines={1}>{displayUser?.phone || ''}</Text>
              {!!displayUser?.email && <Text style={styles.heroSub} numberOfLines={1}>{displayUser.email}</Text>}
            </View>
          </View>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.heroButton}>
            <Gallery size={16} color={COLORS.onAccent} />
            <Text style={styles.heroButtonText}>Change avatar</Text>
          </Pressable>
        </View>

        {/* ── Account ── */}
        <ProfileRow
          Icon={Crown1}
          label="Role"
          pill={(displayUser?.role || 'member').replace(/^./, (c) => c.toUpperCase())}
        />
        <View style={styles.divider} />

        <ProfileRow Icon={Brush2} label="Appearance" value={themeLabel} onPress={nextTheme} chevron />
        <ProfileRow
          Icon={DocumentDownload}
          label="Monthly report"
          onPress={handleDownloadReport}
          loading={downloading}
          chevron
        />
        <View style={styles.divider} />

        <ProfileRow Icon={Logout} label="Log out" onPress={handleLogout} danger chevron />

        <Text style={styles.appInfo}>Nani Bachat · Version 1.0.0</Text>

        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

// One settings row: round icon, label, and on the right a pill and/or a chevron.
const ProfileRow = ({ Icon, label, pill, value, onPress, chevron, danger, loading }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress || loading}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
  >
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Icon size={20} color={danger ? COLORS.loss : COLORS.accent} />
    </View>
    <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    {!!value && <Text style={styles.valueText}>{value}</Text>}
    {!!pill && (
      <View style={styles.pill}>
        <Text style={styles.pillText}>{pill}</Text>
      </View>
    )}
    {loading ? (
      <ActivityIndicator size="small" color={COLORS.accent} />
    ) : (
      chevron && <ArrowRight2 size={16} color={COLORS.textMuted} />
    )}
  </Pressable>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 0 },
  hero: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroText: { flex: 1, minWidth: 0, marginLeft: SPACING.lg },
  name: { ...TYPE.sectionTitle, color: COLORS.onAccent },
  heroSub: { ...TYPE.caption, fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: SPACING.xs },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroButtonText: { ...TYPE.secondaryMedium, color: COLORS.onAccent },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  rowPressed: { opacity: 0.7 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent + '14',
    marginRight: SPACING.lg,
  },
  rowIconDanger: { backgroundColor: COLORS.loss + '14' },
  rowLabel: { flex: 1, ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  rowLabelDanger: { color: COLORS.loss },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '14',
    marginRight: SPACING.sm,
  },
  valueText: { ...TYPE.captionMedium, color: COLORS.textMuted, marginRight: SPACING.sm },
  pillText: { ...TYPE.captionMedium, color: COLORS.accent },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  appInfo: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl },
}));
