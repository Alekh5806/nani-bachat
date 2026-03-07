/**
 * Profile Screen
 * User profile, settings, and logout
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl,
  Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '../store/authStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { PremiumButton } from '../components/PremiumButton';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import api from '../config/api';

export const ProfileScreen = () => {
  const { user, logout, fetchProfile } = useAuthStore();
  const { dashboard, fetchDashboard } = usePortfolioStore();
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

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
            Toast.show({ type: 'success', text1: 'Logged Out', text2: 'See you soon!' });
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
  const myPortfolio = dashboard?.my_portfolio;

  const totalContribution = Number(displayUser?.total_contribution) || 0;
  const ownershipPct = Number(displayUser?.ownership_percentage) || 0;
  const currentValue = Number(displayUser?.current_value) || Number(myPortfolio?.current_value) || 0;
  const profitLoss = Number(displayUser?.profit_loss) || Number(myPortfolio?.profit_loss) || 0;
  const totalDividend = Number(displayUser?.total_dividend) || Number(myPortfolio?.dividend_earned) || 0;
  const isProfit = profitLoss >= 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" subtitle="Your account" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Profile Card ── */}
        <GlassCard style={styles.profileCard}>
          <LinearGradient
            colors={[displayUser?.avatar_color || COLORS.accent, COLORS.gradientEnd]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(displayUser?.name || '').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.name}>{displayUser?.name || 'Member'}</Text>
          <Text style={styles.phone}>{displayUser?.phone || ''}</Text>
          {displayUser?.email && <Text style={styles.email}>{displayUser.email}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(displayUser?.role || 'member').toUpperCase()}
            </Text>
          </View>
        </GlassCard>

        {/* ── Portfolio Stats ── */}
        <SectionHeader title="My Portfolio" icon="📊" />
        {loading ? (
          <GlassCard style={styles.statsCard}>
            <View style={{ padding: SPACING.xxl, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={{ color: COLORS.textMuted, marginTop: SPACING.sm, fontSize: FONTS.sm }}>
                Loading portfolio...
              </Text>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Contributed</Text>
              <Text style={styles.statValue}>₹{totalContribution.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Value</Text>
              <Text style={[styles.statValue, { color: COLORS.accent }]}>
                ₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Profit / Loss</Text>
              <Text style={[styles.statValue, { color: isProfit ? COLORS.profit : COLORS.loss }]}>
                {isProfit ? '+' : ''}₹{profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Dividends Earned</Text>
              <Text style={[styles.statValue, { color: COLORS.profit }]}>
                ₹{totalDividend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Ownership</Text>
              <Text style={styles.statValue}>{ownershipPct}%</Text>
            </View>
          </GlassCard>
        )}

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
          variant="danger"
          style={{ marginBottom: SPACING.lg }}
        />

        {/* ── App Info ── */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.appName}>Nani Bachat</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.description}>
            Private group investment tracking app for smart investing together.
          </Text>
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.huge,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.glow,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  name: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  phone: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
  },
  email: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  roleText: {
    color: COLORS.accent,
    fontSize: FONTS.sm,
    fontWeight: '700',
    letterSpacing: 1,
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
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONTS.md,
    fontWeight: '700',
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
    fontSize: FONTS.xl,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  description: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 20,
  },
});
