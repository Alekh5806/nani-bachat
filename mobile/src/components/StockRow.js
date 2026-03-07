/**
 * Stock Row Component
 * Displays a single stock holding with price and P/L
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS, SHADOWS } from '../theme/colors';

export const StockRow = ({ stock, onPress, showDetails = true }) => {
  const isProfit = stock.profit_loss >= 0;
  const pnlColor = isProfit ? COLORS.profit : COLORS.loss;
  const pnlBg = isProfit ? COLORS.profitBg : COLORS.lossBg;

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
        <View style={[styles.symbolBadge, { backgroundColor: pnlBg }]}>
          <Text style={[styles.symbolText, { color: pnlColor }]}>
            {(stock.symbol || '').replace('.NS', '').substring(0, 3)}
          </Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
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
        <Text style={styles.price}>
          ₹{(stock.current_price || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })}
        </Text>
        <View style={[styles.pnlBadge, { backgroundColor: pnlBg }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {isProfit ? '▲' : '▼'}{' '}
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

const styles = StyleSheet.create({
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
    ...SHADOWS.cardLight,
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  symbol: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  qty: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pnlBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  pnlText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  pnlAmount: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    marginTop: 2,
  },
});
