/**
 * Asset Stocks Screen
 * Opened from the Asset Allocation card: all stocks with current value,
 * invested amount and share of the stock total.
 */
import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { CompanyLogo } from '../components/CompanyLogo';
import { fmtFull } from '../utils/currency';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

export const AssetStocksScreen = ({ navigation }) => {
  const { dashboard, stockSummary, fetchDashboard, fetchStockSummary } = usePortfolioStore();

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchStockSummary();
    }, [fetchDashboard, fetchStockSummary])
  );

  const p = dashboard?.portfolio || {};
  const holdings = [...(stockSummary?.stocks || [])].sort(
    (a, b) => (Number(b.current_value) || 0) - (Number(a.current_value) || 0)
  );
  const current = Number(p.active_stock_value) || holdings.reduce((s, h) => s + (Number(h.current_value) || 0), 0);
  const invested = Number(p.active_stock_invested) || holdings.reduce((s, h) => s + (Number(h.total_invested) || 0), 0);
  const returns = current - invested;
  const returnsPct = invested > 0 ? (returns / invested) * 100 : 0;
  const returnsColor = returns >= 0 ? COLORS.profit : COLORS.loss;
  const sign = returns >= 0 ? '+' : '';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Stocks" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.label}>Current</Text>
              <Text style={styles.value}>{fmtFull(current)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.label}>Total returns</Text>
              <Text style={[styles.value, { color: returnsColor }]}>
                {sign}{fmtFull(returns)} ({sign}{returnsPct.toFixed(2)}%)
              </Text>
            </View>
          </View>
          <View style={[styles.summaryRow, { marginTop: SPACING.lg }]}>
            <View>
              <Text style={styles.label}>Invested</Text>
              <Text style={styles.value}>{fmtFull(invested)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.label}>Allocation</Text>
              <Text style={styles.value}>100.00%</Text>
            </View>
          </View>
        </View>

        <View style={styles.listHead}>
          <Text style={styles.headText}>Stocks ({holdings.length})</Text>
          <Text style={styles.headText}>Current (Invested)</Text>
        </View>

        {holdings.map((h, i) => {
          const value = Number(h.current_value) || 0;
          const cost = Number(h.total_invested) || 0;
          const share = current > 0 ? (value / current) * 100 : 0;
          return (
            <Pressable
              key={h.symbol}
              style={[styles.row, i < holdings.length - 1 && styles.rowDivider]}
              onPress={() => navigation.navigate('Investments', { screen: 'HoldingDetail', params: { holding: h } })}
            >
              <CompanyLogo symbol={h.symbol} name={h.name} size={40} />
              <View style={styles.rowMain}>
                <Text style={styles.name} numberOfLines={1}>{h.name || h.symbol}</Text>
                <Text style={styles.sub}>{share.toFixed(2)}%</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, { color: value >= cost ? COLORS.profit : COLORS.loss }]}>
                  {fmtFull(value)}
                </Text>
                <Text style={styles.sub}>({fmtFull(cost)})</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 0 },
  summary: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...TYPE.secondary, fontSize: 12, color: COLORS.textMuted },
  value: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary, marginTop: SPACING.xs },
  right: { alignItems: 'flex-end' },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  headText: { ...TYPE.infoTitle, color: COLORS.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rowMain: { flex: 1, minWidth: 0, marginHorizontal: SPACING.md },
  name: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  amount: { ...TYPE.smallValue, fontSize: 12 },
  sub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
}));
