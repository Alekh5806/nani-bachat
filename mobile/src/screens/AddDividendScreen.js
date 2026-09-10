/**
 * Add Dividend Screen (Admin Only)
 * Form to record a new dividend
 */
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, Pressable
} from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { DatePickerField, todayString, formatDateDisplay } from '../components/DatePickerField';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

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
          <Text style={styles.sectionLabel}>SELECT HOLDING</Text>
          {holdings.length === 0 && (
            <GlassCard style={styles.selectedCard}>
              <Text style={styles.selectedQty}>No active holdings to record a dividend against.</Text>
            </GlassCard>
          )}
          {holdings.map((stock) => {
            const active = selectedStock?.id === stock.id;
            return (
              <Pressable
                key={stock.id}
                onPress={() => setSelectedStock(stock)}
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
                    {formatDateDisplay(stock.buy_date)}
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
