/**
 * Edit Stock Screen (Admin Only)
 *
 * Corrects a recorded purchase: quantity, price, brokerage, date or buyer.
 *
 * Any of those changes what the month actually spent, which moves the
 * collected-vs-spent gap, which moves the buyer's advance — and every later
 * month's installments hang off that chain. So a successful save offers to
 * re-settle the edited month and each month after it, in date order.
 */
import { shortName } from '../utils/names';
import { missingFields } from '../utils/formErrors';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
import { Alert } from '../utils/alert';
import { usePortfolioStore } from '../store/portfolioStore';
import { FormScreen, FormLabel } from '../components/FormScreen';
import { SelectedStockCard } from '../components/SelectedStockCard';
import { PreviewCard, PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { BuyerPicker } from '../components/BuyerPicker';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { DatePickerField, todayString, formatDateDisplay } from '../components/DatePickerField';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatMonth = (month) => {
  const parts = String(month || '').split('-');
  const index = parseInt(parts[1], 10) - 1;
  if (index >= 0 && index < 12) return `${MONTH_NAMES[index]} ${parts[0]}`;
  return month;
};

export const EditStockScreen = ({ navigation, route }) => {
  const stock = route.params?.stock;
  const { updateStock, settleMonth, members, fetchMembers } = usePortfolioStore();

  const [loading, setLoading] = useState(false);
  const [resettling, setResettling] = useState(false);
  const [form, setForm] = useState({
    quantity: stock?.quantity != null ? String(stock.quantity) : '',
    buy_price: stock?.buy_price != null ? String(stock.buy_price) : '',
    brokerage: stock?.brokerage != null ? String(stock.brokerage) : '0',
    buy_date: stock?.buy_date || todayString(),
    buyer: stock?.buyer != null ? String(stock.buyer) : '',
  });

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Fields that failed the last submit; each shows a red border until edited.
  const [errors, setErrors] = useState({});
  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const formatCurrency = (value) =>
    `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const originalTotal = useMemo(() => (
    Number(stock?.total_invested ?? (Number(stock?.buy_price) * Number(stock?.quantity) + Number(stock?.brokerage))) || 0
  ), [stock]);

  const sameTerms = Number(form.quantity) === Number(stock?.quantity) && Number(form.buy_price) === Number(stock?.buy_price);
  const gross = sameTerms && stock?.reported_share_amount != null
    ? Number(stock.reported_share_amount) : Number(form.quantity) * Number(form.buy_price);
  const newTotal = gross + Number(form.brokerage);
  const totalDelta = newTotal - originalTotal;

  const originalMonth = String(stock?.buy_date || '').slice(0, 7);
  const newMonth = String(form.buy_date || '').slice(0, 7);

  /**
   * Re-runs settlement from `fromMonth` forward, oldest first, so each month's
   * advance is recomputed before the one that depends on it. Months without
   * share purchases simply have nothing to settle and are skipped.
   */
  const resettleFrom = async (fromMonth) => {
    setResettling(true);
    try {
      const response = await api.get('/contributions/months/');
      const months = (response.data || [])
        .map((row) => row.month)
        .filter((month) => month && month >= fromMonth)
        .sort();

      if (!months.includes(fromMonth)) months.unshift(fromMonth);

      let settled = 0;
      const failures = [];
      for (const month of months) {
        // force: these months were already settled; the chain must stay whole
        // even where a later month still has an outstanding contribution.
        const result = await settleMonth(month, { force: true });
        if (result.success) settled += 1;
        else failures.push(formatMonth(month));
      }

      Toast.show({
        type: settled > 0 ? 'success' : 'error',
        text1: settled > 0 ? `Re-settled ${settled} month${settled > 1 ? 's' : ''}` : 'Nothing re-settled',
        text2: failures.length > 0
          ? `Skipped: ${failures.join(', ')}`
          : 'Advance chain is up to date',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Re-settle Failed',
        text2: 'Could not load the month list. Settle manually from Contributions.',
      });
    } finally {
      setResettling(false);
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!stock?.id) {
      Toast.show({ type: 'error', text1: 'Missing Stock', text2: 'Open this screen from a purchase' });
      return;
    }
    const missing = missingFields(form, ['quantity', 'buy_price', 'buy_date', 'buyer']);
    if (Object.keys(missing).length) {
      setErrors(missing);
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Quantity, price, date and buyer are required' });
      return;
    }
    setErrors({});

    setLoading(true);
    const result = await updateStock(stock.id, {
      quantity: parseInt(form.quantity, 10),
      buy_price: parseFloat(form.buy_price),
      brokerage: parseFloat(form.brokerage || '0'),
      buy_date: form.buy_date,
      buyer: Number(form.buyer),
    });
    setLoading(false);

    if (!result.success) {
      Toast.show({ type: 'error', text1: 'Could Not Save', text2: result.error });
      return;
    }

    Toast.show({ type: 'success', text1: 'Purchase Updated', text2: `${shortName(stock.name)} saved` });

    // A move across months invalidates both the old and the new one, so start
    // the re-settle from whichever is earlier.
    const fromMonth = [originalMonth, newMonth].filter(Boolean).sort()[0];
    Alert.alert(
      'Re-settle Affected Months?',
      `This edit changes what ${formatMonth(fromMonth)} spent. ${formatMonth(fromMonth)} and every `
        + 'month after it must be re-settled, or the buyer\'s advance chain will be wrong.',
      [
        { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() },
        { text: 'Re-settle Now', onPress: () => resettleFrom(fromMonth) },
      ]
    );
  };

  if (!stock) {
    return (
      <FormScreen title="Edit Purchase" onBack={() => navigation.goBack()}>
        <Text style={styles.emptyText}>Open this screen from a purchase in Investments.</Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Edit Purchase" subtitle={stock.symbol} onBack={() => navigation.goBack()}>
      <SelectedStockCard
        symbol={stock.symbol}
        name={stock.name}
        style={styles.stockCard}
        rows={[
          { label: 'Quantity', value: `${stock.quantity} shares` },
          { label: 'Buy price', value: `₹${stock.buy_price}` },
          { label: 'Bought on', value: formatDateDisplay(stock.buy_date) },
        ]}
      />

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Editing rewrites the settlement</Text>
        <Text style={styles.warningText}>
          Price, quantity and brokerage all change what {formatMonth(originalMonth)} spent.
          You will be asked to re-settle that month and the ones after it.
        </Text>
      </View>

      <FormLabel>Purchase details</FormLabel>
      <View style={styles.detailsCard}>
        <PremiumInput
          label="Quantity"
          error={errors.quantity}
          value={form.quantity}
          onChangeText={(v) => updateForm('quantity', v)}
          placeholder="Shares"
          keyboardType="numeric"
          icon="📦"
        />
        <PremiumInput
          label="Buy Price (₹)"
          error={errors.buy_price}
          value={form.buy_price}
          onChangeText={(v) => updateForm('buy_price', v)}
          placeholder="Per share"
          keyboardType="decimal-pad"
          icon="💵"
        />

        <PremiumInput
          label="Brokerage (₹)"
          value={form.brokerage}
          onChangeText={(v) => updateForm('brokerage', v)}
          placeholder="0"
          keyboardType="decimal-pad"
          icon="🏦"
        />
        <DatePickerField
          label="Buy Date"
          error={errors.buy_date}
          value={form.buy_date}
          onChange={(v) => updateForm('buy_date', v)}
          maxDate={todayString()}
        />

        <BuyerPicker members={members} value={form.buyer} onChange={(id) => updateForm('buyer', id)} error={errors.buyer} />
      </View>

      <PreviewCard title="Cost change" style={styles.previewCard}>
        <PreviewRow label="Recorded cost" value={formatCurrency(originalTotal)} />
        <PreviewRow label="New cost" value={formatCurrency(newTotal)} />
        <PreviewTotal>
          <PreviewRow
            label="Difference"
            value={`${totalDelta > 0 ? '+' : ''}${formatCurrency(totalDelta)}`}
            color={totalDelta === 0 ? COLORS.textSecondary : totalDelta > 0 ? COLORS.loss : COLORS.profit}
            strong
          />
        </PreviewTotal>
        {originalMonth !== newMonth && (
          <Text style={styles.monthMoveNote}>
            Moving this purchase from {formatMonth(originalMonth)} to {formatMonth(newMonth)}
            {' '}re-settles both months.
          </Text>
        )}
      </PreviewCard>

      {resettling && (
        <View style={styles.resettleRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.resettleText}>Re-settling affected months...</Text>
        </View>
      )}

      <PremiumButton
        title="Save Changes"
        onPress={handleSubmit}
        loading={loading}
        disabled={resettling}
        icon="💾"
        style={{ marginTop: SPACING.lg }}
      />
    </FormScreen>
  );
};

export default EditStockScreen;

const styles = themedStyles(() => ({
  emptyText: {
    ...TYPE.cardTitle,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  stockCard: { marginBottom: SPACING.md },
  detailsCard: { marginBottom: SPACING.xl },
  warningBox: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warning + '14',
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  warningTitle: { ...TYPE.secondaryMedium, color: COLORS.warning },
  warningText: { ...TYPE.secondary, color: COLORS.textSecondary, marginTop: SPACING.xs },
  previewCard: {},
  monthMoveNote: {
    ...TYPE.secondary,
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  resettleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  resettleText: { ...TYPE.secondary, color: COLORS.textSecondary, flexShrink: 1 },
}));
