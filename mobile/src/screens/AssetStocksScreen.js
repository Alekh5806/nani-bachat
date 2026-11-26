import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { StockHoldings, useStockPrices } from '../components/StockHoldings';
import { stockStyles } from '../components/StocksUI';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { SPACING } from '../theme/colors';

export const AssetStocksScreen = ({ navigation }) => {
  const { dashboard, stockSummary, fetchDashboard, holdingsFailed } = usePortfolioStore();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const prices = useStockPrices(isAdmin);

  useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));

  return (
    <View style={stockStyles.screen}>
      <View style={stockStyles.header}>
        <ScreenHeader title="Stock allocation" inset={SPACING.lg} showBack hideProfile onBack={() => navigation.goBack()} />
      </View>
      <ScrollView style={stockStyles.viewport} contentContainerStyle={stockStyles.content} keyboardShouldPersistTaps="handled">
        <StockHoldings
          summary={stockSummary}
          failed={holdingsFailed}
          prices={prices}
          allocation
          portfolio={dashboard?.portfolio}
          onOpen={(holding) => navigation.navigate('HoldingDetail', { holding })}
          onAdd={isAdmin ? () => navigation.navigate('AddStock') : undefined}
        />
        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};
