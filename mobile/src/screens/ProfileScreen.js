/**
 * Profile Screen
 * User profile, settings, and logout
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Linking, ActivityIndicator, Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Alert } from '../utils/alert';

import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { PremiumButton } from '../components/PremiumButton';
import { SectionHeader } from '../components/SectionHeader';
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

        {/* ── Profile Card ── */}
        <GlassCard style={styles.profileCard}>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.avatar}>
            <UserAvatar person={{ ...displayUser, avatar: user?.avatar ?? displayUser?.avatar }} size={64} />
          </Pressable>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
            <Text style={styles.changeAvatar}>Change avatar</Text>
          </Pressable>
          <Text style={styles.name}>{displayUser?.name || 'Member'}</Text>
          <Text style={styles.phone}>{displayUser?.phone || ''}</Text>
          {displayUser?.email && <Text style={styles.email}>{displayUser.email}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(displayUser?.role || 'member')}
            </Text>
          </View>
        </GlassCard>

        {/* ── Appearance ── */}
        <SectionHeader title="Appearance" />
        <View style={styles.segment}>
          {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setThemePreference(value)}
              style={[styles.segmentItem, themePreference === value && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, themePreference === value && styles.segmentTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Actions ── */}
        <SectionHeader title="Actions" icon="⚙️" />
        <PremiumButton
          title="Download Monthly Report"
          onPress={handleDownloadReport}
          loading={downloading}
          icon="📄"
          variant="secondary"
          style={{ marginBottom: SPACING.md }}
        />

        <PremiumButton
          title="Logout"
          onPress={handleLogout}
          icon="🚪"
          variant="secondary"
          textStyle={{ color: COLORS.loss }}
          style={{ marginBottom: SPACING.lg }}
        />

        {/* ── App Info ── */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.appName}>Nani Bachat</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </GlassCard>

        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 0,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  avatar: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  changeAvatar: { ...TYPE.secondaryMedium, color: COLORS.accent, marginBottom: SPACING.md },
  name: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  phone: {
    ...TYPE.caption,
    color: COLORS.textSecondary,
  },
  email: {
    ...TYPE.secondary,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: SPACING.sm,
  },
  roleText: {
    ...TYPE.secondaryMedium,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  segmentItemActive: {
    backgroundColor: COLORS.background,
  },
  segmentText: {
    ...TYPE.secondaryMedium,
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },
  statsCard: {
    padding: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  statLabel: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
  },
  statValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.lg,
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  appName: {
    ...TYPE.sectionTitle,
    color: COLORS.accent,
  },
  version: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  description: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 20,
  },
}));
