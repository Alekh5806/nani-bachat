/**
 * Dashboard Screen
 * Portfolio first. Flat dark surfaces with hairline borders, green and red only for gains and losses.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Dimensions, Pressable, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { fmtFull, fmtShort } from '../utils/currency';
import { Icon, AppIcon } from '../components/Icon';
import { AllocationDonut } from '../components/AllocationDonut';
import { GrowthChart, formatChartPoint } from '../components/GrowthChart';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

const { width: SCREEN_W } = Dimensions.get('window');
const PRICE_REFRESH_INTERVAL_MS = 60000;
const RANGES = [['1W', 7], ['1M', 30], ['3M', 90], ['1Y', 365], ['ALL', 3650]];
const RANGE_LABEL = { '1W': 'this week', '1M': 'this month', '3M': 'last 3 months', '1Y': 'this year', ALL: 'all time' };

// Categorical colours for the allocation donut (not P/L colours).
const CHART_COLORS = ['#4D6BFF', '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#84CC16', '#14B8A6', '#64748B'];


// Component
export const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    dashboard, fetchDashboard,
    stockSummary, fetchStockSummary,
    dividends, fetchDividends,
    growthData, fetchGrowthData,
    isLoading,
  } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('1M');
  const [scrub, setScrub] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchGrowthData(RANGES.find(([k]) => k === range)[1]);
    }, [range, fetchGrowthData])
  );

  const chartData = [...(growthData || [])]
    .reverse()
    .map((d) => ({ date: d.date, value: Number(d.total_current_value) || 0 }));
  const scrubbed = scrub ? formatChartPoint(scrub) : null;

  // Change over the selected range, taken from the same points the chart draws.
  const rangeStart = chartData.length > 1 ? chartData[0].value : 0;
  const rangeEnd = chartData.length > 1 ? chartData[chartData.length - 1].value : 0;
  const rangePct = rangeStart > 0 ? ((rangeEnd - rangeStart) / rangeStart) * 100 : 0;
  const rangeUp = rangePct >= 0;

  useFocusEffect(
    useCallback(() => {
      const loadPrices = () => {
        fetchDashboard();
        fetchStockSummary();
        fetchDividends();
      };

      loadPrices();
      const intervalId = setInterval(loadPrices, PRICE_REFRESH_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [fetchDashboard, fetchStockSummary, fetchDividends])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchStockSummary(), fetchDividends()]);
    setRefreshing(false);
  }, [fetchDashboard, fetchStockSummary, fetchDividends]);

  const p = dashboard?.portfolio || {};
  const holdings = stockSummary?.stocks || [];
  const pnl = Number(p.profit_loss) || 0;
  const isUp = pnl >= 0;


  const totalVal = holdings.reduce((s, h) => s + (Number(h.current_value) || 0), 0) || 1;


  // Asset allocation: stocks and club cash.
  const stocksValue = Number(p.active_stock_value) || 0;
  const cashValue = Math.max(Number(p.cash_balance) || 0, 0);
  const assetTotal = stocksValue + cashValue || 1;
  const assets = [
    {
      key: 'stocks', name: 'Stocks', color: COLORS.accent, value: stocksValue,
      invested: Number(p.active_stock_invested) || 0,
      sub: `${holdings.length} stocks · ${((stocksValue / assetTotal) * 100).toFixed(2)}%`,
      up: stocksValue >= (Number(p.active_stock_invested) || 0),
    },
    {
      key: 'cash', name: 'Club Cash', color: COLORS.neutral, value: cashValue,
      sub: `${((cashValue / assetTotal) * 100).toFixed(2)}%`,
    },
  ].filter((a) => a.value > 0);

  // Dividends: the last four calendar quarters, newest first (empty ones show 0).
  const quarterNames = ['Jan - Mar', 'Apr - Jun', 'Jul - Sep', 'Oct - Dec'];
  const byQuarter = {};
  (dividends || []).forEach((d) => {
    const dt = new Date(d.ex_date);
    if (Number.isNaN(dt.getTime())) return;
    const idx = dt.getFullYear() * 4 + Math.floor(dt.getMonth() / 3);
    byQuarter[idx] = (byQuarter[idx] || 0) + (Number(d.total_dividend) || 0);
  });
  const nowDate = new Date();
  const currentQuarter = nowDate.getFullYear() * 4 + Math.floor(nowDate.getMonth() / 3);
  const quarters = [0, 1, 2, 3].map((i) => {
    const idx = currentQuarter - i;
    const year = Math.floor(idx / 4);
    const label = quarterNames[idx % 4] + (year === nowDate.getFullYear() ? '' : ` '${String(year).slice(2)}`);
    return { key: idx, label, total: byQuarter[idx] || 0 };
  });
  const maxQuarter = Math.max(...quarters.map((x) => x.total), 1);
  const firstDividend = (dividends || [])
    .map((d) => new Date(d.ex_date)).filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b)[0];
  const receivedSince = firstDividend
    ? firstDividend.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }).replace(' ', " '")
    : null;

  // Donut and legend: the five largest holdings.
  const sorted = [...holdings].sort((a, b) => (Number(b.current_value) || 0) - (Number(a.current_value) || 0));
  const toSlice = (h, i) => ({
    key: h.symbol,
    name: h.name || (h.symbol || '').replace('.NS', ''),
    value: Number(h.current_value) || 0,
    invested: Number(h.total_invested) || 0,
    pnl: (Number(h.current_value) || 0) - (Number(h.total_invested) || 0),
    sub: `${h.total_quantity || h.quantity} shares · ${(((Number(h.current_value) || 0) / totalVal) * 100).toFixed(1)}%`,
    color: CHART_COLORS[i % CHART_COLORS.length],
  });
  const slices = sorted.slice(0, 5).map(toSlice);

  if (isLoading && !dashboard) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Portfolio" subtitle={getMonthLabel()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={COLORS.accent} colors={[COLORS.accent]} />
        }
      >
        {/* PORTFOLIO VALUE CARD */}
        <View style={styles.valueCard}>
          <View style={styles.valueTop}>
            <Text style={styles.valueLabel}>{scrubbed ? scrubbed.date : 'Total Balance'}</Text>
            <Text style={styles.valueAmount} numberOfLines={1} adjustsFontSizeToFit>
              {scrubbed ? scrubbed.value : fmtFull(p.current_value)}
            </Text>
            {chartData.length > 1 && (
              <View style={styles.changeRow}>
                <Icon name={rangeUp ? '📈' : '📉'} size={16} color={rangeUp ? COLORS.profit : COLORS.loss} />
                <Text style={[styles.changeText, { color: rangeUp ? COLORS.profit : COLORS.loss }]}>
                  {rangeUp ? '+' : '-'}{Math.abs(rangePct).toFixed(2)}%
                </Text>
                <Text style={styles.changeLabel}>{RANGE_LABEL[range]}</Text>
              </View>
            )}
          </View>

          <GrowthChart data={chartData} onScrub={setScrub} />

          <View style={styles.rangeRow}>
            {RANGES.map(([key]) => (
              <Pressable
                key={key}
                onPress={() => setRange(key)}
                style={[styles.rangeChip, range === key && styles.rangeChipActive]}
              >
                <Text style={[styles.rangeText, range === key && styles.rangeTextActive]}>{key}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SUMMARY */}
        {holdings.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Summary</Text>
            </View>
            <OverviewRow label="Total invested" value={fmtFull(p.total_invested)} />
            <OverviewRow label="Current value" value={fmtFull(p.current_value)} />
            <OverviewRow label="Available cash" value={fmtFull(p.cash_balance)} />
            <OverviewRow label="Active stock value" value={fmtFull(p.active_stock_value)} />
            <OverviewRow label="P&L" value={(isUp ? '+' : '') + fmtFull(pnl)} valueColor={isUp ? COLORS.profit : COLORS.loss} />
            <OverviewRow label="Realized P&L" value={(Number(p.realized_profit_loss) >= 0 ? '+' : '') + fmtFull(p.realized_profit_loss)} valueColor={Number(p.realized_profit_loss) >= 0 ? COLORS.profit : COLORS.loss} />
            <OverviewRow label="Unrealized P&L" value={(Number(p.unrealized_profit_loss) >= 0 ? '+' : '') + fmtFull(p.unrealized_profit_loss)} valueColor={Number(p.unrealized_profit_loss) >= 0 ? COLORS.profit : COLORS.loss} />
            <OverviewRow label="Total dividends" value={fmtFull(p.total_dividends)} />
            <OverviewRow label="Total returns" value={(Number(p.total_returns) >= 0 ? '+' : '') + fmtFull(p.total_returns)} valueColor={Number(p.total_returns) >= 0 ? COLORS.profit : COLORS.loss} isLast />
          </View>
        )}

        {/* OVERVIEW */}
        {holdings.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Top Holdings</Text>
              <Pressable onPress={() => navigation.navigate('Investments')} hitSlop={8}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>

            <AllocationDonut
              slices={slices}
              label="Current value"
              value={fmtShort(p.current_value)}
            />

            <View style={styles.legendHeader}>
              <Text style={styles.legendHeaderText}>Holding</Text>
              <Text style={styles.legendHeaderText}>Current (Invested)</Text>
            </View>

            {slices.map((slice, i) => {
              const up = slice.pnl >= 0;
              return (
                <View key={`${slice.key}-${i}`} style={styles.legendRow}>
                  <View style={[styles.legendBar, { backgroundColor: slice.color }]} />
                  <View style={styles.legendMain}>
                    <Text style={styles.legendName} numberOfLines={1}>{slice.name}</Text>
                    <Text style={styles.legendSub}>{slice.sub}</Text>
                  </View>
                  <View style={styles.legendRight}>
                    <Text style={[styles.legendValue, { color: up ? COLORS.profit : COLORS.loss }]}>
                      {fmtFull(slice.value)}
                    </Text>
                    <Text style={styles.legendSub}>({fmtFull(slice.invested)})</Text>
                  </View>
                </View>
              );
            })}

          </View>
        )}

        {/* ASSET ALLOCATION */}
        {assets.length > 0 && (
          <Pressable style={styles.overviewCard} onPress={() => navigation.navigate('AssetStocks')}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Asset Allocation</Text>
            </View>
            <AllocationDonut slices={assets} half size={220} thickness={34} />
            {assets.map((a) => (
              <View key={a.key} style={styles.legendRow}>
                <View style={styles.legendMain}>
                  <Text style={styles.legendName} numberOfLines={1}>{a.name}</Text>
                  <Text style={styles.legendSub}>{a.sub}</Text>
                </View>
                <View style={styles.legendRight}>
                  <Text style={[styles.legendValue, a.invested != null && { color: a.up ? COLORS.profit : COLORS.loss }]}>
                    {fmtFull(a.value)}
                  </Text>
                  {a.invested != null && <Text style={styles.legendSub}>({fmtFull(a.invested)})</Text>}
                </View>
              </View>
            ))}
          </Pressable>
        )}

        {/* DIVIDENDS */}
        <Pressable style={styles.overviewCard} onPress={() => navigation.navigate('Dividends')}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Dividends</Text>
            <AppIcon name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.divTotal}>{fmtFull(p.total_dividends)}</Text>
          <Text style={styles.divSub}>
            {receivedSince ? `Received from ${receivedSince} till date` : 'No dividends received yet'}
          </Text>
          {quarters.length > 0 && <View style={{ marginTop: SPACING.xl }}>
            {quarters.map((q) => (
              <View key={q.key} style={styles.qRow}>
                <Text style={styles.qLabel}>{q.label}</Text>
                <View style={styles.qTrack}>
                  <View style={[styles.qBar, { width: `${Math.max((q.total / maxQuarter) * 100, 1.5)}%` }]} />
                </View>
                <Text style={styles.qAmount}>{fmtFull(q.total)}</Text>
              </View>
            ))}
          </View>}
        </Pressable>

        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

