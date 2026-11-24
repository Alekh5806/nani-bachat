/**
 * Holding Detail Screen
 * One holding in full: totals, each purchase (edit / sell), and its history.
 */
import { shortName } from '../utils/names';
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Edit2, Trash, ExportCircle } from 'iconsax-react-native';

import { formatDateDisplay } from '../components/DatePickerField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';
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

  // The purchase waiting for delete confirmation (null = dialog closed).
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = (lot) => setPendingDelete(lot);
  const runDelete = async () => {
    setDeleting(true);
    const result = await deleteStock(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
    if (result?.success) {
      Toast.show({ type: 'success', text1: 'Purchase deleted' });
      // Back to the Invest list instead of staying on this holding.
      navigation.navigate('InvestmentsHome');
    } else {
      Toast.show({ type: 'error', text1: 'Could not delete', text2: result?.error });
    }
  };

  const Row = ({ label, value, color }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );

  // Card title row: title on the left, icon-only actions (admin) on the right.
  const CardTitle = ({ title, actions }) => (
    <View style={styles.titleRow}>
      <Text style={styles.cardTitle}>{title}</Text>
      {isAdmin && (
        <View style={styles.iconActions}>
          {actions.map(({ key, Icon, label, onPress, danger }) => (
            <Pressable
              key={key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={[styles.iconAction, danger && styles.iconActionDanger]}
            >
              <Icon size={18} color={danger ? COLORS.loss : COLORS.accent} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={shortName(holding.name) || 'Holding'}
        subtitle={holding.symbol}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
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
        </View>

        <SectionHeader title="Purchases" />
        {lots.length === 0 && <Text style={styles.empty}>No purchases</Text>}
        {lots.map((lot) => (
          <View key={lot.id} style={styles.card}>
          <CardTitle
            title={formatDateDisplay(lot.buy_date)}
            actions={[
              { key: 'edit', Icon: Edit2, label: 'Edit purchase', onPress: () => navigation.navigate('EditStock', { stock: lot }) },
              { key: 'sell', Icon: ExportCircle, label: 'Sell investment', onPress: () => navigation.navigate('SellStock', { stock: lot }) },
              { key: 'delete', Icon: Trash, label: 'Delete purchase', onPress: () => confirmDelete(lot), danger: true },
            ]}
          />
            <Row label="Quantity" value={`${lot.quantity} × ₹${lot.buy_price}`} />
            <Row label="Brokerage" value={money(lot.brokerage)} />
            <Row label="Total" value={money(lot.total_invested)} />
            <Row label="Buyer" value={lot.buyer_name || 'Not recorded'} />
            {!!lot.notes && <Row label="Note" value={lot.notes} />}
          </View>
        ))}

        {sales.length > 0 && <SectionHeader title="Sales" />}
        {sales.map((sale) => {
          const p = Number(sale.profit_loss) || 0;
          return (
            <View key={sale.id} style={styles.card}>
              <CardTitle
                title={formatDateDisplay(sale.sell_date)}
                actions={[
                  { key: 'edit', Icon: Edit2, label: 'Edit sale', onPress: () => navigation.navigate('SellStock', { stock: sale }) },
                ]}
              />
              <Row label="Quantity" value={`${sale.quantity} × ₹${sale.sell_price}`} />
              <Row label="Bought On" value={sale.buy_date} />
              <Row label="Sale Brokerage" value={money(sale.sell_brokerage)} />
              <Row label="Net Proceeds" value={money(sale.current_value)} />
              <Row
                label="Realized P/L"
                value={`${p >= 0 ? '+' : ''}${money(p)}`}
                color={p >= 0 ? COLORS.profit : COLORS.loss}
              />
            </View>
          );
        })}
        <TabBarSpacer />
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete purchase?"
        message={pendingDelete
          ? `${pendingDelete.quantity} shares of ${shortName(pendingDelete.name)} bought on ${formatDateDisplay(pendingDelete.buy_date)} will be removed. This cannot be undone.`
          : ''}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={runDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
};

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 0 },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  // Two columns like a spec sheet: bold label on the left, value on the right half.
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  rowLabel: { ...TYPE.cardTitle, fontSize: 12, flex: 1, color: COLORS.textPrimary },
  rowValue: { ...TYPE.secondary, fontSize: 12, flex: 1, color: COLORS.textSecondary },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, marginBottom: SPACING.md },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: SPACING.md, marginBottom: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  cardTitle: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  iconActions: { flexDirection: 'row', gap: SPACING.sm },
  iconAction: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent + '14',
  },
  iconActionDanger: { backgroundColor: COLORS.loss + '14' },
}));
