import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Refresh2, Wallet3 } from 'iconsax-react-native';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { AllocationDonut } from '../components/AllocationDonut';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { PortfolioHistory } from '../components/PortfolioHistory';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { fmtFull, fmtShort } from '../utils/currency';
import { shortName } from '../utils/names';
import { dividendQuarters, todayInClub } from '../utils/portfolioHistory';

const PRICE_REFRESH_MS = 60000;
// The smaller of the two columns needs at least 360 points at the default text size.
const MIN_COLUMNS_WIDTH = 360 * (1.2 + 1) + SPACING.lg;
const SIDE_EDGES = ['left', 'right'];
const CHART_COLORS = ['#4D6BFF', '#7C93FF', '#A9B8FF', '#64748B', '#8793A6', '#C5CCD8'];
const hasAmount = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const money = (value) => hasAmount(value) ? fmtFull(value) : '—';
const signedMoney = (value) => (Number(value) > 0 ? '+' : '') + money(value);
const returnColor = (value) => value > 0 ? COLORS.profit : value < 0 ? COLORS.loss : COLORS.textSecondary;

function CardHeading({ title, action, onPress }) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {action && <Pressable accessibilityRole="button" onPress={onPress}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={styles.linkText}>{action}</Text>
      </Pressable>}
    </View>
  );
}

function AmountRow({ label, value, color, swatch }) {
  return (
    <View style={styles.amountRow}>
      <View style={styles.rowLabel}>
        {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <Text style={[styles.amount, color && { color }]}>{value}</Text>
    </View>
  );
}

function BalanceBreakdown({ portfolio: p, onStocks }) {
  const balances = [
    { label: 'Stock holdings', value: p.active_stock_value, color: COLORS.accent },
    { label: 'Club cash', value: p.cash_balance, color: COLORS.neutral },
    { label: 'Dividends', value: p.total_dividends, color: CHART_COLORS[2] },
  ];
  // A signed balance cannot be represented as a slice of a positive whole.
  const showBar = balances.every((b) => hasAmount(b.value) && b.value >= 0) && balances.some((b) => b.value > 0);
  return (
    <View style={styles.card}>
      <CardHeading title="Balance Breakdown" action="View stocks" onPress={onStocks} />
      {showBar && <View style={styles.allocationBar}>
        {balances.filter((b) => b.value > 0).map((b) => (
          <View key={b.label} style={{ flex: Number(b.value), backgroundColor: b.color }} />
        ))}
      </View>}
      {balances.map((b) => <AmountRow key={b.label} label={b.label} value={money(b.value)} swatch={showBar && b.color} />)}
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.title}>Return Breakdown</Text>
      {[
        ['Realized stock P&L', p.realized_profit_loss], ['Unrealized stock P&L', p.unrealized_profit_loss],
        ['Dividend income', p.total_dividends],
      ].map(([label, value]) => <AmountRow key={label} label={label} value={signedMoney(value)} color={returnColor(value)} />)}
    </View>
  );
}

function HoldingsCard({ summary, failed, onOpen }) {
  const { fontScale } = useWindowDimensions();
  const holdings = [...(summary?.stocks || [])].sort((a, b) => Number(b.current_value) - Number(a.current_value));
  const total = holdings.reduce((sum, h) => sum + Math.round(Number(h.current_value) * 100), 0) / 100;
  const slices = holdings.slice(0, 5).map((h, i) => ({
    label: shortName(h.name) || h.symbol, key: h.symbol, value: Number(h.current_value), color: CHART_COLORS[i],
  }));
  if (holdings.length > 5) {
    const rest = holdings.slice(5);
    slices.push({
      key: 'other-holdings', label: 'Other holdings (' + rest.length + ')',
      value: rest.reduce((sum, h) => sum + Math.round(Number(h.current_value) * 100), 0) / 100,
      color: CHART_COLORS[5],
    });
  }
  return (
    <View style={styles.card}>
      <CardHeading title="Top Holdings" action="View investments" onPress={onOpen} />
      {failed && <Text style={styles.notice}>{summary ? 'Showing saved holdings.' : 'Holdings couldn’t load. Refresh to retry.'}</Text>}
      {summary ? holdings.length ? <View style={styles.holdingsLayout}>
        {total > 0 && <View style={styles.ring}>
          <AllocationDonut slices={slices} size={164} thickness={22} label="Stock value" value={fmtShort(total)} />
        </View>}
        <View style={[styles.holdingsList, { flexBasis: 240 * Math.max(1, fontScale) }]}>{slices.map((s) => <AmountRow key={s.key} label={s.label} swatch={s.color}
          value={total > 0 ? (s.value / total * 100).toFixed(1) + '%' : fmtFull(s.value)} />)}</View>
      </View> : <Text style={styles.empty}>No stocks are currently held.</Text>
        : !failed && <Text style={styles.empty}>Loading holdings…</Text>}
    </View>
  );
}

