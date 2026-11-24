/**
 * Add Stock Screen (Admin Only)
 * Search stocks like MoneyControl Pro — type to search,
 * see live prices, select, then fill purchase details.
 */
import { shortName } from '../utils/names';
import { missingFields } from '../utils/formErrors';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Platform, Pressable, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

import { usePortfolioStore } from '../store/portfolioStore';
import { FormScreen, FormLabel } from '../components/FormScreen';
import { SelectedStockCard } from '../components/SelectedStockCard';
import { BuyerPicker } from '../components/BuyerPicker';
import { PreviewCard, PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { PremiumInput } from '../components/PremiumInput';
import { PremiumButton } from '../components/PremiumButton';
import { DatePickerField, todayString } from '../components/DatePickerField';
import { CompanyLogo } from '../components/CompanyLogo';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const AddStockScreen = ({ navigation }) => {
  const {
    createStock,
    searchStocks,
    searchResults,
    isSearching,
    clearSearch,
    members,
    fetchMembers,
    dashboard,
    fetchDashboard,
  } = usePortfolioStore();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const searchTimeout = useRef(null);

  const [form, setForm] = useState({
    quantity: '',
    buy_price: '',
    brokerage: '0',
    buy_date: todayString(),
    buyer: '',
    notes: '',
  });

  // Fields that failed the last submit; each shows a red border until edited.
  const [errors, setErrors] = useState({});
  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const normalizeManualSymbol = (value) => {
    const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleaned) return '';
    if (cleaned.endsWith('.NS') || cleaned.endsWith('.BO')) return cleaned;
    return `${cleaned}.NS`;
  };

  useEffect(() => {
    fetchMembers();
    fetchDashboard();
  }, [fetchMembers, fetchDashboard]);

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

  const handleManualSelect = () => {
    const symbol = normalizeManualSymbol(searchQuery);
    if (!symbol) {
      Toast.show({ type: 'error', text1: 'Enter Symbol', text2: 'Type the trading symbol first' });
      return;
    }

    const displayName = searchQuery.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    setSelectedStock({
      symbol,
      name: displayName,
      current_price: Number(form.buy_price) || 0,
      change: 0,
      change_percentage: 0,
      day_high: Number(form.buy_price) || 0,
      day_low: Number(form.buy_price) || 0,
      manual: true,
    });
    setSearchQuery(displayName);
    clearSearch();
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectedStock) {
      setErrors({ search: 'Required' });
      Toast.show({ type: 'error', text1: 'No Stock Selected', text2: 'Search and select a stock first' });
      return;
    }
    const missing = missingFields(form, ['quantity', 'buy_price', 'buy_date', 'buyer']);
    if (Object.keys(missing).length) {
      setErrors(missing);
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Fill all required fields' });
      return;
    }
    setErrors({});

    // A shortfall is allowed: the named buyer fronts it and settling the month
    // credits it back to them. Only block when there is nobody to charge.
    const totalInvestment = getTotalInvestment();
    if (totalInvestment > availableCash && !form.buyer) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Cash',
        text2: `Available ${formatCurrency(availableCash)}, needed ${formatCurrency(totalInvestment)}. Select the buying member.`,
      });
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
      buyer: Number(form.buyer),
      notes: form.notes,
    });
    setLoading(false);

    if (result.success) {
      Toast.show({ type: 'success', text1: 'Stock added', text2: `${shortName(selectedStock.name)} added to portfolio` });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: 'Could Not Add Investment', text2: result.error });
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getTotalInvestment = () => (
    (parseInt(form.quantity || 0, 10) * parseFloat(form.buy_price || 0))
    + parseFloat(form.brokerage || 0)
  );

  const availableCash = Number(dashboard?.portfolio?.cash_balance) || 0;
  const totalInvestment = getTotalInvestment();
  const remainingCash = availableCash - totalInvestment;
  const hasEnoughCash = totalInvestment <= availableCash;
  const shortfall = Math.max(totalInvestment - availableCash, 0);
  const selectedBuyerName = members.find((m) => String(m.id) === String(form.buyer))?.name || 'The buyer';

  return (
    <FormScreen
      title="Add Investment"
      subtitle="Search & add investment"
      onBack={() => navigation.goBack()}
    >
      {/* ── Stock Search ── */}
      <PremiumInput
        label="Search stock"
        error={errors.search}
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Company name or symbol"
        icon="🔍"
        style={styles.searchInput}
      />
      {isSearching && (
        <View style={styles.searching}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.searchingText}>Searching</Text>
        </View>
      )}

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
                  <CompanyLogo symbol={stock.symbol} name={stock.name} size={40} style={{ marginRight: SPACING.md }} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {shortName(stock.name)}
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
                  <Text style={[styles.changeText, { color: changeColor }]}>
                    {isPositive ? '+' : '-'}{Math.abs(stock.change_percentage).toFixed(2)}%
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {searchQuery.trim().length >= 2 && !selectedStock && !isSearching && (
        <Pressable
          onPress={handleManualSelect}
          style={({ pressed }) => [
            styles.manualButton,
            pressed && styles.resultRowPressed,
          ]}
        >
          <Text style={styles.manualButtonText}>
            Use {normalizeManualSymbol(searchQuery)} manually
          </Text>
        </Pressable>
      )}

      {/* ── Selected Stock Card ── */}
      {selectedStock && (
        <SelectedStockCard
          symbol={selectedStock.symbol}
          name={selectedStock.name}
          style={styles.selectedCard}
          onChange={() => {
            setSelectedStock(null);
            setSearchQuery('');
          }}
          rows={[
            { label: 'Live Price', value: formatCurrency(selectedStock.current_price) },
            {
              label: 'Day Change',
              value: `${selectedStock.change >= 0 ? '+' : ''}${selectedStock.change} (${selectedStock.change_percentage}%)`,
              color: selectedStock.change >= 0 ? COLORS.profit : COLORS.loss,
            },
            { label: 'Day High', value: formatCurrency(selectedStock.day_high) },
            { label: 'Day Low', value: formatCurrency(selectedStock.day_low) },
          ]}
        >
          {selectedStock.manual && (
            <View style={styles.manualEditBlock}>
              <PremiumInput
                label="Symbol"
                value={selectedStock.symbol}
                onChangeText={(value) => setSelectedStock(prev => ({
                  ...prev,
                  symbol: normalizeManualSymbol(value),
                }))}
                placeholder="Example: NSDL.BO"
              />
              <PremiumInput
                label="Company Name"
                value={selectedStock.name}
                onChangeText={(value) => setSelectedStock(prev => ({
                  ...prev,
                  name: value,
                }))}
                placeholder="Company name"
              />
            </View>
          )}
        </SelectedStockCard>
      )}

      {/* ── Purchase Details (only after stock selected) ── */}
      {selectedStock && (
        <>
          <FormLabel style={{ marginTop: SPACING.xl }}>Purchase details</FormLabel>

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
            <PreviewCard title="Investment preview" style={styles.previewCard}>
              <PreviewRow label="Available cash" sub="Contributions + sale cash" value={formatCurrency(availableCash)} />
              <PreviewRow
                label="Cost"
                sub={`${form.quantity} × ₹${form.buy_price}`}
                value={formatCurrency(parseInt(form.quantity || 0, 10) * parseFloat(form.buy_price || 0))}
              />
              <PreviewRow label="Brokerage" value={formatCurrency(form.brokerage || 0)} />
              <PreviewRow
                label="Buyer"
                value={members.find((m) => String(m.id) === String(form.buyer))?.name || 'Select buyer'}
              />
              <PreviewRow
                label="Current value"
                value={formatCurrency(parseInt(form.quantity || 0, 10) * (selectedStock.current_price || form.buy_price || 0))}
              />

              <PreviewTotal>
                <PreviewRow label="Total investment" value={formatCurrency(totalInvestment)} strong />
                <PreviewRow
                  label="Cash after purchase"
                  value={formatCurrency(remainingCash)}
                  color={hasEnoughCash ? COLORS.profit : COLORS.loss}
                />
              </PreviewTotal>

              {!hasEnoughCash && (
                form.buyer ? (
                  <View style={styles.shortfallBox}>
                    <Text style={styles.shortfallTitle}>
                      Shortfall {formatCurrency(shortfall)}
                    </Text>
                    <Text style={styles.shortfallText}>
                      {selectedBuyerName} covers the shortfall. Settlement for{' '}
                      {form.buy_date?.slice(0, 7) || 'this month'} credits whole rupees
                      from the total monthly shortfall toward upcoming installments.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.cashError}>
                    This purchase is {formatCurrency(shortfall)} over the available pool
                    cash. Pick the buying member who is covering the shortfall, or reduce
                    the quantity.
                  </Text>
                )
              )}
            </PreviewCard>
          )}

          <PremiumButton
            title="Add Investment"
            onPress={handleSubmit}
            loading={loading}
            icon="✅"
            disabled={!!(form.quantity && form.buy_price && !hasEnoughCash && !form.buyer)}
            style={{ marginTop: SPACING.lg }}
          />
        </>
      )}
    </FormScreen>
  );
};

const styles = themedStyles(() => ({

  // Search
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchingText: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted },
  searchInput: { marginBottom: SPACING.sm },


  // Results dropdown
  resultsContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
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
    fontWeight: '600',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    ...TYPE.cardTitle,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  resultSymbol: {
    ...TYPE.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  resultRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  resultPrice: {
    ...TYPE.smallValue,
    fontSize: 12,
    color: COLORS.textPrimary,
  },

  changeText: {
    ...TYPE.caption,
    fontSize: 10,
    marginTop: 4,
  },
  manualButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '14',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  manualButtonText: {
    ...TYPE.button,
    color: COLORS.accent,
    textAlign: 'center',
  },

  // Selected stock card
  selectedCard: {
    marginBottom: SPACING.md,
  },
  manualEditBlock: {
    width: '100%',
  },

  // Form

  // Preview
  previewCard: {
    marginTop: SPACING.md,
  },
  shortfallBox: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warning + '14',
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  shortfallTitle: {
    ...TYPE.cardTitle,
    fontSize: 12,
    color: COLORS.warning,
  },
  shortfallText: {
    ...TYPE.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  cashError: {
    ...TYPE.caption,
    color: COLORS.loss,
    lineHeight: 17,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
}));
