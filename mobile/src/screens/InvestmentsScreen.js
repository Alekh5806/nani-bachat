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
  const { stockSummary, fetchStockSummary, stocks, fetchStocks, deleteStock, refreshPrices } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadPrices = () => {
        fetchStockSummary();
        fetchStocks();
      };

      loadPrices();
      const intervalId = setInterval(loadPrices, PRICE_REFRESH_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, [fetchStockSummary, fetchStocks])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStockSummary(), fetchStocks()]);
    setRefreshing(false);
  }, [fetchStockSummary, fetchStocks]);

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