function DividendsCard({ total, dividends, loaded, failed, today, onOpen }) {
  const quarters = dividendQuarters(dividends, today);
  const peak = Math.max(...quarters.map((q) => q.total));
  return (
    <View style={styles.card}>
      <CardHeading title="Dividends" action="View history" onPress={onOpen} />
      <Text style={styles.caption}>All-time dividend income</Text>
      <Text style={styles.sectionValue}>{money(total)}</Text>
      {failed && <Text style={styles.notice}>{loaded ? 'Showing saved dividend history.' : 'Dividend history couldn’t load. Refresh to retry.'}</Text>}
      {loaded ? dividends.length ? <>
        <View style={styles.divider} />
        <Text style={styles.caption}>Last four quarters · by ex-dividend date</Text>
        {quarters.map((q) => (
          <View key={q.label} style={styles.quarter}>
            <AmountRow label={q.label} value={fmtFull(q.total)} />
            <View style={styles.track}>
              {q.total > 0 && <View style={[styles.fill, { width: (q.total / peak * 100) + '%' }]} />}
            </View>
          </View>
        ))}
      </> : <Text style={styles.empty}>No dividends recorded yet.</Text>
        : !failed && <Text style={styles.empty}>Loading dividend history…</Text>}
    </View>
  );
}

function PortfolioValueCard({ dashboard, refreshing, refresh, today, refreshKey }) {
  const p = dashboard.portfolio;
  const gain = p.profit_loss;
  const pct = Number(p.growth_percentage);
  return (
    <View style={styles.card}>
      <View style={styles.heroHeading}>
        <View style={styles.heroLabel}>
          <Wallet3 size={18} color={COLORS.textSecondary} />
          <Text style={styles.caption}>Club portfolio value</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh portfolio"
          accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing}
          onPress={refresh} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
          {refreshing ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Refresh2 size={18} color={COLORS.textPrimary} />}
        </Pressable>
      </View>
      <Text style={styles.heroValue} selectable>{money(p.current_value)}</Text>
      <View style={styles.heroStats}>
        <View style={styles.metric}>
          <Text style={styles.caption}>Invested capital</Text>
          <Text style={styles.metricValue}>{money(p.total_invested)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.caption}>All-time return</Text>
          <Text style={[styles.metricValue, { color: returnColor(gain) }]}>{signedMoney(gain)}</Text>
          {Number(p.total_invested) > 0 && hasAmount(p.growth_percentage) && <Text style={[styles.caption, { color: returnColor(gain) }]}>
            {(pct > 0 ? '+' : '') + pct.toFixed(2) + '%'}
          </Text>}
        </View>
      </View>
      <PortfolioHistory recent={dashboard.growth_data} today={today} refreshKey={refreshKey} />
    </View>
  );
}

