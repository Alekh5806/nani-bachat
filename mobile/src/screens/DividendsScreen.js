/**
 * Dividends Screen
 * Shows dividend history and admin can add new dividends
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl
} from 'react-native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { StatCard } from '../components/StatCard';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

export const DividendsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { dividends, fetchDividends } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDividends();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDividends();
    setRefreshing(false);
  }, []);

  const totalDividends = dividends.reduce(
    (sum, d) => sum + (Number(d.total_dividend) || 0), 0
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Dividends"
        subtitle={`${dividends.length} entries`}
        rightAction={isAdmin ? () => navigation.navigate('AddDividend') : undefined}
        rightIcon={isAdmin ? '➕' : undefined}
        rightLabel={isAdmin ? 'Add' : undefined}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Summary ── */}
        <StatCard
          label="Total Dividends Earned"
          value={`₹${totalDividends.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="🎁"
          gradient
          gradientColors={['#8B5CF6', '#EC4899']}
          style={{ marginBottom: SPACING.lg }}
        />

        {/* ── Dividend List ── */}
        <SectionHeader title="Dividend History" icon="📋" />
        {dividends.map((div, index) => (
          <GlassCard key={div.id || index} style={styles.divCard}>
            <View style={styles.divHeader}>
              <View style={styles.divLeft}>
                <Text style={styles.divStock}>{div.stock_name}</Text>
                <Text style={styles.divSymbol}>{div.stock_symbol}</Text>
              </View>
              <View style={styles.divRight}>
                <Text style={styles.divTotal}>
                  ₹{Number(div.total_dividend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <View style={styles.dpsBadge}>
                  <Text style={styles.dpsText}>
                    ₹{div.dividend_per_share}/share
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divFooter}>
              <Text style={styles.divDate}>📅 {div.ex_date}</Text>
              <Text style={styles.divPerMember}>
                👤 ₹{Number(div.per_member_share).toFixed(2)}/member
              </Text>
            </View>
          </GlassCard>
        ))}

        {dividends.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyText}>No dividends recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Dividends will appear here when added
            </Text>
          </GlassCard>
        )}

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
  divCard: {
    marginBottom: SPACING.md,
  },
  divHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divLeft: {},
  divStock: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divSymbol: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divRight: {
    alignItems: 'flex-end',
  },
  divTotal: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.profit,
  },
  dpsBadge: {
    backgroundColor: COLORS.profitBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  dpsText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.profit,
  },
  divFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  divDate: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  divPerMember: {
    fontSize: FONTS.xs,
    color: COLORS.accent,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
