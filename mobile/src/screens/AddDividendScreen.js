/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { missingFields } from '../utils/formErrors';
import { SelectedStockCard } from '../components/SelectedStockCard';
import { PreviewCard, PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { fmtFull } from '../utils/currency';
import { FormScreen } from '../components/FormScreen';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { DatePickerField, todayString, formatDateDisplay } from '../components/DatePickerField';
import { HoldingSelect } from '../components/HoldingSelect';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const AddDividendScreen = ({ navigation }) => {
  const { createDividend, stocks, fetchStocks, members, fetchMembers } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [form, setForm] = useState({
    dividend_per_share: '',
    ex_date: todayString(),
    payment_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchStocks();
    fetchMembers();
  }, []);

  // Fields that failed the last submit; each shows a red border until edited.
  const [errors, setErrors] = useState({});
  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async () => {
    const missing = missingFields(form, ['dividend_per_share', 'ex_date']);
    if (!selectedStock) missing.stock = 'Required';
    if (Object.keys(missing).length) {
      setErrors(missing);
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Select stock and enter dividend details' });
      return;
    }
    setErrors({});

    setLoading(true);
    const result = await createDividend({
      stock: selectedStock.id,
      dividend_per_share: parseFloat(form.dividend_per_share),
      ex_date: form.ex_date,
      payment_date: form.payment_date || null,
      notes: form.notes,
    });
    setLoading(false);

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Dividend Added', text2: 'Recorded successfully' });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: 'Could Not Record Dividend', text2: result.error });
    }
  };

  // Split is equal across active members, matching the backend's
  // per_member_share; falls back to 1 so the preview never divides by zero.
  const memberCount = members.filter((m) => m.is_active !== false).length;

  // A dividend is recorded against one purchase lot, and each lot has its own
  // buyer and quantity — so list the lots rather than collapsing by symbol.
  const holdings = [...stocks].sort((a, b) => (
    String(a.symbol || '').localeCompare(String(b.symbol || ''))
    || String(b.buy_date || '').localeCompare(String(a.buy_date || ''))
  ));

  return (
    <FormScreen
      title="Add Dividend"
      subtitle="Record dividend income"
      onBack={() => navigation.goBack()}
    >
      {/* ── Holding Selector ── */}
      <HoldingSelect
        label="Select holding"
        holdings={holdings}
        selected={selectedStock}
        onSelect={(h) => { setSelectedStock(h); setErrors((prev) => ({ ...prev, stock: undefined })); }}
        error={errors.stock}
        emptyText="No active holdings to record a dividend against."
      />

      {selectedStock && (
        <SelectedStockCard
          symbol={selectedStock.symbol}
          name={selectedStock.name}
          style={styles.selectedCard}
          rows={[
            { label: 'Quantity', value: `${selectedStock.quantity} shares` },
            { label: 'Buyer', value: selectedStock.buyer_name || 'Not recorded' },
            { label: 'Buy Price', value: `₹${selectedStock.buy_price}` },
            { label: 'Buy Date', value: formatDateDisplay(selectedStock.buy_date) },
          ]}
        />
      )}

      <PremiumInput
        label="Dividend Per Share (₹)"
        error={errors.dividend_per_share}
        value={form.dividend_per_share}
        onChangeText={(v) => updateForm('dividend_per_share', v)}
        placeholder="Amount per share"
        keyboardType="decimal-pad"
        icon="💵"
      />

      <DatePickerField
        label="Ex-Dividend Date"
        error={errors.ex_date}
        value={form.ex_date}
        onChange={(v) => updateForm('ex_date', v)}
        minDate={selectedStock?.buy_date}
      />

      <DatePickerField
        label="Payment Date (Optional)"
        value={form.payment_date}
        onChange={(v) => updateForm('payment_date', v)}
        placeholder="Not paid yet"
        minDate={form.ex_date}
        clearable
      />

      <PremiumInput
        label="Notes (Optional)"
        value={form.notes}
        onChangeText={(v) => updateForm('notes', v)}
        placeholder="Any notes..."
        icon="📝"
        multiline
      />

      {selectedStock && form.dividend_per_share && (
        <PreviewCard title="Dividend preview" style={styles.previewCard}>
          <PreviewRow label="Dividend per share" value={fmtFull(form.dividend_per_share)} />
          <PreviewRow label="Shares" value={String(selectedStock.quantity)} />
          <PreviewTotal>
            <PreviewRow
              label="Total dividend"
              value={fmtFull(parseFloat(form.dividend_per_share || 0) * selectedStock.quantity)}
              strong
            />
            <PreviewRow
              label="Per member"
              sub={`Split across ${memberCount} members`}
              value={`~${fmtFull(
                (parseFloat(form.dividend_per_share || 0) * selectedStock.quantity) / Math.max(memberCount, 1)
              )}`}
            />
          </PreviewTotal>
        </PreviewCard>
      )}

      <PremiumButton
        title="Record Dividend"
        onPress={handleSubmit}
        loading={loading}
        icon="✅"
        style={{ marginTop: SPACING.lg }}
      />
    </FormScreen>
  );
};

const styles = themedStyles(() => ({
  selectedCard: {
    marginBottom: SPACING.lg,
  },
  previewCard: {
    marginTop: SPACING.lg,
  },
}));
