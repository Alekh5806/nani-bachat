/**
 * Sell Stock Screen (Admin Only)
 * Records sales and corrects the terms of a sold lot.
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
import { DatePickerField, todayString, parseDateString } from '../components/DatePickerField';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const SellStockScreen = ({ navigation, route }) => {
  const stock = route.params?.stock;
  const editing = Boolean(stock?.is_sold);
  const { sellStock, updateSale } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const initialForm = {
    quantity: stock?.quantity ? String(stock.quantity) : '',
    sell_price: String((editing ? stock.sell_price : stock?.current_price) ?? ''),
    sell_brokerage: String(stock?.sell_brokerage ?? '0.00'),
    sell_date: editing ? stock.sell_date : todayString(),
    notes: stock?.notes || '',
  };
  const [form, setForm] = useState(initialForm);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

  const toPaise = (value) => Math.round(Number(value) * 100);

  const availableQuantity = Number(stock?.quantity) || 0;
  const sellQuantity = Number(form.quantity);
  const validQuantity = Number.isInteger(sellQuantity) && sellQuantity > 0 && sellQuantity <= availableQuantity;
  const remainingQuantity = availableQuantity - sellQuantity;
  const buyFeePaise = validQuantity
    ? Math.round(toPaise(stock.brokerage) * sellQuantity / availableQuantity) : 0;
  const grossPaise = toPaise(form.sell_price) * sellQuantity;
  const netPaise = grossPaise - toPaise(form.sell_brokerage);
  const grossCostPaise = stock?.reported_share_amount != null && validQuantity
    ? Math.round(toPaise(stock.reported_share_amount) * sellQuantity / availableQuantity)
    : toPaise(stock?.buy_price) * sellQuantity;
  const costPaise = grossCostPaise + buyFeePaise;
  const profitLoss = (netPaise - costPaise) / 100;

  const validate = () => {
    const problems = {};
    const money = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
    if (!validQuantity) problems.quantity = `Enter 1 to ${availableQuantity} whole shares`;
    if (!money.test(form.sell_price) || Number(form.sell_price) <= 0) {
      problems.sell_price = 'Enter a positive price with up to two decimal places';
    }
    if (form.sell_brokerage && !money.test(form.sell_brokerage)) {
      problems.sell_brokerage = 'Enter zero or a positive fee with up to two decimal places';
    } else if (validQuantity && !problems.sell_price && toPaise(form.sell_brokerage) > grossPaise) {
      problems.sell_brokerage = 'Brokerage cannot exceed the gross sale value';
    }
    if (!parseDateString(form.sell_date) || form.sell_date < stock?.buy_date || form.sell_date > todayString()) {
      problems.sell_date = 'Choose a date from the purchase date through today';
    }
    return problems;
  };

  const changedFields = Object.keys(form).filter(key => form[key] !== initialForm[key]);
  const handleSubmit = async () => {
    if (!stock?.id || loading) return;
    setErrors(problems);
    if (Object.keys(problems).length) return;

    const values = { ...form, quantity: sellQuantity, sell_brokerage: form.sell_brokerage || '0' };
    setLoading(true);
    const result = editing
      ? await updateSale(stock.id, Object.fromEntries(changedFields.map(key => [key, values[key]])))
      : await sellStock(stock.id, values);
    setLoading(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: editing ? 'Sale updated' : 'Investment sold', text2: stock.name });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: editing ? 'Could not update sale' : 'Could not sell', text2: result.error });
    }
  };

  const profitLossPercentage = costPaise > 0 ? ((netPaise - costPaise) / costPaise) * 100 : 0;
  const isFullSale = sellQuantity === availableQuantity && availableQuantity > 0;

  const problems = validate();
  const previewValid = Object.keys(problems).length === 0;
  const previewMoney = (value) => previewValid ? formatCurrency(value) : '—';

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
        title={editing ? 'Edit Sale' : 'Sell Investment'}
        subtitle={editing ? undefined : 'Record sale transaction'}
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
            <GlassCard style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <CompanyLogo symbol={stock.symbol} name={stock.name} size={44} style={{ marginRight: SPACING.md }} />
                <View style={styles.heroTitleBlock}>
                  <Text style={styles.stockName} numberOfLines={1} adjustsFontSizeToFit>{stock.name}</Text>
                  <Text style={styles.stockMeta}>{stock.symbol} • Bought {stock.buy_date}</Text>
                </View>
                <View style={[styles.modeBadge, isFullSale ? styles.fullBadge : styles.partialBadge]}>
                  <Text style={[styles.modeBadgeText, isFullSale ? styles.fullBadgeText : styles.partialBadgeText]}>
                    {editing ? 'Sold' : isFullSale ? 'Full' : 'Partial'}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingStrip}>
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>{editing ? 'Shares sold' : 'Available'}</Text>
                  <Text style={styles.holdingValue}>{formatNumber(availableQuantity)}</Text>
                </View>
                <View style={styles.holdingDivider} />
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>Buy Avg</Text>
                  <Text style={styles.holdingValue}>{formatCurrency(stock.average_buy_price || stock.buy_price)}</Text>
                </View>
                <View style={styles.holdingDivider} />
                <View style={styles.holdingItem}>
                  <Text style={styles.holdingLabel}>{editing ? 'Recorded sale' : 'Market'}</Text>
                  <Text style={styles.holdingValue}>{formatCurrency(editing ? stock.sell_price : stock.current_price)}</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {!editing && (
            <>
              <Text style={styles.sectionLabel}>Sale quantity</Text>
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
            </>
          )}

          <Text style={styles.sectionLabel}>Sale details</Text>
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
              label="Sale Brokerage (total)"
              value={form.sell_brokerage}
              onChangeText={(value) => updateForm('sell_brokerage', value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="₹"
              error={errors.sell_brokerage}
            />
            <DatePickerField
              label="Sell Date"
              value={form.sell_date}
              onChange={(value) => updateForm('sell_date', value)}
              minDate={stock?.buy_date}
              maxDate={todayString()}
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

          <Text style={styles.sectionLabel}>Sale preview</Text>
          <GlassCard borderGlow style={styles.previewCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Gross sale value</Text>
                <Text style={styles.summaryValue}>{previewMoney(grossPaise / 100)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Sale brokerage</Text>
                <Text style={styles.summaryValue}>{previewMoney(form.sell_brokerage)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net proceeds</Text>
                <Text style={styles.summaryValue}>{previewMoney(netPaise / 100)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cost Basis</Text>
                <Text style={styles.summaryValue}>{previewMoney(costPaise / 100)}</Text>
              </View>
            </View>
            <View style={[styles.pnlPanel, { backgroundColor: profitLoss >= 0 ? COLORS.profitBg : COLORS.lossBg }]}> 
              <View>
                <Text style={styles.pnlLabel}>Estimated Sale P/L</Text>
                <Text style={[styles.pnlValue, { color: profitLoss >= 0 ? COLORS.profit : COLORS.loss }]}> 
                  {previewValid && profitLoss >= 0 ? '+' : ''}{previewMoney(profitLoss)}
                </Text>
              </View>
              <Text style={[styles.pnlPercent, { color: profitLoss >= 0 ? COLORS.profit : COLORS.loss }]}> 
                {previewValid ? `${profitLossPercentage >= 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%` : '—'}
              </Text>
            </View>
            <Text style={styles.remainingText}>
              Cost basis includes {formatCurrency(buyFeePaise / 100)} in purchase brokerage.
              {!editing && validQuantity && ` ${formatNumber(remainingQuantity)} shares will remain.`}
            </Text>
          </GlassCard>

          <PremiumButton
            title={editing ? 'Save Sale Changes' : remainingQuantity > 0 ? 'Sell Partial Quantity' : 'Sell Full Quantity'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!stock || (editing && !changedFields.length)}
            variant={editing ? 'primary' : 'danger'}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = themedStyles(() => ({
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
    color: COLORS.onAccent,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  stockName: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  stockMeta: {
    ...TYPE.caption,
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
    ...TYPE.captionMedium,
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
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  holdingValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.accent + '22',
  },
  presetButtonDisabled: {
    opacity: 0.45,
  },
  presetPressed: {
    opacity: 0.78,
  },
  presetText: {
    ...TYPE.button,
    color: COLORS.textSecondary,
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
    ...TYPE.secondary,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    ...TYPE.smallValue,
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
    ...TYPE.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  pnlValue: {
    ...TYPE.plAmount,
  },
  pnlPercent: {
    ...TYPE.plPercent,
  },
  remainingText: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  sectionLabel: {
    ...TYPE.captionMedium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
}));