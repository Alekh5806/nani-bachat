import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { More } from 'iconsax-react-native';

import { CompanyLogo } from '../components/CompanyLogo';
import { formatDateDisplay } from '../components/DatePickerField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DialogCard } from '../components/DialogCard';
import { NseQuotePreview } from '../components/NseQuotePreview';
import { ScreenHeader } from '../components/ScreenHeader';
import { StockAction, StockFields, StockOverview, StockState, StocksSkeleton, stockReturnColor, stockStyles } from '../components/StocksUI';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { shortName } from '../utils/names';
import { money, percent, priceStatus, returnText, sharesLabel, tickerLabel } from '../utils/stockDisplay';
import { COLORS, SPACING, TYPE, themedStyles } from '../theme/colors';

const LotCard = ({ lot, isAdmin, onSale, onMenu }) => {
  const sale = lot.is_sold;
  return (
    <View style={styles.lot}>
      <View style={styles.lotHeader}>
        <Text accessibilityRole="header" style={stockStyles.value}>{formatDateDisplay(sale ? lot.sell_date : lot.buy_date)}</Text>
        {isAdmin && (
          <View style={styles.actions}>
            {!sale && <StockAction label="Record sale" onPress={() => onSale(lot)} />}
            <StockAction label="Options" icon={<More size={17} color={COLORS.textPrimary} />} onPress={() => onMenu(lot)} />
          </View>
        )}
      </View>
      <StockFields rows={[
        { label: sale ? 'Shares sold' : 'Shares held', value: sharesLabel(lot.quantity) },
        { label: sale ? 'Sale price per share' : 'Buy price per share', value: money(sale ? lot.sell_price : lot.buy_price) },
        ...(sale ? [{ label: 'Bought on', value: formatDateDisplay(lot.buy_date) }] : []),
        { label: 'Brokerage', value: money(sale ? lot.sell_brokerage : lot.brokerage) },
        { label: sale ? 'Net proceeds' : 'Cost of these shares', value: money(sale ? lot.current_value : lot.total_invested) },
        ...(sale ? [{
          label: 'Realized return', value: returnText(lot.profit_loss, lot.profit_loss_percentage), color: stockReturnColor(lot.profit_loss),
        }] : []),
        { label: 'Buying member', value: lot.buyer_name || 'Not recorded' },
      ]} />
      {!!lot.notes && <Text style={stockStyles.muted}>{lot.notes}</Text>}
    </View>
  );
};

