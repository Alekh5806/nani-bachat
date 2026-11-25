import React, { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ArrowRight2 } from 'iconsax-react-native';

import { CompanyLogo } from './CompanyLogo';
import { formatDateDisplay } from './DatePickerField';
import { StockAction, StockOverview, StockState, StockTabs, StocksSkeleton, stockReturnColor, stockStyles } from './StocksUI';
import { shortName } from '../utils/names';
import { hasNumber, money, returnRate, returnText, sharesLabel, tickerLabel } from '../utils/stockDisplay';
import { COLORS, SPACING, TYPE, themedStyles } from '../theme/colors';

const FILTERS = [['all', 'All'], ['buy', 'Buys'], ['sell', 'Sells']];

export const TransactionBadge = ({ sell }) => (
  <View style={[styles.badge, sell && styles.saleBadge]}>
    <Text style={styles.badgeText}>{sell ? 'Sold' : 'Bought'}</Text>
  </View>
);

const TransactionRow = ({ event, separated, onPress }) => {
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width - 32, 768) / fontScale < 350;
  const sell = event.type === 'sell';
  const name = shortName(event.name) || tickerLabel(event.symbol);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sell ? 'Sold' : 'Bought'} ${sharesLabel(event.quantity)} of ${name} on ${formatDateDisplay(event.date)}, ${money(event.amount)}`}
      accessibilityHint="Opens transaction details"
      onPress={onPress}
      style={({ pressed, focused }) => [
        styles.row, separated && styles.divided, stacked && styles.stacked,
        pressed && stockStyles.pressed, focused && styles.focused,
      ]}
    >
      <View style={styles.identity}>
        <CompanyLogo symbol={event.symbol} name={event.name} size={34} style={styles.logo} />
        <View style={styles.body}>
          <View style={styles.titleLine}>
            <TransactionBadge sell={sell} />
            <Text style={styles.name}>{name}</Text>
          </View>
          <Text style={styles.meta}>{sharesLabel(event.quantity)} · {money(event.price)} per share</Text>
          <Text style={styles.meta}>{event.buyer_name || 'Buying member not recorded'}</Text>
        </View>
      </View>
      <View style={[styles.amount, stacked && styles.stackedAmount]}>
        <Text style={stockStyles.value}>{money(event.amount)}</Text>
        <Text style={styles.meta}>{formatDateDisplay(event.date)}</Text>
      </View>
      {!stacked && <ArrowRight2 size={14} color={COLORS.textSecondary} />}
    </Pressable>
  );
};

export const StockHistory = ({ transactions, failed, refreshing, onRefresh, onOpen }) => {
  const [filter, setFilter] = useState('all');
  const { groups, hasSales, proceeds, gain, hasLegacy } = useMemo(() => {
    const byMonth = {};
    let proceeds = 0;
    let gain = 0;
    let hasSales = false;
    let hasLegacy = false;
    for (const event of transactions || []) {
      if (event.type === 'sell') {
        hasSales = true;
        proceeds += Math.round(Number(event.amount) * 100);
        gain += Math.round(Number(event.profit_loss) * 100);
      }
      if (event.legacy) hasLegacy = true;
      if (filter === 'all' || event.type === filter) {
        const month = event.date.slice(0, 7);
        (byMonth[month] ||= []).push(event);
      }
    }
    return { groups: Object.entries(byMonth), proceeds: proceeds / 100, gain: gain / 100, hasSales, hasLegacy };
  }, [filter, transactions]);

  if (!transactions) {
    return failed
      ? <StockState title="Couldn’t load history" description="Try again to load purchases and sales." action="Retry" onPress={onRefresh} />
      : <StocksSkeleton />;
  }

  const closedCost = proceeds - gain;
  const rate = returnRate(gain, closedCost);
  return (
    <>
      {failed && <StockState title="Showing saved transactions" description="The latest history couldn’t be loaded." action="Retry" onPress={onRefresh} />}
      {hasSales && (
        <StockOverview
          label="Net sale proceeds"
          value={money(proceeds)}
          rows={[
            { label: 'Cost of sold shares', value: money(closedCost) },
            { label: 'Realized return', value: returnText(gain, rate), color: stockReturnColor(gain) },
          ]}
          note="Net proceeds are included in club cash."
        />
      )}
      <View style={stockStyles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={stockStyles.heading}>Transactions</Text>
          <StockAction label={refreshing ? 'Refreshing' : 'Refresh'} busy={refreshing} disabled={refreshing} onPress={onRefresh} />
        </View>
        {!!transactions.length && <StockTabs value={filter} onChange={setFilter} options={FILTERS} />}
        {hasLegacy && filter !== 'sell' && (
          <Text style={stockStyles.muted}>Older partial purchases may appear in separate portions where the original lot wasn’t recorded.</Text>
        )}
        {groups.length ? groups.map(([month, events]) => (
          <View key={month} style={styles.month}>
            <Text accessibilityRole="header" style={styles.monthLabel}>
              {new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </Text>
            <View style={stockStyles.grouped}>
              {events.map((event, i) => <TransactionRow key={`${event.type}-${event.id}`} event={event} separated={i > 0} onPress={() => onOpen(event)} />)}
            </View>
          </View>
        )) : (
          <StockState title={transactions.length ? 'No matching transactions' : 'No transactions yet'}
            description={transactions.length ? 'Choose All to see every purchase and sale.' : 'Recorded purchases and sales will appear here.'}
            action={transactions.length ? 'Show all' : undefined} onPress={() => setFilter('all')} />
        )}
      </View>
    </>
  );
};

const styles = themedStyles(() => ({
  badge: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  saleBadge: { backgroundColor: COLORS.neutralBg, borderColor: COLORS.border, borderWidth: 1 },
  badgeText: { ...TYPE.captionMedium, color: COLORS.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, minHeight: 72, gap: SPACING.sm },
  body: { flex: 1, minWidth: 0, gap: 3 },
  logo: { backgroundColor: COLORS.logoBg },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  name: { ...TYPE.secondaryMedium, color: COLORS.textPrimary, flexShrink: 1 },
  amount: { maxWidth: '44%', alignItems: 'flex-end', gap: 3 },
  meta: { ...TYPE.caption, color: COLORS.textSecondary },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedAmount: { alignItems: 'flex-start', marginLeft: 42, maxWidth: '100%' },
  divided: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  focused: { borderWidth: 1, borderColor: COLORS.accent },
  month: { gap: SPACING.sm, marginBottom: SPACING.sm },
  monthLabel: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
}));
