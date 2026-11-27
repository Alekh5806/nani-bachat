import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AppState, Text, TextInput, View, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowDown2, SearchNormal1 } from 'iconsax-react-native';

import { usePortfolioStore } from '../store/portfolioStore';
import { COLORS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { hasNumber, money, percent, returnRate, returnText } from '../utils/stockDisplay';
import { DialogCard } from './DialogCard';
import { StockRow } from './StockRow';
import { StockAction, StockOverview, StockPriceStatus, StockState, StocksSkeleton, stockReturnColor, stockStyles } from './StocksUI';

const SORTS = [
  ['value', 'Current value', 'current_value'],
  ['rate', 'Return %', 'profit_loss_percentage'],
  ['return', 'Return amount', 'profit_loss'],
  ['company', 'Company name', 'name'],
];

export const useStockPrices = (isAdmin) => {
  const { fetchStockSummary, refreshPrices, holdingsLoading, holdingsFailed } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailure, setRefreshFailure] = useState(null);
  const manuallyRefreshing = useRef(false);

  useFocusEffect(useCallback(() => {
    const refresh = () => {
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
          !manuallyRefreshing.current && !usePortfolioStore.getState().holdingsLoading) fetchStockSummary();
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [fetchStockSummary]));

  const refresh = async () => {
    if (manuallyRefreshing.current || holdingsLoading) return;
    manuallyRefreshing.current = true;
    setRefreshing(true);
    setRefreshFailure(null);
    try {
      if (isAdmin && usePortfolioStore.getState().stockSummary?.stocks?.length) {
        const result = await refreshPrices();
        if (!result.success) {
          setRefreshFailure(result.message || 'Could not refresh prices. Last available values are shown.');
        }
      } else {
        await fetchStockSummary();
      }
    } finally {
      manuallyRefreshing.current = false;
      setRefreshing(false);
    }
  };

  return {
    refresh, refreshing, checking: holdingsLoading || refreshing,
    failure: refreshFailure || (holdingsFailed ? 'Could not refresh holdings. Last available values are shown.' : null),
  };
};

export const StockHoldings = ({ summary, failed, prices, onOpen, onAdd, onNews, allocation, portfolio }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(SORTS[0]);
  const [chooseSort, setChooseSort] = useState(false);
  const [sectionWidth, setSectionWidth] = useState(0);
  const { fontScale } = useWindowDimensions();

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (summary?.stocks || []).filter(({ name, symbol }) =>
      !term || name?.toLowerCase().includes(term) || symbol?.toLowerCase().includes(term));
    const field = sort[2];
    const byName = (a, b) => (a.name || a.symbol).localeCompare(b.name || b.symbol);
    return matches.sort((a, b) => field === 'name'
      ? byName(a, b)
      : (hasNumber(b[field]) ? Number(b[field]) : -Infinity) -
        (hasNumber(a[field]) ? Number(a[field]) : -Infinity) || byName(a, b));
  }, [query, sort, summary]);

  if (!summary) {
    return failed
      ? <StockState title="Couldn’t load holdings" description="Try again to load the group’s stocks." action="Retry" onPress={prices.refresh} />
      : <StocksSkeleton />;
  }

  const holdings = summary.stocks || [];
  if (!holdings.length) {
    return (
      <StockState
        title={failed ? 'Couldn’t refresh holdings' : 'No stock holdings'}
        description={failed ? 'The last saved list was empty.' : 'Open positions appear here after a purchase is recorded.'}
        action={failed ? 'Retry' : onAdd ? 'Record purchase' : undefined}
        onPress={failed ? prices.refresh : onAdd}
      />
    );
  }

  const current = summary.total_current_value;
  const invested = summary.total_invested;
  const pnl = summary.total_profit_loss;
  const daily = summary.total_day_change;
  const comparableDay = hasNumber(daily) && holdings.every((holding) => holding.quote_at);
  const portfolioValue = [current, portfolio?.cash_balance, portfolio?.total_dividends].every(hasNumber)
    ? Number(current) + Number(portfolio.cash_balance) + Number(portfolio.total_dividends)
    : null;
  const metrics = [
    { label: 'Invested amount', value: money(invested) },
    { label: 'Unrealized return', value: returnText(pnl, returnRate(pnl, invested)), color: stockReturnColor(pnl) },
    allocation
      ? { label: 'Share of total portfolio', value: percent(returnRate(current, portfolioValue), 1) }
      : {
          label: 'Last session change',
          value: comparableDay ? returnText(daily, returnRate(daily, Number(current) - Number(daily))) : 'Unavailable',
          color: comparableDay ? stockReturnColor(daily) : undefined,
        },
  ];
  const stacked = sectionWidth < 400 * Math.max(1, fontScale);
  return (
    <>
      <StockOverview
        label="Current stock value"
        value={money(current)}
        rows={metrics}
        description="Unrealized return is the value of shares still held minus their invested cost, including purchase brokerage. Last session change compares their latest quotes with the previous close. It is available when all holdings have comparable quotes. Sales and dividends are tracked separately."
      >
        <StockPriceStatus holdings={holdings} onRefresh={prices.refresh} refreshing={prices.checking} failure={prices.failure} />
      </StockOverview>
      <View style={stockStyles.section} onLayout={({ nativeEvent }) => setSectionWidth(nativeEvent.layout.width)}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={stockStyles.heading}>Holdings ({holdings.length})</Text>
          {!!onNews && <StockAction label="Stock news" onPress={onNews} />}
        </View>
        <View style={[styles.controls, stacked && styles.stacked]}>
          <View style={styles.searchBox}>
            <SearchNormal1 size={17} color={COLORS.textSecondary} />
            <TextInput
              accessibilityLabel="Search holdings"
              placeholder="Search name or symbol"
              keyboardAppearance={COLORS.isDark ? 'dark' : 'light'}
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.search}
            />
            {!!query && <StockAction label="Clear" onPress={() => setQuery('')} />}
          </View>
          <View style={styles.sort}>
            <StockAction label={`Sort: ${sort[1]}`} icon={<ArrowDown2 size={14} color={COLORS.textPrimary} />} onPress={() => setChooseSort(true)} />
          </View>
        </View>
        {visible.length ? (
          <View style={stockStyles.grouped}>
            {visible.map((stock, i) => (
              <StockRow
                key={stock.symbol}
                stock={stock}
                onPress={() => onOpen(stock)}
                allocation={allocation}
                stockTotal={Number(current)}
                separated={i > 0}
              />
            ))}
          </View>
        ) : (
          <StockState title="No matching holdings" description={`No stock names or symbols match “${query.trim()}”.`}
            action="Clear search" onPress={() => setQuery('')} />
        )}
      </View>
      <DialogCard visible={chooseSort} title="Sort holdings" onDismiss={() => setChooseSort(false)}>
        <View style={styles.choices}>
          {SORTS.map((item) => (
            <Pressable key={item[0]} accessibilityRole="radio" accessibilityState={{ checked: item[0] === sort[0] }}
              onPress={() => { setSort(item); setChooseSort(false); }}
              style={({ pressed }) => [styles.option, pressed && stockStyles.pressed]}>
              <Text style={styles.optionLabel}>{item[1]}</Text>
              {item[0] === sort[0] && <Text style={stockStyles.value}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </DialogCard>
    </>
  );
};

const styles = themedStyles(() => ({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  searchBox: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md,
    minHeight: 48, backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, borderWidth: 1, borderRadius: 10,
  },
  search: { ...TYPE.inputText, flex: 1, minWidth: 0, minHeight: 46, color: COLORS.textPrimary },
  sort: { backgroundColor: COLORS.surface, borderRadius: 10 },
  choices: { marginTop: SPACING.md },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, minHeight: 48 },
  optionLabel: { ...TYPE.body, flexShrink: 1, color: COLORS.textPrimary },
}));
