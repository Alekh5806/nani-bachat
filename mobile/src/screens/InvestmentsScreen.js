/**
 * Investments Screen
 * Shows all stock holdings with summary and admin add functionality
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Platform
} from 'react-native';
import { Refresh2, Add } from 'iconsax-react-native';
import { fmtFull } from '../utils/currency';
import { SummaryCard } from '../components/SummaryCard';
import { useFocusEffect } from '@react-navigation/native';

import Toast from 'react-native-toast-message';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { StockRow } from '../components/StockRow';
import { SectionHeader } from '../components/SectionHeader';
import { NseQuotePreview } from '../components/NseQuotePreview';
import { shortName } from '../utils/names';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { usePersistedState } from '../utils/usePersistedState';
import { TabBarSpacer } from '../components/TabBarSpacer';

const PRICE_REFRESH_INTERVAL_MS = 60000;

export const InvestmentsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const {
    stockSummary, fetchStockSummary,
    stocks, fetchStocks,
    soldStocks, fetchSoldStocks,
    dashboard, fetchDashboard,
    refreshPrices,
  } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = usePersistedState('tab:invest', 'holdings', ['holdings', 'history']);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Each tab loads only what it shows, so the screen stays light.
  useFocusEffect(
    useCallback(() => {
      fetchStockSummary();
      fetchSoldStocks();
      fetchDashboard();
      if (tab === 'history') fetchStocks();
      const intervalId = setInterval(fetchStockSummary, PRICE_REFRESH_INTERVAL_MS);
      return () => clearInterval(intervalId);
    }, [tab, fetchStockSummary, fetchStocks, fetchSoldStocks, fetchDashboard])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStockSummary(),
      fetchStocks(),
      fetchSoldStocks(),
      fetchDashboard(),
    ]);
    setRefreshing(false);
  }, [fetchStockSummary, fetchStocks, fetchSoldStocks, fetchDashboard]);

  const isAdmin = user?.role === 'admin';

  const handleRefreshPrices = async () => {
    setPricesLoading(true);
    const result = await refreshPrices();
    setPricesLoading(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Prices Updated', text2: result.message || 'Latest market prices loaded' });
    } else {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: result.error || 'Could not refresh prices' });
    }
  };

  const summary = stockSummary || {};
  const totalPL = Number(summary.total_profit_loss) || 0;
  const totalPct = summary.total_invested > 0 ? (totalPL / summary.total_invested) * 100 : 0;
  const dayChange = Number(summary.total_day_change) || 0;
  const currentValue = Number(summary.total_current_value) || 0;
  const dayPct = currentValue - dayChange > 0 ? (dayChange / (currentValue - dayChange)) * 100 : 0;
  const plColor = (n) => (n === 0 ? COLORS.neutral : n > 0 ? COLORS.profit : COLORS.loss);
  const signed = (n) => (n > 0 ? '+' : '');

  // Realized figures come from the portfolio service, which is the same source
  // the dashboard uses — so the two screens can never disagree.
  const realizedPL = Number(dashboard?.portfolio?.realized_profit_loss) || 0;
  const realizedProceeds = Number(dashboard?.portfolio?.realized_sale_value) || 0;
  const realizedInvested = realizedProceeds - realizedPL;
  const realizedPct = realizedInvested > 0 ? (realizedPL / realizedInvested) * 100 : 0;

  const formatMoney = (value) =>
    `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sortedSold = soldStocks;
  const history = [
    ...stocks.map((item) => ({ type: 'buy', item, date: item.buy_date })),
    ...soldStocks.map((item) => ({ type: 'sell', item, date: item.sell_date })),
  ].sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Investments"
        subtitle={`${summary.total_stocks || 0} holdings`}
        rightAction={isAdmin ? () => navigation.navigate('AddStock') : undefined}
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
        {/* ── Tabs: only the active one is rendered ── */}
        <View style={styles.tabs}>
          {[['holdings', 'Holdings'], ['history', 'History']].map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Holdings summary (Holdings tab) ── */}
        {tab === 'holdings' && (
          <SummaryCard
            label={`Holdings (${summary.total_stocks || 0})`}
            value={`₹${currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            action={isAdmin ? {
              icon: <Refresh2 size={18} color={COLORS.textPrimary} />,
              onPress: handleRefreshPrices,
              loading: pricesLoading,
              label: 'Refresh stock prices',
            } : undefined}
            rows={[
              { label: '1D returns', value: `${signed(dayChange)}${fmtFull(dayChange)} (${signed(dayPct)}${dayPct.toFixed(2)}%)`, color: plColor(dayChange) },
              { label: 'Total returns', value: `${signed(totalPL)}${fmtFull(totalPL)} (${signed(totalPL)}${totalPct.toFixed(2)}%)`, color: plColor(totalPL) },
              { label: 'Invested', value: formatMoney(summary.total_invested) },
            ]}
          />
        )}

        {/* ── Realized P/L (booked profit from sold holdings) ── */}
        {tab === 'history' && sortedSold.length > 0 && (
          <SummaryCard
            label="Realized P/L"
            value={`${signed(realizedPL)}${fmtFull(realizedPL)}`}
            valueColor={plColor(realizedPL)}
            rows={[
              ...(realizedInvested > 0
                ? [{ label: 'Return', value: `${signed(realizedPct)}${realizedPct.toFixed(2)}%`, color: plColor(realizedPL) }]
                : []),
              { label: 'Net sale proceeds', value: fmtFull(realizedProceeds) },
              { label: 'Cost', value: fmtFull(realizedInvested) },
            ]}
            note="Booked profit is already counted in available cash."
          />
        )}


        {/* ── Stock Holdings ── */}
        {tab === 'holdings' && (
          <>
            <SectionHeader title="All Holdings" actionLabel="Group stock news"
              onAction={() => navigation.navigate('StockNews')} />
            {Platform.OS !== 'web' && <NseQuotePreview holdings={summary.stocks || []} />}
          </>
        )}
        {tab === 'holdings' && (stockSummary?.stocks || []).map((stock, index) => (
          <StockRow
            key={`${stock.symbol || 'stock'}-${index}`}
            stock={stock}
            onPress={() => navigation.navigate('HoldingDetail', { holding: stock })}
          />
        ))}

        {/* ── Investment History (buys and sells, newest first) ── */}
        {tab === 'history' && history.length === 0 && <Text style={styles.realizedNote}>No transactions yet</Text>}
        {tab === 'history' && history.map((tx) => {
          const isBuy = tx.type === 'buy';
          return (
            <Pressable
              key={`${tx.type}-${tx.item.id}`}
              onPress={() => navigation.navigate('HoldingDetail', { holding: { symbol: tx.item.symbol, name: tx.item.name } })}
              style={({ pressed }) => [pressed && styles.txActionPressed]}
            >
              <View style={styles.txCard}>
                <CompanyLogo symbol={tx.item.symbol} name={tx.item.name} size={40} />
                <View style={styles.txMain}>
                  <Text style={styles.txName} numberOfLines={1}>{shortName(tx.item.name)}</Text>
                  <Text style={styles.txSub} numberOfLines={1}>
                    {tx.item.quantity} shares  •  {isBuy ? '' : 'Sold at '}₹{Number(isBuy ? tx.item.buy_price : tx.item.sell_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {'  •  '}{tx.item.buyer_name || 'Not recorded'}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount} numberOfLines={1}>
                    {formatMoney(isBuy ? tx.item.total_invested : tx.item.current_value)}
                  </Text>
                  <Text style={styles.txSub}>{formatDate(tx.date)}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

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
    paddingHorizontal: SPACING.lg,
    paddingBottom: 0,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: SPACING.md },
  tab: { paddingVertical: SPACING.md, marginRight: SPACING.xl, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.textPrimary },
  tabText: { ...TYPE.body, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.textPrimary },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  halfCard: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
  },

  // ── Sold holdings ──
  realizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  realizedItem: {
    flex: 1,
    alignItems: 'center',
  },
  realizedDivider: {
    width: 1,
    height: 34,
    backgroundColor: COLORS.border,
  },
  realizedLabel: {
    ...TYPE.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  realizedValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
  },
  realizedNote: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleText: {
    ...TYPE.button,
    color: COLORS.accent,
  },
  saleCard: {
    marginBottom: SPACING.md,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  saleTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },
  saleName: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  saleSymbol: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  salePnlBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  salePnlText: {
    ...TYPE.plPercent,
  },
  tradeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBgAlt,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tradeLeg: {
    flex: 1,
    alignItems: 'center',
  },
  tradeLegLabel: {
    ...TYPE.captionMedium,
    color: COLORS.textMuted,
  },
  tradeLegPrice: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  tradeLegDate: {
    ...TYPE.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tradeArrow: {
    fontSize: FONTS.lg,
    color: COLORS.accent,
    paddingHorizontal: SPACING.sm,
  },
  salePnlRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  salePnlLabel: {
    ...TYPE.secondaryMedium,
    color: COLORS.textPrimary,
  },
  salePnlValue: {
    ...TYPE.plAmount,
  },
  saleNote: { ...TYPE.secondary, color: COLORS.textSecondary, marginTop: SPACING.sm },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.sm,
  },
  saleFooterText: {
    ...TYPE.caption,
    color: COLORS.textMuted,
  },
  txDetails: {
    gap: 4,
  },
  txDetail: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
  },
  txTotal: {
    ...TYPE.smallValue,
    marginTop: SPACING.xs,
  },
  txActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  txActionButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
  },
  txDeleteButton: {
    borderColor: COLORS.loss,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  txMain: { flex: 1, minWidth: 0, marginHorizontal: SPACING.md },
  txName: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  txSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  txRight: { alignItems: 'flex-end', flexShrink: 0, maxWidth: 132 },
  txAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary },
  txActionPressed: {
    opacity: 0.75,
  },
  txActionText: {
    ...TYPE.button,
    color: COLORS.accent,
  },
  txDeleteText: {
    color: COLORS.loss,
  },
}));
