/**
 * Dividends Screen
 * Shows dividend history and admin can add new dividends
 */
import React, { useEffect, useState, useCallback } from 'react';
import { shortName } from '../utils/names';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl
} from 'react-native';

import { Add } from 'iconsax-react-native';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { SummaryCard } from '../components/SummaryCard';

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

  const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v || '';
    return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
  };

  const now = new Date();
  const sumWhere = (test) => dividends.reduce((sum, d) => {
    const dt = new Date(d.ex_date);
    return !Number.isNaN(dt.getTime()) && test(dt) ? sum + (Number(d.total_dividend) || 0) : sum;
  }, 0);
  const thisMonthTotal = sumWhere((dt) => dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth());
  const thisYearTotal = sumWhere((dt) => dt.getFullYear() === now.getFullYear());
  const lastReceived = dividends.map((d) => d.ex_date).filter(Boolean).sort().pop();

  // Group by month, newest first.
  const groups = [];
  [...dividends]
    .sort((a, b) => String(b.ex_date || '').localeCompare(String(a.ex_date || '')))
    .forEach((div) => {
      const d = new Date(div.ex_date);
      const valid = !Number.isNaN(d.getTime());
      const key = valid ? `${d.getFullYear()}-${d.getMonth()}` : 'none';
      const label = valid ? `${MON[d.getMonth()]} ${d.getFullYear()}` : 'Other';
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, label, total: 0, items: [] }; groups.push(g); }
      g.items.push(div);
      g.total += Number(div.total_dividend) || 0;
    });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Dividends"
        subtitle={`${dividends.length} entries`}
        rightAction={isAdmin ? () => navigation.navigate('AddDividend') : undefined}
        rightIcon={isAdmin ? <Add size={16} color={COLORS.onAccent} /> : undefined}
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
        <SummaryCard
          label={`Dividends (${dividends.length})`}
          value={money(totalDividends)}
          rows={[
            { label: 'This month', value: money(thisMonthTotal) },
            { label: 'This year', value: money(thisYearTotal) },
            { label: 'Last received', value: lastReceived ? fmtDate(lastReceived) : '—' },
          ]}
        />

<<<<<<< HEAD
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Dividends</Text>
          <Text style={styles.listHeaderText}>Total amount (Shares)</Text>
        </View>
=======
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
                    ₹{Number(div.dividend_per_share).toLocaleString('en-IN', { maximumFractionDigits: 6 })}/share
                  </Text>
                </View>
              </View>
            </View>
>>>>>>> experiment/live-market-quotes

        {groups.map((group) => (
          <View key={group.key}>
            <View style={styles.band}>
              <Text style={styles.bandText}>{group.label}</Text>
              <Text style={styles.bandTotal}>{money(group.total)}</Text>
            </View>
            {group.items.map((div, i) => {
              const dps = Number(div.dividend_per_share) || 0;
              const shares = div.quantity || (dps > 0 ? Math.round(Number(div.total_dividend) / dps) : 0);
              return (
                <View key={div.id || i} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <CompanyLogo symbol={div.stock_symbol} name={div.stock_name} size={40} style={{ marginRight: SPACING.md }} />
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowName} numberOfLines={1}>{shortName(div.stock_name)}</Text>
                    <Text style={styles.rowSub}>{fmtDate(div.ex_date)}  •  ₹{div.dividend_per_share}/share</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowAmount}>{money(div.total_dividend)}</Text>
                    <Text style={styles.rowSub}>{shares} shares</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {dividends.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Icon name="🎁" size={40} color={COLORS.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No dividends recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Dividends will appear here when added
            </Text>
          </GlassCard>
        )}

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
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.md },
  listHeaderText: { ...TYPE.infoTitle, color: COLORS.textSecondary },
  band: {
    flexDirection: 'row', justifyContent: 'space-between',
    // Light mode needs a darker band to stand out from the page.
    backgroundColor: COLORS.isDark ? COLORS.surface : COLORS.surfaceLight, paddingVertical: SPACING.md,
    marginHorizontal: -SPACING.xl, paddingHorizontal: SPACING.xl,
  },
  bandTotal: { ...TYPE.caption, color: COLORS.textMuted },
  bandText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowLeft: { flex: 1, minWidth: 0, marginRight: SPACING.md },
  rowRight: { alignItems: 'flex-end' },
  rowName: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  rowAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary },
  rowSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    ...TYPE.secondary,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
}));
