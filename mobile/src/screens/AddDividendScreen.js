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
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

export const AddDividendScreen = ({ navigation }) => {
  const { createDividend, stocks, fetchStocks } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [form, setForm] = useState({
    dividend_per_share: '',
    ex_date: new Date().toISOString().split('T')[0],
    payment_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchStocks();
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
      Toast.show({ type: 'error', text1: 'Error', text2: JSON.stringify(result.error) });
    }
  };

  // Get unique stocks
  const uniqueStocks = stocks.reduce((acc, stock) => {
    if (!acc.find(s => s.symbol === stock.symbol)) {
      acc.push(stock);
    }
    return acc;
  }, []);

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
          {/* ── Stock Selector ── */}
          <Text style={styles.sectionLabel}>SELECT STOCK</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockScroll}>
            {uniqueStocks.map((stock) => (
              <Pressable
                key={stock.id}
                onPress={() => setSelectedStock(stock)}
                style={[
                  styles.stockPill,
                  selectedStock?.id === stock.id && styles.stockPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.stockPillText,
                    selectedStock?.id === stock.id && styles.stockPillTextActive,
                  ]}
                >
                  {stock.symbol?.replace('.NS', '')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedStock && (
            <GlassCard style={styles.selectedCard}>
              <Text style={styles.selectedName}>{selectedStock.name}</Text>
              <Text style={styles.selectedQty}>
                Quantity: {selectedStock.quantity} shares
              </Text>
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

          <PremiumInput
            label="Ex-Dividend Date"
            value={form.ex_date}
            onChangeText={(v) => updateForm('ex_date', v)}
            placeholder="YYYY-MM-DD"
            icon="📅"
          />

          <PremiumInput
            label="Payment Date (Optional)"
            value={form.payment_date}
            onChangeText={(v) => updateForm('payment_date', v)}
            placeholder="YYYY-MM-DD"
            icon="📅"
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
                Per Member: ~₹{((parseFloat(form.dividend_per_share || 0) * selectedStock.quantity) / 10).toFixed(2)}
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
  stockScroll: {
    marginBottom: SPACING.lg,
  },
  stockPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: SPACING.sm,
  },
  stockPillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stockPillText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  stockPillTextActive: {
    color: '#FFFFFF',
  },
  selectedCard: {
    marginBottom: SPACING.lg,
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
