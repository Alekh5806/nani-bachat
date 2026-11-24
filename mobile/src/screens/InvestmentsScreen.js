/**
 * Investments Screen
 * Shows all stock holdings with summary and admin add functionality
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Alert } from '../utils/alert';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { StockRow } from '../components/StockRow';
import { GlassCard } from '../components/GlassCard';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';
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
  const [tab, setTab] = useState('holdings');

  // Each tab loads only what it shows, so the screen stays light.
  useFocusEffect(
    useCallback(() => {
      fetchStockSummary();
      if (tab === 'history') {
        fetchStocks();
        fetchSoldStocks();
        fetchDashboard();
      }
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
    const result = await refreshPrices();
    if (result.success) {
      Alert.alert('Prices Updated', result.message || 'All stock prices have been refreshed with latest market data.');
    } else {
      Alert.alert('Update Failed', result.error || 'Could not refresh prices. Please try again.');
    }
  };

  const summary = stockSummary || {};
  const totalPL = Number(summary.total_profit_loss) || 0;
  const totalPct = summary.total_invested > 0 ? (totalPL / summary.total_invested) * 100 : 0;

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
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current Value</Text>
          <Text style={styles.summaryBig}>{formatMoney(summary.total_current_value)}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Total returns</Text>
            <Text style={[styles.summaryRowValue, { color: totalPL === 0 ? COLORS.neutral : totalPL > 0 ? COLORS.profit : COLORS.loss }]}>
              {totalPL >= 0 ? '+' : ''}{formatMoney(totalPL)} ({totalPL >= 0 ? '+' : ''}{totalPct.toFixed(2)}%)
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Invested</Text>
            <Text style={styles.summaryRowValue}>{formatMoney(summary.total_invested)}</Text>
          </View>
        </GlassCard>

        {/* ── Tabs: only the active one is rendered ── */}
        <View style={styles.tabs}>
          {[['holdings', 'Holdings'], ['history', 'History']].map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Admin Actions ── */}
        {isAdmin && (
          <GlassCard style={styles.adminActions}>
            <Text
              style={styles.adminAction}
              onPress={handleRefreshPrices}
            >
              Refresh stock prices
            </Text>
          </GlassCard>
        )}

        {/* ── Stock Holdings ── */}
        {tab === 'holdings' && (stockSummary?.stocks || []).map((stock, index) => (
          <StockRow
            key={`${stock.symbol || 'stock'}-${index}`}
            stock={stock}
            onPress={() => navigation.navigate('HoldingDetail', { holding: stock })}
          />
        ))}

        {/* ── Investment History (buys and sells, newest first) ── */}
        {tab === 'history' && sortedSold.length > 0 && (
          <GlassCard style={styles.realizedCard}>
            <View style={styles.realizedTotalRow}>
              <Text style={styles.realizedTotalLabel}>Realized P/L</Text>
              <Text
                style={[
                  styles.realizedTotalValue,
                  { color: realizedPL >= 0 ? COLORS.profit : COLORS.loss },
                ]}
              >
                {realizedPL >= 0 ? '+' : ''}{formatMoney(realizedPL)}
                {realizedInvested > 0 ? `  (${realizedPct >= 0 ? '+' : ''}${realizedPct.toFixed(2)}%)` : ''}
              </Text>
            </View>
            <Text style={styles.realizedNote}>
              Net sale proceeds {formatMoney(realizedProceeds)} on a cost of {formatMoney(realizedInvested)}.
              Booked profit is already counted in available cash.
            </Text>
          </GlassCard>
        )}
        {tab === 'history' && history.length === 0 && <Text style={styles.realizedNote}>No transactions yet</Text>}
        {tab === 'history' && history.map((tx) => {
          const isBuy = tx.type === 'buy';
          const pnl = Number(tx.item.profit_loss) || 0;
          return (
            <Pressable
              key={`${tx.type}-${tx.item.id}`}
              onPress={() => navigation.navigate('HoldingDetail', { holding: { symbol: tx.item.symbol, name: tx.item.name } })}
              style={({ pressed }) => [pressed && styles.txActionPressed]}
            >
              <GlassCard style={styles.txCard}>
                <View style={styles.txHeader}>
                  <CompanyLogo symbol={tx.item.symbol} name={tx.item.name} size={36} style={{ marginRight: SPACING.md }} />
                  <View style={styles.txTitleBlock}>
                    <Text style={styles.txName} numberOfLines={1}>{tx.item.name}</Text>
                    <Text style={styles.txBuyer} numberOfLines={1}>
                      {isBuy ? 'Bought' : 'Sold'} • {tx.item.quantity} × ₹{isBuy ? tx.item.buy_price : tx.item.sell_price}
                      {' • '}{tx.item.buyer_name || 'Not recorded'}
                    </Text>
                  </View>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
                <View style={styles.saleDetailRow}>
                  <Text style={styles.saleDetailLabel}>
                    {isBuy ? `Amount (incl. brokerage ${formatMoney(tx.item.brokerage)})` : `Net proceeds (brokerage ${formatMoney(tx.item.sell_brokerage)})`}
                  </Text>
                  <Text style={styles.saleDetailValue}>
                    {formatMoney(isBuy ? tx.item.total_invested : tx.item.current_value)}
                  </Text>
                </View>
                {!isBuy && (
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Realized P/L (bought {formatDate(tx.item.buy_date)})</Text>
                    <Text style={[styles.saleDetailValue, { color: pnl >= 0 ? COLORS.profit : COLORS.loss }]}>
                      {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                    </Text>
                  </View>
                )}
              </GlassCard>
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
  summaryCard: { marginBottom: SPACING.md },
  summaryLabel: { ...TYPE.secondary, color: COLORS.textSecondary },
  summaryBig: { ...TYPE.portfolioValue, color: COLORS.textPrimary, marginVertical: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryRowLabel: { ...TYPE.secondary, color: COLORS.textSecondary },
  summaryRowValue: { ...TYPE.smallValue, color: COLORS.textPrimary },
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
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  adminAction: {
    ...TYPE.button,
    color: COLORS.accent,
    padding: SPACING.sm,
  },
  txCard: {
    marginBottom: SPACING.md,
  },

  // ── Sold holdings ──
  realizedCard: {
    marginBottom: SPACING.md,
  },
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
  realizedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  realizedTotalLabel: {
    ...TYPE.secondaryMedium,
    color: COLORS.textSecondary,
  },
  realizedTotalValue: {
    ...TYPE.plAmount,
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
  saleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  saleDetailLabel: {
    ...TYPE.caption,
    flex: 1,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  saleDetailValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
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
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  txTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },
  txName: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  txBuyer: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txDate: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    flexShrink: 0,
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