export function DashboardScreen({ navigation }) {
  const { fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const wide = contentWidth >= MIN_COLUMNS_WIDTH * Math.max(1, fontScale);
  const { dashboard, stockSummary, dividends, dividendsLoaded, holdingsFailed, dividendsFailed, error, isLoading,
    fetchDashboard, fetchStockSummary, fetchDividends } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const inFlight = useRef(null);

  const load = useCallback((includeDividends) => {
    const requests = [fetchDashboard(), fetchStockSummary()];
    if (includeDividends) requests.push(fetchDividends());
    const pending = Promise.all(requests).finally(() => {
      if (inFlight.current === pending) inFlight.current = null;
    });
    inFlight.current = pending;
    return pending;
  }, [fetchDashboard, fetchStockSummary, fetchDividends]);

  useFocusEffect(useCallback(() => {
    load(true);
    const timer = setInterval(() => { if (!inFlight.current) load(false); }, PRICE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    setRefreshKey((n) => n + 1);
    await load(true);
    setRefreshing(false);
  };

  const today = todayInClub();
  const month = new Date(today).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const header = <View style={styles.frame}><ScreenHeader title="Portfolio" subtitle={month} /></View>;
  if (!dashboard?.portfolio) {
    return (
      <SafeAreaView edges={SIDE_EDGES} style={styles.container}>
        {header}
        {error && !isLoading ? (
          <View style={[styles.frame, styles.errorCard]}>
            <Text style={styles.title}>Portfolio couldn’t load</Text>
            <Text style={styles.empty}>Check your connection and try again.</Text>
            <Pressable accessibilityRole="button" onPress={refresh} style={styles.retry}>
              <Text style={styles.linkText}>Try again</Text>
            </Pressable>
          </View>
        ) : <View style={styles.frame}><DashboardSkeleton /></View>}
      </SafeAreaView>
    );
  }

  const overview = <PortfolioValueCard dashboard={dashboard} refreshing={refreshing} refresh={refresh}
    today={today} refreshKey={refreshKey} />;
  const breakdown = <BalanceBreakdown portfolio={dashboard.portfolio} onStocks={() => navigation.navigate('AssetStocks')} />;
  const holdings = <HoldingsCard summary={stockSummary} failed={holdingsFailed}
    onOpen={() => navigation.navigate('Investments', { screen: 'InvestmentsHome' })} />;
  const income = <DividendsCard total={dashboard.portfolio.total_dividends} dividends={dividends} loaded={dividendsLoaded}
    failed={dividendsFailed} today={today} onOpen={() => navigation.navigate('Dividends', { screen: 'DividendsHome' })} />;

  return (
    <SafeAreaView edges={SIDE_EDGES} style={styles.container}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />}>
        {error && <Text accessibilityLiveRegion="polite" style={styles.notice}>Couldn’t update the portfolio. Showing the last saved balance.</Text>}
        <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
          style={[styles.group, wide && styles.columns]}>
          <View style={[styles.group, wide && styles.primaryColumn]}>
            {overview}
            {wide ? holdings : breakdown}
          </View>
          <View style={[styles.group, wide && styles.secondaryColumn]}>
            {wide ? breakdown : holdings}
            {income}
          </View>
        </View>
        <TabBarSpacer />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  frame: { width: '100%', maxWidth: 1060, alignSelf: 'center' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 1060, alignSelf: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.lg },
  group: { gap: SPACING.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  primaryColumn: { flex: 1.2, minWidth: 0 },
  secondaryColumn: { flex: 1, minWidth: 0 },
  card: { backgroundColor: COLORS.cardBg, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.xl },
  heading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: SPACING.sm, marginBottom: SPACING.sm },
  title: { ...TYPE.cardTitle, maxWidth: '100%', color: COLORS.textPrimary },
  caption: { ...TYPE.secondary, color: COLORS.textSecondary },
  link: { maxWidth: '100%', minHeight: 44, justifyContent: 'center' },
  linkText: { ...TYPE.button, color: COLORS.isDark ? CHART_COLORS[1] : COLORS.accent },
  pressed: { opacity: 0.65 },
  heroHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  refresh: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.surface },
  heroValue: { ...TYPE.portfolioValue, color: COLORS.textPrimary, marginVertical: SPACING.sm, fontVariant: ['tabular-nums'] },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md },
  metric: { flexGrow: 1, flexShrink: 1, minWidth: 120, maxWidth: '100%', gap: SPACING.xs },
  metricValue: { ...TYPE.cardTitle, color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
  sectionValue: { ...TYPE.portfolioValue, color: COLORS.textPrimary, marginTop: SPACING.xs },
  rowLabel: { flexShrink: 1, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowText: { ...TYPE.body, color: COLORS.textSecondary, flexShrink: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: SPACING.sm, rowGap: SPACING.xs, paddingVertical: SPACING.sm },
  amount: { ...TYPE.smallValue, maxWidth: '100%', color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  allocationBar: { flexDirection: 'row', height: 12, overflow: 'hidden', borderRadius: RADIUS.sm, marginBottom: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  holdingsLayout: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: SPACING.lg },
  holdingsList: { flexGrow: 1, flexShrink: 1, maxWidth: '100%', minWidth: 0 },
  ring: { maxWidth: '100%', paddingVertical: SPACING.md },
  quarter: { paddingVertical: SPACING.xs },
  track: { backgroundColor: COLORS.surface, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  notice: { ...TYPE.secondaryMedium, color: COLORS.textPrimary, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  empty: { ...TYPE.secondary, color: COLORS.textSecondary, paddingVertical: SPACING.md },
  errorCard: { padding: SPACING.xl },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
}));
