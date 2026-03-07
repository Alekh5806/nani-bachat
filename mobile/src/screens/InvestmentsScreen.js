/**
 * Investments Screen
 * Shows all stock holdings with summary and admin add functionality
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Alert
} from 'react-native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { StockRow } from '../components/StockRow';
import { SectionHeader } from '../components/SectionHeader';
import { GlassCard } from '../components/GlassCard';
import { COLORS, SPACING, FONTS } from '../theme/colors';

export const InvestmentsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { stockSummary, fetchStockSummary, stocks, fetchStocks, deleteStock, refreshPrices } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStockSummary();
    fetchStocks();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStockSummary(), fetchStocks()]);
    setRefreshing(false);
  }, []);

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

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const summary = stockSummary || {};

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
            key={stock.symbol || index}
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
                  <Text style={styles.txName}>{stock.name}</Text>
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
              </GlassCard>
            ))}
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
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.huge,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
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
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  txName: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  txDate: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
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
});
