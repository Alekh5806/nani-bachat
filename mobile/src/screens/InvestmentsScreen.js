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
import { StatCard } from '../components/StatCard';
import { StockRow } from '../components/StockRow';
import { SectionHeader } from '../components/SectionHeader';
import { GlassCard } from '../components/GlassCard';
import { COLORS, SPACING, FONTS } from '../theme/colors';

const PRICE_REFRESH_INTERVAL_MS = 60000;

export const InvestmentsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const {
    stockSummary, fetchStockSummary,
    stocks, fetchStocks,
    soldStocks, fetchSoldStocks,
    dashboard, fetchDashboard,
    deleteStock, refreshPrices,
  } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showSold, setShowSold] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadPrices = () => {
        fetchStockSummary();
        fetchStocks();
      };

      loadPrices();
      // Sold lots never change price, so they are fetched once per focus
      // rather than on the polling interval.
      fetchSoldStocks();
      fetchDashboard();
      const intervalId = setInterval(loadPrices, PRICE_REFRESH_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [fetchStockSummary, fetchStocks, fetchSoldStocks, fetchDashboard])
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

  const handleDeleteStock = (stock) => {
    Alert.alert(
      'Delete Stock',
      `Are you sure you want to delete ${stock.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStock(stock.id);
          },
        },
      ]
    );
  };

  const handleRefreshPrices = async () => {
    const result = await refreshPrices();
    if (result.success) {
      Alert.alert('Prices Updated', result.message || 'All stock prices have been refreshed with latest market data.');
    } else {
      Alert.alert('Update Failed', result.error || 'Could not refresh prices. Please try again.');
    }
  };

  const handleSellStock = (stock) => {
    navigation.navigate('SellStock', { stock });
  };

  const handleEditStock = (stock) => {
    navigation.navigate('EditStock', { stock });
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const summary = stockSummary || {};

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

  const holdingDays = (buyDate, sellDate) => {
    if (!buyDate || !sellDate) return null;
    const start = new Date(buyDate);
    const end = new Date(sellDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(Math.round((end - start) / 86400000), 0);
  };

  // Newest sale first — this reads as a transaction log.
  const sortedSold = [...soldStocks].sort((a, b) =>
    String(b.sell_date || '').localeCompare(String(a.sell_date || ''))
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Investments"
        subtitle={`${summary.total_stocks || 0} stocks`}
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
        {/* ── Summary Cards ── */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Invested"
            value={formatCurrency(summary.total_invested)}
            icon="💰"
            compact
            style={styles.halfCard}
          />
          <StatCard
            label="Current Value"
            value={formatCurrency(summary.total_current_value)}
            icon="💎"
            compact
            style={styles.halfCard}
          />
        </View>

        <StatCard
          label="Total P/L"
          value={formatCurrency(summary.total_profit_loss)}
          change={
            summary.total_invested > 0
              ? ((summary.total_profit_loss / summary.total_invested) * 100)
              : 0
          }
          icon={summary.total_profit_loss >= 0 ? '📈' : '📉'}
          gradient={summary.total_profit_loss >= 0}
          gradientColors={
            summary.total_profit_loss >= 0
              ? [COLORS.profit, COLORS.tealDark]
              : [COLORS.loss, '#DC2626']
          }
          style={{ marginBottom: SPACING.lg }}
        />

        {/* ── Admin Actions ── */}
        {isAdmin && (
          <GlassCard style={styles.adminActions}>
            <Text
              style={styles.adminAction}
              onPress={handleRefreshPrices}
            >
              🔄 Refresh Stock Prices
            </Text>
          </GlassCard>
        )}

        {/* ── Stock Holdings ── */}
        <SectionHeader title="All Holdings" icon="📊" />
        {(stockSummary?.stocks || []).map((stock, index) => (
          <StockRow
            key={`${stock.symbol || 'stock'}-${index}`}
            stock={stock}
            onPress={isAdmin ? () => handleDeleteStock(stock) : undefined}
          />
        ))}

        {/* ── Individual Transactions ── */}
        {stocks.length > 0 && (
          <>
            <SectionHeader title="Purchase History" icon="📋" />
            {stocks.map((stock, index) => (
              <GlassCard key={stock.id || index} style={styles.txCard}>
                <View style={styles.txHeader}>
                  <View style={styles.txTitleBlock}>
                    <Text style={styles.txName} numberOfLines={1} adjustsFontSizeToFit>
                      {stock.name}
                    </Text>
                    <Text style={styles.txBuyer} numberOfLines={1}>
                      Buyer: {stock.buyer_name || 'Not recorded'}
                    </Text>
                  </View>
                  <Text style={styles.txDate}>{stock.buy_date}</Text>
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txDetail}>
                    {stock.quantity} × ₹{stock.buy_price}
                  </Text>
                  <Text style={styles.txDetail}>
                    Brokerage: ₹{stock.brokerage}
                  </Text>
                  <Text style={[styles.txTotal, { color: COLORS.accent }]}>
                    Total: ₹{(stock.quantity * stock.buy_price + Number(stock.brokerage)).toFixed(2)}
                  </Text>
                </View>
                {isAdmin && (
                  <View style={styles.txActions}>
                    <Pressable
                      onPress={() => handleEditStock(stock)}
                      style={({ pressed }) => [styles.txActionButton, pressed && styles.txActionPressed]}
                    >
                      <Text style={styles.txActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSellStock(stock)}
                      style={({ pressed }) => [styles.txActionButton, pressed && styles.txActionPressed]}
                    >
                      <Text style={styles.txActionText}>Sell</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteStock(stock)}
                      style={({ pressed }) => [styles.txActionButton, styles.txDeleteButton, pressed && styles.txActionPressed]}
                    >
                      <Text style={[styles.txActionText, styles.txDeleteText]}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </GlassCard>
            ))}
          </>
        )}

        {/* ── Sold Holdings ── */}
        {sortedSold.length > 0 && (
          <>
            <SectionHeader title="Sold Holdings" icon="💸" />

            <GlassCard style={styles.realizedCard}>
              <View style={styles.realizedRow}>
                <View style={styles.realizedItem}>
                  <Text style={styles.realizedLabel}>Sale Proceeds</Text>
                  <Text style={styles.realizedValue}>{formatMoney(realizedProceeds)}</Text>
                </View>
                <View style={styles.realizedDivider} />
                <View style={styles.realizedItem}>
                  <Text style={styles.realizedLabel}>Cost of Sold</Text>
                  <Text style={styles.realizedValue}>{formatMoney(realizedInvested)}</Text>
                </View>
              </View>
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
                Booked profit is already counted in pool cash and is available to reinvest.
              </Text>
            </GlassCard>

            <Pressable
              onPress={() => setShowSold((prev) => !prev)}
              style={({ pressed }) => [styles.toggleButton, pressed && styles.txActionPressed]}
            >
              <Text style={styles.toggleText}>
                {showSold
                  ? 'Hide sale details'
                  : `Show all ${sortedSold.length} sale${sortedSold.length > 1 ? 's' : ''}`}
              </Text>
            </Pressable>

            {showSold && sortedSold.map((sale, index) => {
              const invested = (Number(sale.buy_price) || 0) * (Number(sale.quantity) || 0)
                + (Number(sale.brokerage) || 0);
              const proceeds = (Number(sale.sell_price) || 0) * (Number(sale.quantity) || 0);
              const pnl = proceeds - invested;
              const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
              const isProfit = pnl >= 0;
              const days = holdingDays(sale.buy_date, sale.sell_date);

              return (
                <GlassCard key={sale.id || index} style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <View style={styles.saleTitleBlock}>
                      <Text style={styles.saleName} numberOfLines={1}>{sale.name}</Text>
                      <Text style={styles.saleSymbol}>
                        {sale.symbol} • {sale.quantity} share{sale.quantity > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.salePnlBadge, { backgroundColor: isProfit ? COLORS.profitBg : COLORS.lossBg }]}>
                      <Text style={[styles.salePnlText, { color: isProfit ? COLORS.profit : COLORS.loss }]}>
                        {isProfit ? '▲' : '▼'} {Math.abs(pnlPct).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* Bought → sold, so the whole round trip reads in one line. */}
                  <View style={styles.tradeStrip}>
                    <View style={styles.tradeLeg}>
                      <Text style={styles.tradeLegLabel}>BOUGHT</Text>
                      <Text style={styles.tradeLegPrice}>₹{sale.buy_price}</Text>
                      <Text style={styles.tradeLegDate}>{formatDate(sale.buy_date)}</Text>
                    </View>
                    <Text style={styles.tradeArrow}>→</Text>
                    <View style={styles.tradeLeg}>
                      <Text style={styles.tradeLegLabel}>SOLD</Text>
                      <Text style={styles.tradeLegPrice}>₹{sale.sell_price}</Text>
                      <Text style={styles.tradeLegDate}>{formatDate(sale.sell_date)}</Text>
                    </View>
                  </View>

                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Invested (incl. brokerage {formatMoney(sale.brokerage)})</Text>
                    <Text style={styles.saleDetailValue}>{formatMoney(invested)}</Text>
                  </View>
                  <View style={styles.saleDetailRow}>
                    <Text style={styles.saleDetailLabel}>Proceeds</Text>
                    <Text style={styles.saleDetailValue}>{formatMoney(proceeds)}</Text>
                  </View>
                  <View style={[styles.saleDetailRow, styles.salePnlRow]}>
                    <Text style={styles.salePnlLabel}>Realized P/L</Text>
                    <Text style={[styles.salePnlValue, { color: isProfit ? COLORS.profit : COLORS.loss }]}>
                      {isProfit ? '+' : ''}{formatMoney(pnl)}
                    </Text>
                  </View>

                  <View style={styles.saleFooter}>
                    <Text style={styles.saleFooterText}>
                      👤 Held by {sale.buyer_name || 'Not recorded'}
                    </Text>
                    {days != null && (
                      <Text style={styles.saleFooterText}>
                        ⏱ {days} day{days === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>
                </GlassCard>
              );
            })}
          </>
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
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
    color: COLORS.accent,
    fontSize: FONTS.md,
    fontWeight: '600',
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
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  realizedValue: {
    fontSize: FONTS.md,
    fontWeight: '800',
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
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  realizedTotalValue: {
    fontSize: FONTS.lg,
    fontWeight: '800',
  },
  realizedNote: {
    fontSize: FONTS.xs,
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
    fontSize: FONTS.sm,
    fontWeight: '700',
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
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saleSymbol: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  salePnlBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  salePnlText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
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
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  tradeLegPrice: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  tradeLegDate: {
    fontSize: FONTS.xs,
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
    paddingVertical: 3,
  },
  saleDetailLabel: {
    flex: 1,
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  saleDetailValue: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  salePnlRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  salePnlLabel: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  salePnlValue: {
    fontSize: FONTS.md,
    fontWeight: '800',
  },
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
    fontSize: FONTS.xs,
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
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  txBuyer: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txDate: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  txDetails: {
    gap: 4,
  },
  txDetail: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  txTotal: {
    fontSize: FONTS.sm,
    fontWeight: '700',
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
    color: COLORS.accent,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  txDeleteText: {
    color: COLORS.loss,
  },
});
