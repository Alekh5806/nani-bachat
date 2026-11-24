/**
 * Stock Row Component
 * Displays a single stock holding with price and P/L
 */
import React from 'react';
import { shortName } from '../utils/names';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CompanyLogo } from './CompanyLogo';
import { fmtFull } from '../utils/currency';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const StockRow = ({ stock, onPress, showDetails = true }) => {
  const avg = Number(stock.average_buy_price || stock.buy_price) || 0;
  const current = Number(stock.current_value) || 0;
  const invested = Number(stock.total_invested) || 0;
  const isProfit = stock.profit_loss >= 0;
  const isFlat = Number(stock.profit_loss) === 0;
  const pnlColor = isFlat ? COLORS.neutral : isProfit ? COLORS.profit : COLORS.loss;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      {/* Stock Info */}
      <View style={styles.leftSection}>
        <CompanyLogo symbol={stock.symbol} name={stock.name} size={40} style={styles.logo} />
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {shortName(stock.name)}
          </Text>
          {showDetails && (
            <Text style={styles.qty}>
              {stock.total_quantity || stock.quantity} shares
              {avg > 0 ? `  •  Avg. ₹${avg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Current value (invested) */}
      <View style={styles.rightSection}>
        <Text style={[styles.price, { color: pnlColor }]} numberOfLines={1}>
          {fmtFull(current)}
        </Text>
        <Text style={styles.invested} numberOfLines={1}>({fmtFull(invested)})</Text>
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: { marginRight: SPACING.md },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  symbolText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...TYPE.cardTitle,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  symbol: {
    ...TYPE.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  qty: {
    ...TYPE.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 132,
  },
  price: {
    ...TYPE.smallValue,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  invested: {
    ...TYPE.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
}));
