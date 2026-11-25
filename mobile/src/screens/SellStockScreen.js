/**
 * Sell Stock Screen (Admin Only)
 * Records sales and corrects the terms of a sold lot.
 */
import { shortName } from '../utils/names';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { FormScreen, FormCard, FormLabel } from '../components/FormScreen';
import { BuyerPicker } from '../components/BuyerPicker';
import { SelectedStockCard } from '../components/SelectedStockCard';
import { PreviewCard, PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { DatePickerField, todayString, parseDateString, formatDateDisplay } from '../components/DatePickerField';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const SellStockScreen = ({ navigation, route }) => {
  const stock = route.params?.stock;
  const editing = Boolean(stock?.is_sold);
  const { sellStock, updateSale, members, fetchMembers } = usePortfolioStore();
  useEffect(() => { fetchMembers(); }, []);
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
    if (Object.keys(problems).length) {
      Toast.show({ type: 'error', text1: 'Check the highlighted fields' });
      return;
    }

    const values = { ...form, quantity: sellQuantity, sell_brokerage: form.sell_brokerage || '0' };
    setLoading(true);
    const result = editing
      ? await updateSale(stock.id, Object.fromEntries(changedFields.map(key => [key, values[key]])))
      : await sellStock(stock.id, values);
    setLoading(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: editing ? 'Sale updated' : 'Sale recorded', text2: shortName(stock.name) });
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
    <FormScreen
      title={editing ? 'Edit sale' : 'Record sale'}
      onBack={() => navigation.goBack()}
    >
      {stock && (
        <SelectedStockCard
          symbol={stock.symbol}
          name={stock.name}
          style={styles.heroCard}
          right={(
            <View style={[styles.modeBadge, isFullSale ? styles.fullBadge : styles.partialBadge]}>
              <Text style={[styles.modeBadgeText, isFullSale ? styles.fullBadgeText : styles.partialBadgeText]}>
                {editing ? 'Sold' : isFullSale ? 'Full' : 'Partial'}
              </Text>
            </View>
          )}
          rows={[
            { label: editing ? 'Shares sold' : 'Available', value: formatNumber(availableQuantity) },
            { label: 'Bought on', value: formatDateDisplay(stock.buy_date) },
            { label: 'Buy Avg', value: formatCurrency(stock.average_buy_price || stock.buy_price) },
            { label: editing ? 'Recorded sale' : 'Market', value: formatCurrency(editing ? stock.sell_price : stock.current_price) },
          ]}
        />
      )}

      {!editing && (
        <>
          <FormLabel>Sale quantity</FormLabel>
          <FormCard style={styles.formCard}>
            <PremiumInput
              label="Quantity To Sell"
              value={form.quantity}
              onChangeText={(value) => updateForm('quantity', value.replace(/[^0-9]/g, ''))}
              placeholder={`Max ${stock?.quantity || 0}`}
              keyboardType="number-pad"
              icon="📦"
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
          </FormCard>
        </>
      )}

      <FormLabel>Sale details</FormLabel>
      <View style={styles.formCard}>
        {/* The buyer belongs to the purchase, so it is shown here but not editable. */}
        <BuyerPicker members={members} value={stock?.buyer} readOnly />
        <PremiumInput
          label="Sell Price Per Share"
          value={form.sell_price}
          onChangeText={(value) => updateForm('sell_price', value)}
          placeholder="Example: 1450.50"
          keyboardType="decimal-pad"
          icon="💵"
          error={errors.sell_price}
        />
        <PremiumInput
          label="Sale Brokerage (total)"
          value={form.sell_brokerage}
          onChangeText={(value) => updateForm('sell_brokerage', value)}
          placeholder="0.00"
          keyboardType="decimal-pad"
          icon="🏦"
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
      </View>

      <PreviewCard title="Sale preview" style={styles.previewCard}>
        <PreviewRow label="Gross sale value" value={previewMoney(grossPaise / 100)} />
        <PreviewRow label="Sale brokerage" value={previewMoney(form.sell_brokerage)} />
        <PreviewRow label="Net proceeds" value={previewMoney(netPaise / 100)} />
        <PreviewRow
          label="Cost basis"
          sub={`Includes ${formatCurrency(buyFeePaise / 100)} purchase brokerage`}
          value={previewMoney(costPaise / 100)}
        />
        {!editing && validQuantity && (
          <PreviewRow label="Shares remaining" value={formatNumber(remainingQuantity)} />
        )}

        <PreviewTotal>
          <PreviewRow
            label="Estimated sale P/L"
            value={`${previewValid && profitLoss >= 0 ? '+' : ''}${previewMoney(profitLoss)}`}
            color={profitLoss >= 0 ? COLORS.profit : COLORS.loss}
            strong
          />
          <PreviewRow
            label="Return"
            value={previewValid ? `${profitLossPercentage >= 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%` : '—'}
            color={profitLoss >= 0 ? COLORS.profit : COLORS.loss}
          />
        </PreviewTotal>
      </PreviewCard>

      <PremiumButton
        title={editing ? 'Save sale changes' : 'Record sale'}
        onPress={handleSubmit}
        loading={loading}
        disabled={!stock || (editing && !changedFields.length)}
        variant={editing ? 'primary' : 'danger'}
        icon={editing ? '💾' : '💸'}
      />
    </FormScreen>
  );
};

const styles = themedStyles(() => ({
  heroCard: {
    marginBottom: SPACING.xl,
  },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  partialBadge: {
    backgroundColor: COLORS.warning + '14',
  },
  fullBadge: {
    backgroundColor: COLORS.loss + '14',
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetButton: {
    height: 32,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '14',
  },
  presetButtonActive: {
    backgroundColor: COLORS.accent,
  },
  presetButtonDisabled: {
    opacity: 0.45,
  },
  presetPressed: {
    opacity: 0.78,
  },
  presetText: {
    ...TYPE.captionMedium,
    color: COLORS.accent,
  },
  presetTextActive: {
    color: COLORS.onAccent,
  },
  presetTextDisabled: {
    color: COLORS.textMuted,
  },
  previewCard: {
    marginBottom: SPACING.xl,
  },
}));
