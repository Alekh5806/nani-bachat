import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { ArrowRight2 } from 'iconsax-react-native';

import { CompanyLogo } from './CompanyLogo';
import { stockReturnColor, stockStyles } from './StocksUI';
import { shortName } from '../utils/names';
import { money, percent, returnText, sharesLabel, tickerLabel } from '../utils/stockDisplay';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const StockRow = ({ stock, onPress, stockTotal, allocation, separated }) => {
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width - 32, 768) / fontScale < 310;
  const company = shortName(stock.name) || tickerLabel(stock.symbol);
  const change = returnText(stock.profit_loss, stock.profit_loss_percentage);
  const metadata = allocation
    ? `${percent(stockTotal > 0 ? Number(stock.current_value) / stockTotal * 100 : null, 1)} of stock holdings`
    : `${tickerLabel(stock.symbol)} · ${sharesLabel(stock.total_quantity)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${company}, ${metadata}, ${money(stock.current_value)} current value, ${change} unrealized return`}
      accessibilityHint="Opens holding details"
      onPress={onPress}
      style={({ pressed, focused }) => [
        styles.row, separated && styles.separated, stacked && styles.stacked,
        pressed && styles.pressed, focused && styles.focused,
      ]}
    >
      <View style={styles.identity}>
        <CompanyLogo symbol={stock.symbol} name={stock.name} size={36} style={styles.logo} />
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{company}</Text>
          <Text style={styles.meta}>{metadata}</Text>
          <Text style={styles.meta}>Invested {money(stock.total_invested)}</Text>
        </View>
      </View>
      <View style={[styles.figures, stacked && styles.stackedFigures]}>
        <Text style={stockStyles.value}>{money(stock.current_value)}</Text>
        <Text style={[styles.change, { color: stockReturnColor(stock.profit_loss) }]}>{change}</Text>
        {stock.price_is_estimate && <Text style={styles.meta}>Estimated</Text>}
      </View>
      <View style={stacked && styles.stackedArrow}><ArrowRight2 size={15} color={COLORS.textSecondary} /></View>
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  row: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', minHeight: 72,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm,
  },
  separated: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nameBlock: { flex: 1, minWidth: 0, gap: 2 },
  logo: { backgroundColor: COLORS.logoBg },
  name: { ...TYPE.cardTitle, color: COLORS.textPrimary },
  meta: { ...TYPE.caption, color: COLORS.textSecondary },
  figures: { maxWidth: '49%', alignItems: 'flex-end', gap: 4 },
  change: { ...TYPE.secondaryMedium, textAlign: 'right', fontVariant: ['tabular-nums'] },
  stacked: { flexDirection: 'column', alignItems: 'stretch', paddingRight: SPACING.xxxl },
  stackedFigures: { alignItems: 'flex-start', maxWidth: '100%', marginLeft: 44 },
  stackedArrow: { position: 'absolute', right: SPACING.md, top: SPACING.lg },
  pressed: { backgroundColor: COLORS.surface },
  focused: { borderColor: COLORS.accent, borderWidth: 1 },
}));