// Sub-components
const OverviewRow = ({ label, value, valueColor, isLast }) => (
  <>
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
    {!isLast && <View style={styles.overviewDivider} />}
  </>
);

function getMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Styles
const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Value card
  valueCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  valueTop: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  valueLabel: {
    ...TYPE.secondary,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  valueAmount: {
    ...TYPE.portfolioValue,
    color: COLORS.textPrimary,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  changeText: {
    ...TYPE.plPercent,
  },
  changeLabel: {
    ...TYPE.secondary,
    color: COLORS.textMuted,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  rangeChip: {
    minWidth: 48,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rangeChipActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  rangeText: {
    ...TYPE.secondaryMedium,
    color: COLORS.textMuted,
  },
  rangeTextActive: {
    color: COLORS.textPrimary,
  },

  // Share card
  // Section header

  // Holdings card

  // Holding details row

  // Allocation bar inside holdings

  // Empty state

  // Overview card
  overviewCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  overviewLabel: {
    ...TYPE.secondary,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  overviewValue: {
    ...TYPE.smallValue,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  overviewTitle: {
    ...TYPE.sectionTitle,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  viewAll: {
    ...TYPE.secondaryMedium,
    fontSize: TYPE.secondaryMedium.fontSize - 2,
    color: COLORS.accent,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  legendHeaderText: {
    ...TYPE.infoTitle,
    color: COLORS.textMuted,
  },
  divTotal: { ...TYPE.sectionTitle, fontSize: 28, color: COLORS.textPrimary },
  divSub: { ...TYPE.secondary, color: COLORS.textMuted, marginTop: SPACING.xs },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  qLabel: { ...TYPE.secondary, fontSize: 12, color: COLORS.textMuted, minWidth: 76 },
  qTrack: { flex: 1, marginHorizontal: SPACING.md },
  qBar: { height: 12, borderRadius: 4, backgroundColor: COLORS.accent },
  qAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary, minWidth: 84, textAlign: 'right' },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  legendBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  legendMain: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },
  legendName: {
    ...TYPE.cardTitle,
    fontSize: TYPE.cardTitle.fontSize - 2,
    color: COLORS.textPrimary,
  },
  legendSub: {
    ...TYPE.caption,
    fontSize: TYPE.caption.fontSize - 2,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  legendRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  legendValue: {
    ...TYPE.smallValue,
    fontSize: TYPE.smallValue.fontSize - 2,
  },

  // Allocation section
}));
