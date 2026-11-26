import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { formatDateDisplay } from '../components/DatePickerField';
import { ScreenHeader } from '../components/ScreenHeader';
import { TransactionBadge } from '../components/StockHistory';
import { StockAction, StockOverview, StockState, stockReturnColor, stockStyles } from '../components/StocksUI';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { useAuthStore } from '../store/authStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { SPACING } from '../theme/colors';
import { shortName } from '../utils/names';
import { money, returnRate, returnText, sharesLabel, tickerLabel } from '../utils/stockDisplay';

export const StockTransactionScreen = ({ route, navigation }) => {
  const initial = route.params.event;
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const { stockTransactions, fetchStockTransactions, transactionsFailed } = usePortfolioStore();
  const [editing, setEditing] = useState(false);
  const event = stockTransactions
    ? stockTransactions.find((entry) => entry.id === initial.id && entry.type === initial.type)
    : initial;
  const sale = event?.type === 'sell';

  useFocusEffect(useCallback(() => { fetchStockTransactions(); }, [fetchStockTransactions]));

  const edit = async () => {
    setEditing(true);
    try {
      const { data } = await api.get(`/investments/stocks/${event.id}/`);
      if (data.is_sold !== sale) {
        await fetchStockTransactions();
        Toast.show({ type: 'error', text1: 'This purchase is no longer open' });
        return;
      }
      navigation.navigate(sale ? 'SellStock' : 'EditStock', { stock: data });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open transaction for editing' });
    } finally {
      setEditing(false);
    }
  };

  return (
    <View style={stockStyles.screen}>
      <View style={stockStyles.header}><ScreenHeader title="Transaction details" inset={SPACING.lg} showBack hideProfile onBack={() => navigation.goBack()} /></View>
      <ScrollView style={stockStyles.viewport} contentContainerStyle={stockStyles.content}>
        {event ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md }}>
              <CompanyLogo symbol={event.symbol} name={event.name} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <TransactionBadge sell={sale} />
                <Text accessibilityRole="header" style={stockStyles.heading}>{shortName(event.name) || tickerLabel(event.symbol)}</Text>
                <Text style={stockStyles.meta}>{tickerLabel(event.symbol)} · {formatDateDisplay(event.date)}</Text>
              </View>
            </View>
            <StockOverview
              label={sale ? 'Net sale proceeds' : 'Purchase cost'}
              value={money(event.amount)}
              rows={[
                { label: 'Quantity', value: sharesLabel(event.quantity), metadata: true },
                { label: sale ? 'Sale price per share' : 'Buy price per share', value: money(event.price) },
                { label: 'Brokerage', value: money(event.brokerage) },
                { label: 'Buying member', value: event.buyer_name || 'Not recorded' },
                ...(sale ? [
                  { label: 'Bought on', value: formatDateDisplay(event.buy_date), metadata: true },
                  { label: 'Cost of sold shares', value: money(event.cost_basis) },
                  { label: 'Realized return', value: returnText(event.profit_loss, returnRate(event.profit_loss, event.cost_basis)), color: stockReturnColor(event.profit_loss) },
                ] : []),
                ...(event.notes ? [{ label: 'Note', value: event.notes }] : []),
              ]}
              note={transactionsFailed ? 'Couldn’t refresh this transaction. Saved details are shown.' : undefined}
            />
            <View style={stockStyles.section}>
              <StockAction label="View holding" onPress={() => navigation.navigate('HoldingDetail', { holding: event })} />
              {isAdmin && sale && <StockAction label="Edit sale" onPress={edit} busy={editing} disabled={editing} />}
              {isAdmin && !sale && event.has_remaining_lot && (
                <StockAction label="Edit open lot" onPress={edit} busy={editing} disabled={editing} />
              )}
            </View>
          </>
        ) : (
          <StockState title="Transaction no longer available" description="Go back to see the latest transaction history." />
        )}
        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};
