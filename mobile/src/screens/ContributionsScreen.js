/**
 * Contributions Screen
 * Monthly contribution management with admin controls
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Alert
} from 'react-native';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { PremiumButton } from '../components/PremiumButton';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

export const ContributionsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { contributions, fetchContributions, updateContribution, generateContributions } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchContributions(selectedMonth);
  }, [selectedMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContributions(selectedMonth);
    setRefreshing(false);
  }, [selectedMonth]);

  const handleGenerateContributions = async () => {
    const result = await generateContributions(selectedMonth);
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Contributions Generated',
        text2: result.data.message,
      });
    }
  };

  const handleToggleStatus = async (contribution) => {
    if (!isAdmin) return;
    const newStatus = contribution.status === 'paid' ? 'unpaid' : 'paid';
    const result = await updateContribution(contribution.id, {
      status: newStatus,
      paid_date: newStatus === 'paid' ? dayjs().format('YYYY-MM-DD') : null,
    });
    if (result.success) {
      fetchContributions(selectedMonth);
      Toast.show({
        type: 'success',
        text1: 'Updated',
        text2: `${contribution.member_name}: ${newStatus}`,
      });
    }
  };

  // Generate month selector
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'));
  }

  const paidCount = contributions.filter(c => c.status === 'paid').length;
  const totalCount = contributions.length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Contributions"
        subtitle={`${selectedMonth}`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Month Selector ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.monthScroll}
        >
          {months.map((month) => (
            <Pressable
              key={month}
              onPress={() => setSelectedMonth(month)}
              style={[
                styles.monthPill,
                selectedMonth === month && styles.monthPillActive,
              ]}
            >
              <Text
                style={[
                  styles.monthText,
                  selectedMonth === month && styles.monthTextActive,
                ]}
              >
                {dayjs(month + '-01').format('MMM YY')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Status Bar ── */}
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Collection Status</Text>
            <Text style={styles.statusCount}>
              {paidCount}/{totalCount} paid
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: totalCount > 0 ? `${(paidCount / totalCount) * 100}%` : '0%' },
              ]}
            />
          </View>
          <Text style={styles.statusAmount}>
            ₹{(paidCount * 1000).toLocaleString('en-IN')} / ₹{(totalCount * 1000).toLocaleString('en-IN')}
          </Text>
        </GlassCard>

        {/* ── Admin: Generate Contributions ── */}
        {isAdmin && contributions.length === 0 && (
          <PremiumButton
            title="Generate Contributions"
            onPress={handleGenerateContributions}
            icon="⚡"
            style={{ marginBottom: SPACING.lg }}
          />
        )}

        {/* ── Contribution List ── */}
        <SectionHeader title="Members" icon="👥" />
        {contributions.map((contrib, index) => (
          <Pressable
            key={contrib.id || index}
            onPress={() => isAdmin && handleToggleStatus(contrib)}
          >
            <GlassCard style={styles.contribCard}>
              <View style={styles.contribRow}>
                <View style={styles.contribLeft}>
                  <Text style={styles.contribName}>{contrib.member_name}</Text>
                  <Text style={styles.contribAmount}>₹{contrib.amount}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    contrib.status === 'paid' ? styles.paidBadge : styles.unpaidBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      contrib.status === 'paid' ? styles.paidText : styles.unpaidText,
                    ]}
                  >
                    {contrib.status === 'paid' ? '✅ PAID' : '⏳ UNPAID'}
                  </Text>
                </View>
              </View>
              {contrib.paid_date && (
                <Text style={styles.paidDate}>Paid on {contrib.paid_date}</Text>
              )}
              {isAdmin && (
                <Text style={styles.tapHint}>Tap to toggle status</Text>
              )}
            </GlassCard>
          </Pressable>
        ))}

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
  monthScroll: {
    marginBottom: SPACING.lg,
  },
  monthPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: SPACING.sm,
  },
  monthPillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  monthText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#FFFFFF',
  },
  statusCard: {
    marginBottom: SPACING.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    fontWeight: '700',
  },
  statusCount: {
    color: COLORS.accent,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.profit,
    borderRadius: 3,
  },
  statusAmount: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
  },
  contribCard: {
    marginBottom: SPACING.md,
  },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contribLeft: {},
  contribName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  contribAmount: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  paidBadge: {
    backgroundColor: COLORS.profitBg,
  },
  unpaidBadge: {
    backgroundColor: COLORS.lossBg,
  },
  statusText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  paidText: {
    color: COLORS.profit,
  },
  unpaidText: {
    color: COLORS.loss,
  },
  paidDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.xs,
    marginTop: SPACING.sm,
  },
  tapHint: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
});
