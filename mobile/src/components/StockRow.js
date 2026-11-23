/**
 * Stock Row Component
 * Displays a single stock holding with price and P/L
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CompanyLogo } from './CompanyLogo';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const StockRow = ({ stock, onPress, showDetails = true }) => {
  const isProfit = stock.profit_loss >= 0;
  const isFlat = Number(stock.profit_loss) === 0;
  const pnlColor = isFlat ? COLORS.neutral : isProfit ? COLORS.profit : COLORS.loss;
  const pnlBg = isFlat ? COLORS.neutralBg : isProfit ? COLORS.profitBg : COLORS.lossBg;

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
        <CompanyLogo symbol={stock.symbol} name={stock.name} size={44} style={styles.logo} />
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {stock.name}
          </Text>
          <Text style={styles.symbol}>{stock.symbol}</Text>
          {showDetails && (
            <Text style={styles.qty}>
              {stock.total_quantity || stock.quantity} shares
            </Text>
          )}
        </View>
      </View>

      {/* Price Info */}
      <View style={styles.rightSection}>
        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
          ₹{(stock.current_price || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })}
        </Text>
        <View style={[styles.pnlBadge, { backgroundColor: pnlBg }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {isProfit ? '+' : '-'}
            {Math.abs(stock.profit_loss_percentage || 0).toFixed(2)}%
          </Text>
        </View>
        {showDetails && (
          <Text style={[styles.pnlAmount, { color: pnlColor }]}>
            {isProfit ? '+' : ''}₹{(stock.profit_loss || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </Text>
        )}
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
    padding: SPACING.lg,
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
    color: COLORS.textPrimary,
  },
  symbol: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  qty: {
    ...TYPE.quantity,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 132,
  },
  price: {
    ...TYPE.stockPrice,
    color: COLORS.textPrimary,
  },
  pnlBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  pnlText: {
    ...TYPE.plPercent,
  },
  pnlAmount: {
    ...TYPE.smallValue,
    marginTop: 2,
  },
}));
