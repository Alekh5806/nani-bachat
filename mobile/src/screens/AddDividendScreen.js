/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text
} from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { DatePickerField, todayString, formatDateDisplay } from '../components/DatePickerField';
import { HoldingSelect } from '../components/HoldingSelect';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

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

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!selectedStock || !form.dividend_per_share || !form.ex_date) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Select stock and enter dividend details' });
      return;
    }

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
          {/* ── Holding Selector ── */}
          <HoldingSelect
            label="Select holding"
            holdings={holdings}
            selected={selectedStock}
            onSelect={setSelectedStock}
            emptyText="No active holdings to record a dividend against."
          />

          {selectedStock && (
            <GlassCard style={styles.selectedCard} borderGlow>
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
            label="Ex-Dividend Date"
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
            <GlassCard style={styles.previewCard} borderGlow>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewText}>
                Total Dividend: ₹{(parseFloat(form.dividend_per_share || 0) * selectedStock.quantity).toFixed(2)}
              </Text>
              <Text style={styles.previewText}>
                Per Member: ~₹{(
                  (parseFloat(form.dividend_per_share || 0) * selectedStock.quantity)
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

          <TabBarSpacer />
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
    paddingHorizontal: SPACING.xl,
    paddingBottom: 0,
  },
  selectedCard: {
    marginBottom: SPACING.lg,
  },
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedItem: {
    width: '50%',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  selectedLabel: {
    ...TYPE.caption,
    color: COLORS.textMuted,
  },
  selectedValue: {
    ...TYPE.smallValue,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  selectedQty: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  previewCard: {
    marginTop: SPACING.lg,
  },
  previewTitle: {
    ...TYPE.cardTitle,
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  previewText: {
    ...TYPE.body,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
}));