export const HoldingDetailScreen = ({ route, navigation }) => {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const {
    stockSummary, holdingsFailed, stocks, soldStocks, deleteStock, fetchStockSummary, fetchStocks, fetchSoldStocks,
  } = usePortfolioStore();
  const [lotState, setLotState] = useState('loading');
  const [reload, setReload] = useState(0);
  const [menu, setMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    fetchStockSummary();
    Promise.all([fetchStocks(), fetchSoldStocks()]).then(([purchases, sales]) => {
      if (active) setLotState(purchases && sales ? 'ready' : 'error');
    });
    return () => { active = false; };
  }, [fetchStockSummary, fetchStocks, fetchSoldStocks, reload]));

  const initial = route.params?.holding;
  const symbol = route.params?.symbol || initial?.symbol;
  const holding = stockSummary
    ? stockSummary.stocks.find((stock) => stock.symbol === symbol)
    : initial?.total_quantity ? initial : null;
  const lots = stocks.filter((lot) => lot.symbol === symbol);
  const sales = soldStocks.filter((sale) => sale.symbol === symbol);
  const name = shortName(holding?.name || initial?.name || lots[0]?.name || sales[0]?.name) || tickerLabel(symbol);
  const stockTotal = stockSummary?.total_current_value;
  const sell = (stock) => navigation.navigate('SellStock', { stock });

  const runDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const result = await deleteStock(pendingDelete.id);
    setDeleting(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Purchase removed', text2: name });
      setPendingDelete(null);
    } else {
      Toast.show({ type: 'error', text1: 'Could not remove purchase', text2: result.error });
    }
  };

  return (
    <View style={stockStyles.screen}>
      <View style={stockStyles.header}>
        <ScreenHeader title="Holding details" inset={SPACING.lg} showBack hideProfile onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={stockStyles.content}>
        <View style={styles.company}>
          <CompanyLogo symbol={symbol} name={name} size={48} />
          <View style={styles.companyText}>
            <Text accessibilityRole="header" style={styles.companyName}>{name}</Text>
            <Text style={stockStyles.muted}>{tickerLabel(symbol)}{symbol?.endsWith('.NS') ? ' · NSE' : symbol?.endsWith('.BO') ? ' · BSE' : ''}</Text>
          </View>
        </View>
        {holding ? (
          <StockOverview
            label="Current holding value"
            value={money(holding.current_value)}
            rows={[
              { label: 'Unrealized return', value: returnText(holding.profit_loss, holding.profit_loss_percentage), color: stockReturnColor(holding.profit_loss) },
              { label: 'Quantity', value: sharesLabel(holding.total_quantity) },
              { label: 'Average cost incl. brokerage', value: money(holding.average_buy_price) },
              { label: holding.price_is_estimate ? 'Estimated price per share' : 'Current price per share', value: money(holding.current_price) },
              { label: 'Invested amount', value: money(holding.total_invested) },
              { label: 'Share of stock holdings', value: percent(stockTotal > 0 ? Number(holding.current_value) / stockTotal * 100 : null, 1) },
            ]}
            note={holdingsFailed ? 'Couldn’t refresh holdings. Last available values are shown.' : priceStatus([holding])}
          />
        ) : stockSummary && !holdingsFailed ? (
          <StockState title="No open position" description="The group currently holds no shares of this stock." />
        ) : holdingsFailed ? (
          <StockState title="Couldn’t load holding value" description="Try again to check for open shares." action="Retry" onPress={fetchStockSummary} />
        ) : <StocksSkeleton />}
        {Platform.OS !== 'web' && symbol?.endsWith('.NS') && (
          <View style={styles.secondary}><NseQuotePreview symbol={symbol.slice(0, -3)} /></View>
        )}
        {lotState === 'error' && <View style={styles.secondary}>
          <StockState title="Couldn’t refresh purchase and sale details" description="Saved records appear below when available."
            action="Retry" onPress={() => setReload((value) => value + 1)} />
        </View>}
        {lotState === 'loading' && <View style={styles.secondary}><StocksSkeleton summary={false} /></View>}
        {!!lots.length && <View style={stockStyles.section}>
          <Text accessibilityRole="header" style={stockStyles.heading}>Open purchase lots ({lots.length})</Text>
          {lots.map((lot) => <LotCard key={lot.id} lot={lot} isAdmin={isAdmin} onSale={sell} onMenu={setMenu} />)}
        </View>}
        {!!sales.length && <View style={stockStyles.section}>
          <Text accessibilityRole="header" style={stockStyles.heading}>Recorded sales ({sales.length})</Text>
          {sales.map((lot) => <LotCard key={lot.id} lot={lot} isAdmin={isAdmin} onMenu={setMenu} />)}
        </View>}
        <TabBarSpacer />
      </ScrollView>
      <DialogCard visible={!!menu} title="Transaction options" onDismiss={() => setMenu(null)}>
        {menu && <View style={styles.menu}>
          <StockAction label={menu.is_sold ? 'Edit sale' : 'Edit purchase'} onPress={() => {
            const stock = menu;
            setMenu(null);
            navigation.navigate(stock.is_sold ? 'SellStock' : 'EditStock', { stock });
          }} />
          {!menu.is_sold && <StockAction label="Remove purchase" danger onPress={() => { setPendingDelete(menu); setMenu(null); }} />}
        </View>}
      </DialogCard>
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Remove purchase?"
        message={pendingDelete ? `${sharesLabel(pendingDelete.quantity)} of ${name} bought on ${formatDateDisplay(pendingDelete.buy_date)} will be removed from holdings.` : ''}
        confirmText="Remove"
        destructive
        loading={deleting}
        onConfirm={runDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
};

const styles = themedStyles(() => ({
  company: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  companyText: { flex: 1, minWidth: 0, gap: 3 },
  companyName: { ...TYPE.screenTitle, color: COLORS.textPrimary },
  secondary: { marginTop: SPACING.md },
  lot: {
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: SPACING.md, gap: SPACING.sm,
  },
  lotHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  menu: { marginTop: SPACING.sm },
}));
