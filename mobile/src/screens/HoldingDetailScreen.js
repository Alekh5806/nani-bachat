/**
 * Holding Detail Screen
 * One holding in full: totals, each purchase (edit / sell), and its history.
 */
import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Alert } from '../utils/alert';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

const money = (v) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const HoldingDetailScreen = ({ route, navigation }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const {
    stockSummary, stocks, soldStocks, deleteStock,
    fetchStockSummary, fetchStocks, fetchSoldStocks,
  } = usePortfolioStore();

  useFocusEffect(
    useCallback(() => {
      fetchStockSummary();
      fetchStocks();
      fetchSoldStocks();
    }, [fetchStockSummary, fetchStocks, fetchSoldStocks])
  );

  const symbol = route.params?.holding?.symbol;
  const holding =
    (stockSummary?.stocks || []).find((s) => s.symbol === symbol) || route.params?.holding || {};
  const lots = stocks.filter((s) => s.symbol === symbol);
  const sales = soldStocks.filter((s) => s.symbol === symbol);

  const pnl = Number(holding.profit_loss) || 0;
  const pnlColor = pnl === 0 ? COLORS.neutral : pnl > 0 ? COLORS.profit : COLORS.loss;

  const confirmDelete = (lot) => {
    Alert.alert('Delete Purchase', `Delete this purchase of ${lot.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteStock(lot.id); } },
    ]);
  };

  const Row = ({ label, value, color }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={holding.name || 'Holding'}
        subtitle={holding.symbol}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompanyLogo symbol={holding.symbol} name={holding.name} size={56} style={styles.heroLogo} />
        <GlassCard style={styles.card}>
          <Row label="Quantity" value={`${holding.total_quantity || 0} shares`} />
          <Row label="Average Buy Price" value={money(holding.average_buy_price)} />
          <Row label="Current Price" value={money(holding.current_price)} />
          <Row label="Total Invested" value={money(holding.total_invested)} />
          <Row label="Current Value" value={money(holding.current_value)} />
          <Row
            label="Current P/L"
            value={`${pnl >= 0 ? '+' : ''}${money(pnl)} (${pnl >= 0 ? '+' : ''}${(Number(holding.profit_loss_percentage) || 0).toFixed(2)}%)`}
            color={pnlColor}
          />
        </GlassCard>

        <SectionHeader title="Purchases" />
        {lots.length === 0 && <Text style={styles.empty}>No purchases</Text>}
        {lots.map((lot) => (
          <GlassCard key={lot.id} style={styles.card}>
            <Row label="Buy Date" value={lot.buy_date} />
            <Row label="Quantity" value={`${lot.quantity} × ₹${lot.buy_price}`} />
            <Row label="Brokerage" value={money(lot.brokerage)} />
            <Row label="Total" value={money(lot.total_invested)} />
            <Row label="Buyer" value={lot.buyer_name || 'Not recorded'} />
            {!!lot.notes && <Text style={styles.note}>{lot.notes}</Text>}
            {isAdmin && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => navigation.navigate('EditStock', { stock: lot })}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Edit Purchase</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('SellStock', { stock: lot })}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Sell Investment</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(lot)} style={[styles.action, styles.danger]}>
                  <Text style={[styles.actionText, { color: COLORS.loss }]}>Delete</Text>
                </Pressable>
              </View>
            )}
          </GlassCard>
        ))}

        {sales.length > 0 && <SectionHeader title="Sales" />}
        {sales.map((sale) => {
          const p = Number(sale.profit_loss) || 0;
          return (
            <GlassCard key={sale.id} style={styles.card}>
              <Row label="Sold On" value={sale.sell_date} />
              <Row label="Quantity" value={`${sale.quantity} × ₹${sale.sell_price}`} />
              <Row label="Bought On" value={sale.buy_date} />
              <Row label="Sale Brokerage" value={money(sale.sell_brokerage)} />
              <Row label="Net Proceeds" value={money(sale.current_value)} />
              <Row
                label="Realized P/L"
                value={`${p >= 0 ? '+' : ''}${money(p)}`}
                color={p >= 0 ? COLORS.profit : COLORS.loss}
              />
              {isAdmin && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => navigation.navigate('SellStock', { stock: sale })}
                    style={styles.action}
                  >
                    <Text style={styles.actionText}>Edit sale</Text>
                  </Pressable>
                </View>
              )}
            </GlassCard>
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
  card: { marginBottom: SPACING.md },
  heroLogo: { marginBottom: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...TYPE.secondary, color: COLORS.textSecondary },
  rowValue: { ...TYPE.smallValue, color: COLORS.textPrimary },
  note: { ...TYPE.secondary, color: COLORS.textSecondary, marginTop: SPACING.sm },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, marginBottom: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  action: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: 8, paddingVertical: SPACING.sm,
  },
  danger: { borderColor: COLORS.loss },
  actionText: { ...TYPE.button, color: COLORS.accent },
}));
