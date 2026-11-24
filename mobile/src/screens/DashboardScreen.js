/**
 * Dashboard Screen
 * Portfolio first. Flat dark surfaces with hairline borders, green and red only for gains and losses.
 */
import React, { useCallback, useState } from 'react';
import { shortName } from '../utils/names';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Dimensions, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { fmtFull, fmtShort } from '../utils/currency';
import { Button, Card, Chip, Divider, IconButton, ProgressBar } from 'react-native-paper';
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
// One blue for the biggest holding, then quieter blues and greys, so the chart does not read as a rainbow.
const CHART_COLORS = ['#4D6BFF', '#7C93FF', '#A9B8FF', '#64748B', '#8793A6', '#AAB4C3', '#C5CCD8', '#D9DEE6'];


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


  const totalVal = holdings.reduce((s, h) => s + (Number(h.current_value) || 0), 0) || 1;


  // Summary grid: three columns, signed values coloured for profit and loss.
  const pl = (v) => {
    const n = Number(v) || 0;
    return { value: (n >= 0 ? '+' : '') + fmtShort(n), color: n >= 0 ? COLORS.profit : COLORS.loss };
  };
  const summaryStats = [
    { label: 'Invested', value: fmtShort(p.total_invested) },
    { label: 'Current value', value: fmtShort(p.current_value) },
    { label: 'Cash', value: fmtShort(p.cash_balance) },
    { label: 'Stocks value', value: fmtShort(p.active_stock_value) },
    { label: 'P&L', ...pl(p.profit_loss) },
    { label: 'Total returns', ...pl(p.total_returns) },
    { label: 'Realized P&L', ...pl(p.realized_profit_loss) },
    { label: 'Unrealized P&L', ...pl(p.unrealized_profit_loss) },
    { label: 'Dividends', value: fmtShort(p.total_dividends) },
  ];

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
    name: shortName(h.name) || (h.symbol || '').replace('.NS', ''),
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
        scrollEnabled={!scrub}
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

          <GrowthChart data={chartData} height={120} onScrub={setScrub} />

          <View style={styles.rangeRow}>
            {RANGES.map(([key]) => (
              <Chip
                key={key}
                compact
                selected={range === key}
                showSelectedCheck={false}
                onPress={() => setRange(key)}
                style={[styles.rangeChipPaper, range === key && styles.rangeChipActive]}
                textStyle={[styles.rangeChipText, range === key && styles.rangeTextActive]}
              >
                {key}
              </Chip>
            ))}
          </View>
        </View>

        {/* SUMMARY */}
        {holdings.length > 0 && (
          <Card mode="outlined" style={styles.paperCard}>
            <View style={styles.statGrid}>
              {summaryStats.map((st, i) => (
                <View
                  key={st.label}
                  style={[
                    styles.statCell,
                    i % 3 !== 2 && styles.statCellRight,
                    i < summaryStats.length - 3 && styles.statCellBottom,
                  ]}
                >
                  <Text style={styles.statLabel} numberOfLines={1}>{st.label}</Text>
                  <Text
                    style={[styles.statValue, st.color && { color: st.color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {st.value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* OVERVIEW */}
        {holdings.length > 0 && (
          <Card mode="outlined" style={styles.paperCard}>
            <Card.Content style={styles.paperBody}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Top Holdings</Text>
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('Investments')}
                labelStyle={styles.viewAll}
              >
                View all
              </Button>
            </View>

            <AllocationDonut
              slices={slices}
              label="Current value"
              value={fmtShort(p.current_value)}
            />
            <Divider style={styles.divider} />


            {slices.map((slice, i) => (
              <View key={`${slice.key}-${i}`} style={styles.legendRow}>
                <View style={[styles.legendBar, styles.legendBarShort, { backgroundColor: slice.color }]} />
                <View style={styles.legendMain}>
                  <Text style={styles.legendName} numberOfLines={1}>{slice.name}</Text>
                </View>
                <Text style={styles.legendValue}>
                  {((slice.value / totalVal) * 100).toFixed(1)}%
                </Text>
              </View>
            ))}

            </Card.Content>
          </Card>
        )}

        {/* ASSET ALLOCATION */}
        {assets.length > 0 && (
          <Card mode="outlined" style={styles.paperCard} onPress={() => navigation.navigate('AssetStocks')}>
            <Card.Content style={styles.paperBody}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Asset Allocation</Text>
              <IconButton
                icon={() => <AppIcon name="chevron-forward" size={18} color={COLORS.textSecondary} />}
                size={20}
                style={styles.chevron}
                onPress={() => navigation.navigate('AssetStocks')}
              />
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
            </Card.Content>
          </Card>
        )}

        {/* DIVIDENDS */}
        <Card mode="outlined" style={[styles.paperCard, { marginBottom: SPACING.md }]} onPress={() => navigation.navigate('Dividends')}>
          <Card.Content style={styles.paperBody}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Dividends</Text>
            <IconButton
              icon={() => <AppIcon name="chevron-forward" size={18} color={COLORS.textSecondary} />}
              size={20}
              style={styles.chevron}
              onPress={() => navigation.navigate('Dividends')}
            />
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
                  <ProgressBar
                    progress={Math.max(q.total / maxQuarter, 0.015)}
                    color={COLORS.accent}
                    style={styles.qBar}
                  />
                </View>
                <Text style={styles.qAmount}>{fmtFull(q.total)}</Text>
              </View>
            ))}
          </View>}
          </Card.Content>
        </Card>

        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

// Sub-components
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
  rangeChipActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
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
  paperCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  paperBody: { padding: SPACING.xl },
  rangeChipPaper: { backgroundColor: 'transparent', borderColor: 'transparent' },
  rangeChipText: { ...TYPE.secondaryMedium, color: COLORS.textMuted, marginHorizontal: SPACING.sm },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statCell: { width: '33.333%', padding: SPACING.md },
  statCellRight: { borderRightWidth: 1, borderRightColor: COLORS.border },
  statCellBottom: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statLabel: { ...TYPE.secondary, fontSize: 12, color: COLORS.textMuted },
  statValue: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary, marginTop: SPACING.xs },
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
  divTotal: { ...TYPE.sectionTitle, fontSize: 28, color: COLORS.textPrimary },
  divSub: { ...TYPE.secondary, fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.xs },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  qLabel: { ...TYPE.secondary, fontSize: 12, color: COLORS.textMuted, minWidth: 76 },
  qTrack: { flex: 1, marginHorizontal: SPACING.md },
  qBar: { height: 12, borderRadius: 6, backgroundColor: COLORS.surface },
  divider: { marginVertical: SPACING.xl, backgroundColor: COLORS.border },
  chevron: { margin: 0 },
  qAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary, minWidth: 84, textAlign: 'right' },
  legendBarShort: { height: 16 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
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
    color: COLORS.textPrimary,
  },

  // Allocation section
}));
