import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight2 } from 'iconsax-react-native';

import { CompanyLogo } from './CompanyLogo';
import { stockReturnColor, stockStyles } from './StocksUI';
import { shortName } from '../utils/names';
import { money, percent, returnText, sharesLabel, tickerLabel } from '../utils/stockDisplay';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const StockRow = ({ stock, onPress, stockTotal, allocation, separated }) => {
  const company = shortName(stock.name) || tickerLabel(stock.symbol);
  const currentValue = money(stock.current_value);
  const invested = money(stock.total_invested);
  const change = returnText(stock.profit_loss, stock.profit_loss_percentage);
  const metadata = allocation
    ? `${percent(stockTotal > 0 ? Number(stock.current_value) / stockTotal * 100 : null, 1)} of stock holdings`
    : `${tickerLabel(stock.symbol)} · ${sharesLabel(stock.total_quantity)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${company}, ${metadata}, ${currentValue} current value, ${change} unrealized return, ${invested} invested${stock.price_is_estimate ? ', estimated price' : ''}`}
      accessibilityHint="Opens holding details"
      onPress={onPress}
      style={({ pressed, focused }) => [
        styles.row, separated && styles.separated,
        pressed && styles.pressed, focused && styles.focused,
      ]}
    >
      <CompanyLogo symbol={stock.symbol} name={stock.name} size={36} style={styles.logo} />
      <View style={styles.body}>
        <View style={stockStyles.line}>
          <Text style={styles.name}>{company}</Text>
          <Text style={[stockStyles.value, stockStyles.trailing]}>{currentValue}</Text>
        </View>
        <View style={stockStyles.line}>
          <Text style={styles.meta}>{metadata}</Text>
          <Text style={[styles.change, stockStyles.trailing, { color: stockReturnColor(stock.profit_loss) }]}>{change}</Text>
        </View>
        <View style={stockStyles.line}>
          <Text style={styles.meta}>Invested {invested}</Text>
          {stock.price_is_estimate && <Text style={[styles.meta, stockStyles.trailing]}>Estimated</Text>}
        </View>
      </View>
      <ArrowRight2 size={15} color={COLORS.textSecondary} />
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 72,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm,
  },
  separated: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  body: { flex: 1, minWidth: 0, gap: 2 },
  logo: { backgroundColor: COLORS.logoBg, flexShrink: 0 },
  name: { ...TYPE.rowTitle, color: COLORS.textPrimary, maxWidth: '100%' },
  meta: { ...TYPE.caption, color: COLORS.textSecondary, maxWidth: '100%', fontVariant: ['tabular-nums'] },
  change: { ...TYPE.smallValue },
  pressed: { backgroundColor: COLORS.surface },
  focused: { borderColor: COLORS.accent, borderWidth: 1 },
}));
