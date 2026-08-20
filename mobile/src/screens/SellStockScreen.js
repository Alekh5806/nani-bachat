/**
 * Sell Stock Screen (Admin Only)
 * Records a full or partial sale for an existing purchase transaction.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { COLORS, SPACING, FONTS } from '../theme/colors';

export const SellStockScreen = ({ navigation, route }) => {
  const stock = route.params?.stock;
  const { sellStock } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    quantity: stock?.quantity ? String(stock.quantity) : '',
    sell_price: stock?.current_price ? String(stock.current_price) : '',
    sell_date: new Date().toISOString().split('T')[0],
    notes: stock?.notes || '',
  });

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

  const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return (
      parsed.getFullYear() === year
      && parsed.getMonth() === month - 1
      && parsed.getDate() === day
    );
  };

  const handleSubmit = async () => {
    if (!stock?.id) {
      Toast.show({ type: 'error', text1: 'Missing Stock', text2: 'Open this screen from a stock transaction' });
      return;
    }

    const sellQuantity = parseInt(form.quantity, 10);
    const availableQuantity = Number(stock.quantity) || 0;
    const sellPrice = parseFloat(form.sell_price);
    const nextErrors = {};

    if (!form.quantity || !form.sell_price || !form.sell_date) {
      if (!form.quantity) nextErrors.quantity = 'Enter quantity to sell';
      if (!form.sell_price) nextErrors.sell_price = 'Enter sell price';
      if (!form.sell_date) nextErrors.sell_date = 'Enter sell date';
      setErrors(nextErrors);
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Enter quantity, sell price, and sell date' });
      return;
    }
    if (!Number.isInteger(sellQuantity) || sellQuantity < 1) {
      setErrors({ quantity: 'Quantity must be at least 1' });
      Toast.show({ type: 'error', text1: 'Invalid Quantity', text2: 'Sell quantity must be at least 1' });
      return;
    }
    if (sellQuantity > availableQuantity) {
      setErrors({ quantity: `Only ${availableQuantity} shares are available` });
      Toast.show({ type: 'error', text1: 'Invalid Quantity', text2: `Only ${availableQuantity} shares are available` });
      return;
    }
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      setErrors({ sell_price: 'Sell price must be greater than zero' });
      Toast.show({ type: 'error', text1: 'Invalid Price', text2: 'Sell price must be greater than zero' });
      return;
    }
    if (!isValidDate(form.sell_date)) {
      setErrors({ sell_date: 'Use YYYY-MM-DD format' });
      Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Use YYYY-MM-DD format' });
      return;
    }
    if (stock.buy_date && form.sell_date < stock.buy_date) {
      setErrors({ sell_date: 'Sell date cannot be before buy date' });
      Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Sell date cannot be before buy date' });
      return;
    }

    setLoading(true);
    const result = await sellStock(stock.id, {
      quantity: sellQuantity,
      sell_price: sellPrice,
      sell_date: form.sell_date,
      notes: form.notes,
    });
    setLoading(false);

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Stock Sold', text2: `${sellQuantity} ${stock.name} share${sellQuantity > 1 ? 's' : ''} sold` });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: JSON.stringify(result.error) });
    }
  };

  const availableQuantity = Number(stock?.quantity) || 0;
  const sellQuantity = Math.min(Math.max(parseInt(form.quantity, 10) || 0, 0), availableQuantity);
  const remainingQuantity = Math.max(availableQuantity - sellQuantity, 0);
  const brokerageShare = roundMoney(availableQuantity > 0 ? (Number(stock?.brokerage) || 0) * (sellQuantity / availableQuantity) : 0);
  const grossSaleValue = roundMoney((Number(form.sell_price) || 0) * sellQuantity);
  const investedValue = roundMoney((Number(stock?.buy_price) || 0) * sellQuantity + brokerageShare);
  const profitLoss = grossSaleValue - investedValue;
  const profitLossPercentage = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
  const isFullSale = sellQuantity === availableQuantity && availableQuantity > 0;

  const setQuantityPreset = (quantity) => {
    updateForm('quantity', String(Math.max(1, Math.min(quantity, availableQuantity))));
  };

  const quantityPresets = [
    { label: '1 Share', value: 1, disabled: availableQuantity < 1 },
    { label: 'Half', value: Math.max(1, Math.floor(availableQuantity / 2)), disabled: availableQuantity < 2 },
    { label: 'All', value: availableQuantity, disabled: availableQuantity < 1 },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sell Stock"
        subtitle="Record sale transaction"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {stock && (
            <GlassCard gradient gradientColors={[COLORS.surface, COLORS.cardBg]} style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.symbolBadge}>
                  <Text style={styles.symbolBadgeText}>{stock.symbol?.replace('.NS', '').substring(0, 4)}</Text>
                </View>
                <View style={styles.heroTitleBlock}>
                  <Text style={styles.stockName} numberOfLines={1} adjustsFontSizeToFit>{stock.name}</Text>
                  <Text style={styles.stockMeta}>{stock.symbol} • Bought {stock.buy_date}</Text>
                </View>
                <View style={[styles.modeBadge, isFullSale ? styles.fullBadge : styles.partialBadge]}>
                  <Text style={[styles.modeBadgeText, isFullSale ? styles.fullBadgeText : styles.partialBadgeText]}>
                    {isFullSale ? 'Full' : 'Partial'}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingStrip}>
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>Available</Text>
                  <Text style={styles.holdingValue}>{formatNumber(availableQuantity)}</Text>
                </View>
                <View style={styles.holdingDivider} />
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>Buy Avg</Text>
                  <Text style={styles.holdingValue}>{formatCurrency(stock.average_buy_price || stock.buy_price)}</Text>
                </View>
                <View style={styles.holdingDivider} />
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>Market</Text>
                  <Text style={styles.holdingValue}>{formatCurrency(stock.current_price)}</Text>
                </View>
              </View>
            </GlassCard>
          )}

          <Text style={styles.sectionLabel}>SALE QUANTITY</Text>
          <GlassCard style={styles.formCard}>
            <PremiumInput
              label="Quantity To Sell"
              value={form.quantity}
              onChangeText={(value) => updateForm('quantity', value.replace(/[^0-9]/g, ''))}
              placeholder={`Max ${stock?.quantity || 0}`}
              keyboardType="number-pad"
              icon="#"
              error={errors.quantity}
              style={styles.compactInput}
            />
            <View style={styles.presetRow}>
              {quantityPresets.map((preset) => (
                <Pressable
                  key={preset.label}
                  onPress={() => setQuantityPreset(preset.value)}
                  disabled={preset.disabled}
                  style={({ pressed }) => [
                    styles.presetButton,
                    Number(form.quantity) === preset.value && styles.presetButtonActive,
                    preset.disabled && styles.presetButtonDisabled,
                    pressed && !preset.disabled && styles.presetPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      Number(form.quantity) === preset.value && styles.presetTextActive,
                      preset.disabled && styles.presetTextDisabled,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </GlassCard>

          <Text style={styles.sectionLabel}>SALE DETAILS</Text>
          <GlassCard style={styles.formCard}>
            <PremiumInput
              label="Sell Price Per Share"
              value={form.sell_price}
              onChangeText={(value) => updateForm('sell_price', value)}
              placeholder="Example: 1450.50"
              keyboardType="decimal-pad"
              icon="₹"
              error={errors.sell_price}
            />
            <PremiumInput
              label="Sell Date"
              value={form.sell_date}
              onChangeText={(value) => updateForm('sell_date', value)}
              placeholder="YYYY-MM-DD"
              icon="📅"
              error={errors.sell_date}
            />
            <PremiumInput
              label="Notes"
              value={form.notes}
              onChangeText={(value) => updateForm('notes', value)}
              placeholder="Optional sale note"
              multiline
              icon="📝"
              style={styles.lastInput}
            />
          </GlassCard>

          <Text style={styles.sectionLabel}>SALE PREVIEW</Text>
          <GlassCard borderGlow style={styles.previewCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Quantity Sold</Text>
                <Text style={styles.summaryValue}>{formatNumber(sellQuantity)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>{formatNumber(remainingQuantity)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Sale Value</Text>
                <Text style={styles.summaryValue}>{formatCurrency(grossSaleValue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cost Basis</Text>
                <Text style={styles.summaryValue}>{formatCurrency(investedValue)}</Text>
              </View>
            </View>
            <View style={[styles.pnlPanel, { backgroundColor: profitLoss >= 0 ? COLORS.profitBg : COLORS.lossBg }]}> 
              <View>
                <Text style={styles.pnlLabel}>Estimated Sale P/L</Text>
                <Text style={[styles.pnlValue, { color: profitLoss >= 0 ? COLORS.profit : COLORS.loss }]}> 
                  {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
                </Text>
              </View>
              <Text style={[styles.pnlPercent, { color: profitLoss >= 0 ? COLORS.profit : COLORS.loss }]}> 
                {profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.remainingText}>
              Brokerage used in this sale: {formatCurrency(brokerageShare)}. Final accuracy is validated again by the server before saving.
            </Text>
          </GlassCard>

          <PremiumButton
            title={remainingQuantity > 0 ? 'Sell Partial Quantity' : 'Sell Full Quantity'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!stock}
            variant="danger"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  heroCard: {
    marginBottom: SPACING.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  symbolBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginRight: SPACING.md,
  },
  symbolBadgeText: {
    color: COLORS.textInverse,
    fontSize: FONTS.sm,
    fontWeight: '900',
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  stockName: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stockMeta: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
  },
  partialBadge: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  fullBadge: {
    backgroundColor: COLORS.lossBg,
    borderColor: COLORS.loss,
  },
  modeBadgeText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  partialBadgeText: {
    color: COLORS.warning,
  },
  fullBadgeText: {
    color: COLORS.loss,
  },
  holdingStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.lg,
  },
  holdingItem: {
    flex: 1,
    minWidth: 0,
  },
  holdingLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  holdingValue: {
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  holdingDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.md,
  },
  formCard: {
    marginBottom: SPACING.xl,
  },
  compactInput: {
    marginBottom: SPACING.md,
  },
  lastInput: {
    marginBottom: 0,
  },
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  presetButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.cardBgAlt,
  },
  presetButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(0, 208, 156, 0.12)',
  },
  presetButtonDisabled: {
    opacity: 0.45,
  },
  presetPressed: {
    opacity: 0.78,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  presetTextActive: {
    color: COLORS.accent,
  },
  presetTextDisabled: {
    color: COLORS.textMuted,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: COLORS.cardBgAlt,
    borderRadius: 8,
    padding: SPACING.md,
  },
  summaryLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  previewCard: {
    marginBottom: SPACING.xl,
  },
  pnlPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  pnlLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  pnlValue: {
    fontSize: FONTS.xl,
    fontWeight: '900',
  },
  pnlPercent: {
    fontSize: FONTS.md,
    fontWeight: '900',
  },
  remainingText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
});