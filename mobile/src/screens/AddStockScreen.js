/**
 * Add Stock Screen (Admin Only)
 * Search stocks like MoneyControl Pro — type to search,
 * see live prices, select, then fill purchase details.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Pressable, ActivityIndicator, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { GlassCard } from '../components/GlassCard';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../theme/colors';

export const AddStockScreen = ({ navigation }) => {
  const { createStock, searchStocks, searchResults, isSearching, clearSearch } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const searchTimeout = useRef(null);

  const [form, setForm] = useState({
    quantity: '',
    buy_price: '',
    brokerage: '0',
    buy_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // ── Debounced search ──
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    setSelectedStock(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 2) {
      clearSearch();
      return;
    }

    searchTimeout.current = setTimeout(() => {
      searchStocks(text);
    }, 400);
  }, []);

  // ── Select a stock from search results ──
  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    updateForm('buy_price', String(stock.current_price));
    clearSearch();
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectedStock) {
      Toast.show({ type: 'error', text1: 'No Stock Selected', text2: 'Search and select a stock first' });
      return;
    }
    if (!form.quantity || !form.buy_price || !form.buy_date) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Fill all required fields' });
      return;
    }

    setLoading(true);
    const result = await createStock({
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      quantity: parseInt(form.quantity),
      buy_price: parseFloat(form.buy_price),
      brokerage: parseFloat(form.brokerage || '0'),
      buy_date: form.buy_date,
      notes: form.notes,
    });
    setLoading(false);

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Stock Added! ✅', text2: `${selectedStock.name} added to portfolio` });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: JSON.stringify(result.error) });
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add Stock"
        subtitle="Search & add investment"
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
          {/* ── Stock Search ── */}
          <Text style={styles.sectionLabel}>🔍 SEARCH STOCK</Text>
          <View style={styles.searchContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Type company name or symbol..."
              placeholderTextColor={COLORS.placeholder}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={COLORS.accent}
                style={styles.searchSpinner}
              />
            )}
          </View>

          {/* ── Search Results Dropdown ── */}
          {searchResults.length > 0 && !selectedStock && (
            <View style={styles.resultsContainer}>
              {searchResults.map((stock, index) => {
                const isPositive = stock.change >= 0;
                const changeColor = isPositive ? COLORS.profit : COLORS.loss;

                return (
                  <Pressable
                    key={stock.symbol + index}
                    onPress={() => handleSelectStock(stock)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && styles.resultRowPressed,
                      index < searchResults.length - 1 && styles.resultBorder,
                    ]}
                  >
                    {/* Left: Symbol badge + name */}
                    <View style={styles.resultLeft}>
                      <View style={[styles.symbolBadge, { backgroundColor: isPositive ? COLORS.profitBg : COLORS.lossBg }]}>
                        <Text style={[styles.symbolBadgeText, { color: changeColor }]}>
                          {stock.symbol.replace('.NS', '').substring(0, 4)}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {stock.name}
                        </Text>
                        <Text style={styles.resultSymbol}>
                          {stock.symbol} • {stock.market_cap_label}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Price + change */}
                    <View style={styles.resultRight}>
                      <Text style={styles.resultPrice}>
                        {formatCurrency(stock.current_price)}
                      </Text>
                      <View style={[styles.changeBadge, { backgroundColor: isPositive ? COLORS.profitBg : COLORS.lossBg }]}>
                        <Text style={[styles.changeText, { color: changeColor }]}>
                          {isPositive ? '▲' : '▼'} {Math.abs(stock.change_percentage).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Selected Stock Card ── */}
          {selectedStock && (
            <GlassCard borderGlow style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.selectedBadge}
                >
                  <Text style={styles.selectedBadgeText}>
                    {selectedStock.symbol.replace('.NS', '').substring(0, 4)}
                  </Text>
                </LinearGradient>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedStock.name}</Text>
                  <Text style={styles.selectedSymbol}>{selectedStock.symbol}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setSelectedStock(null);
                    setSearchQuery('');
                  }}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </Pressable>
              </View>

              <View style={styles.priceGrid}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Live Price</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(selectedStock.current_price)}
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Day Change</Text>
                  <Text style={[
                    styles.priceValue,
                    { color: selectedStock.change >= 0 ? COLORS.profit : COLORS.loss }
                  ]}>
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change} ({selectedStock.change_percentage}%)
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Day High</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(selectedStock.day_high)}
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Day Low</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(selectedStock.day_low)}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* ── Purchase Details (only after stock selected) ── */}
          {selectedStock && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
                📋 PURCHASE DETAILS
              </Text>

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
                <PremiumInput
                  label="Buy Date"
                  value={form.buy_date}
                  onChangeText={(v) => updateForm('buy_date', v)}
                  placeholder="YYYY-MM-DD"
                  icon="📅"
                  style={styles.halfInput}
                />
              </View>

              <PremiumInput
                label="Notes (Optional)"
                value={form.notes}
                onChangeText={(v) => updateForm('notes', v)}
                placeholder="Any additional notes..."
                icon="📝"
                multiline
              />

              {/* ── Investment Preview ── */}
              {form.quantity && form.buy_price && (
                <GlassCard style={styles.previewCard}>
                  <Text style={styles.previewTitle}>💰 Investment Preview</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Cost ({form.quantity} × ₹{form.buy_price})</Text>
                    <Text style={styles.previewValue}>
                      {formatCurrency(parseInt(form.quantity || 0) * parseFloat(form.buy_price || 0))}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Brokerage</Text>
                    <Text style={styles.previewValue}>
                      {formatCurrency(form.brokerage || 0)}
                    </Text>
                  </View>
                  <View style={[styles.previewRow, styles.previewTotal]}>
                    <Text style={styles.previewTotalLabel}>Total Investment</Text>
                    <Text style={styles.previewTotalValue}>
                      {formatCurrency(
                        (parseInt(form.quantity || 0) * parseFloat(form.buy_price || 0))
                        + parseFloat(form.brokerage || 0)
                      )}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Current Value</Text>
                    <Text style={[styles.previewValue, { color: COLORS.accent }]}>
                      {formatCurrency(parseInt(form.quantity || 0) * selectedStock.current_price)}
                    </Text>
                  </View>
                </GlassCard>
              )}

              <PremiumButton
                title="Add Investment"
                onPress={handleSubmit}
                loading={loading}
                icon="✅"
                style={{ marginTop: SPACING.lg }}
              />
            </>
          )}

          <View style={{ height: 120 }} />
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
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
  },
  searchSpinner: {
    marginLeft: SPACING.sm,
  },

  // Results dropdown
  resultsContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  resultRowPressed: {
    backgroundColor: COLORS.surface,
  },
  resultBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  symbolBadgeText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultSymbol: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  resultPrice: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  changeText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },

  // Selected stock card
  selectedCard: {
    marginBottom: SPACING.md,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  selectedBadge: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: FONTS.sm,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  selectedSymbol: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  changeBtnText: {
    color: COLORS.accent,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  priceItem: {
    width: '50%',
    paddingVertical: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Form
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },

  // Preview
  previewCard: {
    marginTop: SPACING.md,
  },
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
  previewLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  previewTotalLabel: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  previewTotalValue: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.accent,
  },
});
