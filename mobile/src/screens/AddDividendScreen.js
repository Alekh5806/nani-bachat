/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, Pressable
} from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { DatePickerField, todayString, formatDateDisplay } from '../components/DatePickerField';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

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

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!selectedStock || !form.dividend_per_share || !form.ex_date || !form.payment_date) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Select stock and enter dividend details' });
      return;
    }

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
    <View style={styles.container}>
      <ScreenHeader
        title="Add Dividend"
        subtitle="Record dividend income"
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

          {selectedStock && (
            <GlassCard style={styles.selectedCard} borderGlow>
              <Text style={styles.selectedName}>{selectedStock.name}</Text>
              <View style={styles.selectedGrid}>
                <View style={styles.selectedItem}>
                  <Text style={styles.selectedLabel}>Quantity</Text>
                  <Text style={styles.selectedValue}>{selectedStock.quantity} shares</Text>
                </View>
                <View style={styles.selectedItem}>
                  <Text style={styles.selectedLabel}>Buyer</Text>
                  <Text style={styles.selectedValue} numberOfLines={1}>
                    {selectedStock.buyer_name || 'Not recorded'}
                  </Text>
                </View>
                <View style={styles.selectedItem}>
                  <Text style={styles.selectedLabel}>Buy Price</Text>
                  <Text style={styles.selectedValue}>₹{selectedStock.buy_price}</Text>
                </View>
                <View style={styles.selectedItem}>
                  <Text style={styles.selectedLabel}>Buy Date</Text>
                  <Text style={styles.selectedValue}>{formatDateDisplay(selectedStock.buy_date)}</Text>
                </View>
              </View>
            </GlassCard>
          )}

          <PremiumInput
            label="Dividend Per Share (₹)"
            value={form.dividend_per_share}
            onChangeText={(v) => updateForm('dividend_per_share', v)}
            placeholder="Amount per share"
            keyboardType="decimal-pad"
            icon="💵"
          />

          <DatePickerField
            label="Date payment was received"
            value={form.payment_date}
            onChange={(v) => updateForm('payment_date', v)}
            maxDate={todayString()}
            minDate={form.ex_date}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.huge,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  holdingRowActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '14',
  },
  holdingRowPressed: {
    opacity: 0.8,
  },
  holdingLeft: {
    flex: 1,
    minWidth: 0,
  },
  holdingRight: {
    marginLeft: SPACING.md,
  },
  holdingSymbol: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  holdingSymbolActive: {
    color: COLORS.accent,
  },
  holdingName: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  holdingBuyer: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 4,
  },
  holdingMeta: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  holdingCheck: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.accent,
  },
  holdingSelect: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  selectedCard: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  selectedItem: {
    width: '50%',
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.sm,
  },
  selectedLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  selectedValue: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  selectedName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    fontWeight: '700',
  },
  selectedQty: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    marginTop: 4,
  },
  previewCard: {
    marginTop: SPACING.lg,
  },
  previewTitle: {
    color: COLORS.accent,
    fontSize: FONTS.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  previewText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    fontWeight: '600',
    marginBottom: 4,
  },
});
