/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
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
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';

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
<<<<<<< HEAD
    const missing = missingFields(form, ['dividend_per_share', 'ex_date']);
    if (!selectedStock) missing.stock = 'Required';
    if (Object.keys(missing).length) {
      setErrors(missing);
=======
    if (!selectedStock || !form.dividend_per_share || !form.ex_date || !form.payment_date) {
>>>>>>> experiment/live-market-quotes
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
      {/* ── Holding Selector ── */}
      <HoldingSelect
        label="Select holding"
        holdings={holdings}
        selected={selectedStock}
        onSelect={(h) => { setSelectedStock(h); setErrors((prev) => ({ ...prev, stock: undefined })); }}
        error={errors.stock}
        emptyText="No active holdings to record a dividend against."
      />

<<<<<<< HEAD
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
=======
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <DatePickerField label="Ex-Dividend Date" value={form.ex_date}
            onChange={(day) => { setSelectedId(null); updateForm('ex_date', day); }}
            maxDate={todayString()} />
          {/* ── Holding Selector ── */}
          <Text style={styles.sectionLabel}>SELECT HOLDING</Text>
          {holdingsError && (
            <Text style={styles.holdingSelect} onPress={() => setRetry(value => value + 1)}>
              Could not load holdings. Tap to retry.
            </Text>
          )}
          {!holdings && !holdingsError && <Text style={styles.selectedQty}>Loading eligible lots…</Text>}
          {holdings?.length === 0 && (
            <GlassCard style={styles.selectedCard}>
              <Text style={styles.selectedQty}>No lots qualified on this ex-dividend date.</Text>
            </GlassCard>
          )}
          {holdings?.map((stock) => {
            const active = selectedStock?.id === stock.id;
            return (
              <Pressable
                key={stock.id}
                onPress={() => setSelectedId(stock.id)}
                style={({ pressed }) => [
                  styles.holdingRow,
                  active && styles.holdingRowActive,
                  pressed && styles.holdingRowPressed,
                ]}
              >
                <View style={styles.holdingLeft}>
                  <Text style={[styles.holdingSymbol, active && styles.holdingSymbolActive]}>
                    {stock.symbol?.replace('.NS', '')}
                  </Text>
                  <Text style={styles.holdingName} numberOfLines={1}>{stock.name}</Text>
                  {/* Whose demat holds these shares — the dividend lands there. */}
                  <Text style={styles.holdingBuyer}>
                    👤 Buyer: {stock.buyer_name || 'Not recorded'}
                  </Text>
                  <Text style={styles.holdingMeta}>
                    {stock.quantity} shares · bought at ₹{stock.buy_price} on{' '}
                    {formatDateDisplay(stock.buy_date)}{stock.is_sold ? ` · sold ${formatDateDisplay(stock.sell_date)}` : ''}
                  </Text>
                </View>
                <View style={styles.holdingRight}>
                  {active
                    ? <Text style={styles.holdingCheck}>✓</Text>
                    : <Text style={styles.holdingSelect}>Select</Text>}
                </View>
              </Pressable>
            );
          })}
>>>>>>> experiment/live-market-quotes

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

<<<<<<< HEAD
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
=======
          <DatePickerField
            label="Date payment was received"
            value={form.payment_date}
            onChange={(v) => updateForm('payment_date', v)}
            maxDate={todayString()}
            minDate={form.ex_date}
          />
>>>>>>> experiment/live-market-quotes

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

<<<<<<< HEAD
      <PremiumButton
        title="Record Dividend"
        onPress={handleSubmit}
        loading={loading}
        icon="✅"
        style={{ marginTop: SPACING.lg }}
      />
    </FormScreen>
=======
          {preview !== null && (
            <GlassCard style={styles.previewCard} borderGlow>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewText}>
                Total Dividend: ₹{preview.toFixed(2)}
              </Text>
              <Text style={styles.previewText}>
                Per Member: ~₹{(
                  preview
                  / Math.max(memberCount, 1)
                ).toFixed(2)} ({memberCount} members)
              </Text>
            </GlassCard>
          )}

          <PremiumButton
            title="Record Dividend"
            onPress={handleSubmit}
            loading={loading}
            icon="✅"
            style={{ marginTop: SPACING.lg }}
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
>>>>>>> experiment/live-market-quotes
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
