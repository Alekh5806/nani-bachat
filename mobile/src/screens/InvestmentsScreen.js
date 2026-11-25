import React, { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Add } from 'iconsax-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { StockHoldings, useStockPrices } from '../components/StockHoldings';
import { StockHistory } from '../components/StockHistory';
import { StockAction, StockTabs, stockStyles } from '../components/StocksUI';
import { usePersistedState } from '../utils/usePersistedState';
import { COLORS, SPACING } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { TabSwipeArea } from '../components/TabSwipeArea';

const TABS = [['holdings', 'Holdings'], ['history', 'History']];
const TAB_KEYS = TABS.map(([key]) => key);

export const InvestmentsScreen = ({ navigation }) => {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const { stockSummary, holdingsFailed, stockTransactions, transactionsFailed, fetchStockTransactions } = usePortfolioStore();
  const [tab, setTab] = usePersistedState('tab:invest', 'holdings', TAB_KEYS);
  const [refreshing, setRefreshing] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const prices = useStockPrices(isAdmin);

  useFocusEffect(useCallback(() => {
    if (tab === 'history') fetchStockTransactions();
  }, [tab, fetchStockTransactions]));

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (tab === 'history') await fetchStockTransactions();
      else await prices.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const add = isAdmin ? () => navigation.navigate('AddStock') : undefined;
  const separateAction = add && (width - SPACING.lg * 2) / fontScale < 340;
  return (
    <TabSwipeArea tab={tab} tabKeys={TAB_KEYS} onChange={setTab} style={stockStyles.screen}>
      <View style={stockStyles.header}>
        <ScreenHeader title="Stocks" inset={SPACING.lg}
          rightAction={separateAction ? undefined : add} rightLabel="Record purchase"
          rightIcon={<Add size={16} color={COLORS.onAccent} />} />
      </View>
      <View style={stockStyles.content}>
        {separateAction && <View style={{ marginBottom: SPACING.sm }}>
          <StockAction primary label="Record purchase" icon={<Add size={16} color={COLORS.onAccent} />} onPress={add} />
        </View>}
        <StockTabs value={tab} onChange={setTab} options={TABS} />
      </View>
      <ScrollView
        style={{ flex: 1, display: tab === 'holdings' ? 'flex' : 'none' }}
        contentContainerStyle={stockStyles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing && tab === 'holdings'} onRefresh={refresh} tintColor={COLORS.accent} />}
      >
        <StockHoldings summary={stockSummary} failed={holdingsFailed} prices={prices} onAdd={add}
          onNews={() => navigation.navigate('News', { screen: 'NewsHome', pop: true })}
          onOpen={(holding) => navigation.navigate('HoldingDetail', { holding })} />
        <TabBarSpacer />
      </ScrollView>
      <ScrollView
        style={{ flex: 1, display: tab === 'history' ? 'flex' : 'none' }}
        contentContainerStyle={stockStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing && tab === 'history'} onRefresh={refresh} tintColor={COLORS.accent} />}
      >
        <StockHistory transactions={stockTransactions} failed={transactionsFailed} refreshing={refreshing} onRefresh={refresh}
          onOpen={(event) => navigation.navigate('StockTransaction', { event })} />
        <View style={{ height: SPACING.sm }} />
        <TabBarSpacer />
      </ScrollView>
    </TabSwipeArea>
  );
};
