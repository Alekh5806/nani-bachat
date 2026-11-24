/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
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
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

function receiptPreview(rate, quantity) {
  const match = /^(\d{1,8})(?:\.(\d{1,6}))?$/.exec(rate.trim());
  if (!match || !quantity) return null;
  const micros = BigInt(match[1] + (match[2] || '').padEnd(6, '0')) * BigInt(quantity);
  const paise = (micros + BigInt(5000)) / BigInt(10000);
  return Number(paise) / 100;
}

export const AddDividendScreen = ({ navigation }) => {
  const { createDividend, members, fetchMembers } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [submissionKey] = useState(() => globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  const [holdings, setHoldings] = useState(null);
  const [holdingsError, setHoldingsError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const selectedStock = holdings?.find(stock => stock.id === selectedId);
  const [form, setForm] = useState({
    dividend_per_share: '',
    ex_date: todayString(),
    payment_date: todayString(),
    notes: '',
  });

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    const controller = new AbortController();
    setHoldings(null);
    setSelectedId(null);
    setHoldingsError(false);
    async function loadLots() {
      const lots = [];
      let page = 1;
      while (!controller.signal.aborted) {
        const { data } = await api.get('/investments/stocks/', {
          params: { dividend_ex_date: form.ex_date, page }, signal: controller.signal,
        });
        lots.push(...(data.results || data));
        if (!data.next) break;
        page += 1;
      }
      if (!controller.signal.aborted) setHoldings(lots);
    }
    loadLots().catch(() => { if (!controller.signal.aborted) setHoldingsError(true); });
    return () => controller.abort();
  }, [form.ex_date, retry]);

  // Fields that failed the last submit; each shows a red border until edited.
  const [errors, setErrors] = useState({});
  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async () => {
    const missing = missingFields(form, ['dividend_per_share', 'ex_date', 'payment_date']);
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
      expected_quantity: selectedStock.quantity,
      submission_key: submissionKey,
      dividend_per_share: form.dividend_per_share.trim(),
      ex_date: form.ex_date,
      payment_date: form.payment_date,
      notes: form.notes,
    });
    setLoading(false);

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Dividend Added', text2: 'Recorded successfully' });
      navigation.goBack();
    } else {
      setRetry(value => value + 1);
      Toast.show({ type: 'error', text1: 'Could Not Record Dividend', text2: result.error });
    }
  };

  // Split is equal across active members, matching the backend's
  // per_member_share; falls back to 1 so the preview never divides by zero.
  const preview = receiptPreview(form.dividend_per_share, selectedStock?.quantity);
  const memberCount = members.filter((m) => m.is_active !== false).length;

  return (
    <FormScreen
      title="Add Dividend"
      subtitle="Record dividend income"
      onBack={() => navigation.goBack()}
    >
      <DatePickerField
        label="Ex-Dividend Date"
        error={errors.ex_date}
        value={form.ex_date}
        onChange={(day) => { setSelectedId(null); updateForm('ex_date', day); }}
        maxDate={todayString()}
      />
      {holdingsError ? (
        <PremiumButton title="Retry Loading Holdings" variant="outline" onPress={() => setRetry(value => value + 1)} />
      ) : holdings === null ? (
        <Text style={styles.loadingLots}>Loading eligible holdings…</Text>
      ) : <HoldingSelect
        label="Select holding"
        holdings={holdings}
        selected={selectedStock}
        onSelect={(h) => { setSelectedId(h.id); setErrors((prev) => ({ ...prev, stock: undefined })); }}
        error={errors.stock}
        emptyText="No lots qualified on this ex-dividend date."
      />}

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
            ...(selectedStock.is_sold ? [{ label: 'Sell Date', value: formatDateDisplay(selectedStock.sell_date) }] : []),
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
        label="Payment Date"
        error={errors.payment_date}
        value={form.payment_date}
        onChange={(v) => updateForm('payment_date', v)}
        minDate={form.ex_date}
        maxDate={todayString()}
      />

      <PremiumInput
        label="Notes (Optional)"
        value={form.notes}
        onChangeText={(v) => updateForm('notes', v)}
        placeholder="Any notes..."
        icon="📝"
        multiline
      />

      {preview !== null && (
        <PreviewCard title="Dividend preview" style={styles.previewCard}>
          <PreviewRow label="Dividend per share" value={`₹${form.dividend_per_share.trim()}`} />
          <PreviewRow label="Shares" value={String(selectedStock.quantity)} />
          <PreviewTotal>
            <PreviewRow
              label="Total dividend"
              value={fmtFull(preview)}
              strong
            />
            <PreviewRow
              label="Per member"
              sub={`Split across ${memberCount} members`}
              value={`~${fmtFull(preview / Math.max(memberCount, 1))}`}
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
  loadingLots: { ...TYPE.secondary, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  selectedCard: {
    marginBottom: SPACING.lg,
  },
  previewCard: {
    marginTop: SPACING.lg,
  },
}));
