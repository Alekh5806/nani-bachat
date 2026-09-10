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
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
import { Alert } from '../utils/alert';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { DatePickerField, todayString } from '../components/DatePickerField';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';

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

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const formatCurrency = (value) =>
    `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const originalTotal = useMemo(() => (
    (Number(stock?.buy_price) || 0) * (Number(stock?.quantity) || 0)
    + (Number(stock?.brokerage) || 0)
  ), [stock]);

  const newTotal = (parseInt(form.quantity || 0, 10) * parseFloat(form.buy_price || 0))
    + parseFloat(form.brokerage || 0);
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
    if (!form.quantity || !form.buy_price || !form.buy_date || !form.buyer) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Quantity, price, date and buyer are required' });
      return;
    }

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

    Toast.show({ type: 'success', text1: 'Purchase Updated', text2: `${stock.name} saved` });

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
      <View style={styles.container}>
        <ScreenHeader title="Edit Purchase" showBack onBack={() => navigation.goBack()} />
        <Text style={styles.emptyText}>Open this screen from a purchase in Investments.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Edit Purchase"
        subtitle={stock.symbol}
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
          <GlassCard style={styles.heroCard}>
            <Text style={styles.stockName}>{stock.name}</Text>
            <Text style={styles.stockMeta}>
              {stock.symbol} • originally {stock.quantity} × ₹{stock.buy_price} on {stock.buy_date}
            </Text>
          </GlassCard>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Editing rewrites the settlement</Text>
            <Text style={styles.warningText}>
              Price, quantity and brokerage all change what {formatMonth(originalMonth)} spent.
              You will be asked to re-settle that month and the ones after it.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>📋 PURCHASE DETAILS</Text>

          <View style={styles.row}>
            <PremiumInput
              label="Quantity"
              value={form.quantity}
              onChangeText={(v) => updateForm('quantity', v)}
              placeholder="Shares"
              keyboardType="numeric"
              icon="📦"
              style={styles.halfInput}
            />
            <PremiumInput
              label="Buy Price (₹)"
              value={form.buy_price}
              onChangeText={(v) => updateForm('buy_price', v)}
              placeholder="Per share"
              keyboardType="decimal-pad"
              icon="💵"
              style={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <PremiumInput
              label="Brokerage (₹)"
              value={form.brokerage}
              onChangeText={(v) => updateForm('brokerage', v)}
              placeholder="0"
              keyboardType="decimal-pad"
              icon="🏦"
              style={styles.halfInput}
            />
            <DatePickerField
              label="Buy Date"
              value={form.buy_date}
              onChange={(v) => updateForm('buy_date', v)}
              maxDate={todayString()}
              style={styles.halfInput}
            />
          </View>

          <View style={styles.buyerSection}>
            <Text style={styles.inputLabel}>Buyer</Text>
            <View style={styles.buyerList}>
              {members.map((member) => {
                const selected = String(member.id) === String(form.buyer);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => updateForm('buyer', String(member.id))}
                    style={({ pressed }) => [
                      styles.buyerChip,
                      selected && styles.buyerChipSelected,
                      pressed && styles.buyerChipPressed,
                    ]}
                  >
                    <Text
                      style={[styles.buyerChipText, selected && styles.buyerChipTextSelected]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <GlassCard style={styles.previewCard}>
            <Text style={styles.previewTitle}>💰 Cost Change</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Recorded cost</Text>
              <Text style={styles.previewValue}>{formatCurrency(originalTotal)}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>New cost</Text>
              <Text style={styles.previewValue}>{formatCurrency(newTotal)}</Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewTotalLabel}>Difference</Text>
              <Text
                style={[
                  styles.previewTotalValue,
                  { color: totalDelta === 0 ? COLORS.textSecondary : totalDelta > 0 ? COLORS.loss : COLORS.profit },
                ]}
              >
                {totalDelta > 0 ? '+' : ''}{formatCurrency(totalDelta)}
              </Text>
            </View>
            {originalMonth !== newMonth && (
              <Text style={styles.monthMoveNote}>
                Moving this purchase from {formatMonth(originalMonth)} to {formatMonth(newMonth)}
                {' '}re-settles both months.
              </Text>
            )}
          </GlassCard>

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

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EditStockScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.md,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  heroCard: { marginBottom: SPACING.md },
  stockName: { fontSize: FONTS.lg, fontWeight: '700', color: COLORS.textPrimary },
  stockMeta: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 4 },
  warningBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '55',
    backgroundColor: COLORS.warningBg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  warningTitle: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.warning },
  warningText: { fontSize: FONTS.xs, color: COLORS.textSecondary, lineHeight: 17, marginTop: 4 },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row', gap: SPACING.md },
  halfInput: { flex: 1 },
  inputLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  buyerSection: { marginBottom: SPACING.md },
  buyerList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  buyerChip: {
    maxWidth: '48%',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBg,
  },
  buyerChipSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
  buyerChipPressed: { opacity: 0.75 },
  buyerChipText: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: '700' },
  buyerChipTextSelected: { color: COLORS.accent },
  previewCard: { marginTop: SPACING.md },
  previewTitle: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  previewLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  previewValue: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.textPrimary },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  previewTotalLabel: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.textPrimary },
  previewTotalValue: { fontSize: FONTS.lg, fontWeight: '800' },
  monthMoveNote: {
    fontSize: FONTS.xs,
    color: COLORS.warning,
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
  resettleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  resettleText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
});
