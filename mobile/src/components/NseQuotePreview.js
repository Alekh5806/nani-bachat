import React, { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { fetchNseQuote } from '../services/nseQuotes';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme/colors';
import { GlassCard } from './GlassCard';

const REFRESH_INTERVAL_MS = 60000;
const REQUEST_TIMEOUT_MS = 15000;

function Quote({ symbol }) {
  const [appState, setAppState] = useState(AppState.currentState);
  const [quote, setQuote] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const listener = AppState.addEventListener('change', setAppState);
    setAppState(AppState.currentState);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (appState !== 'active') return;

    let stopped = false;
    let request;
    let timeout;
    let nextRefresh;

    async function refresh() {
      request = new AbortController();
      timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);
      try {
        const latest = await fetchNseQuote(symbol, request.signal);
        if (stopped) return;
        setQuote(latest);
        setUnavailable(false);
      } catch {
        if (stopped) return;
        setUnavailable(true);
      } finally {
        clearTimeout(timeout);
      }
      nextRefresh = setTimeout(refresh, REFRESH_INTERVAL_MS);
    }

    refresh();
    return () => {
      stopped = true;
      request.abort();
      clearTimeout(timeout);
      clearTimeout(nextRefresh);
    };
  }, [symbol, appState]);

  if (!quote && unavailable) {
    return <Text style={styles.note}>NSE quote unavailable for {symbol}. Retrying in a minute.</Text>;
  }
  if (!quote) return <Text style={styles.note}>Fetching the NSE quote…</Text>;

  return (
    <View>
      <Text style={styles.price}>
        ₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      <Text style={styles.note}>{quote.asOf ? `NSE quote as of ${quote.asOf}` : 'Quote time unavailable'}</Text>
      {unavailable && <Text style={styles.note}>Refresh failed. Showing the last quote.</Text>}
    </View>
  );
}

export function NseQuotePreview({ holdings }) {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState(null);
  const focused = useIsFocused();
  const tickers = [...new Set(holdings
    .map(stock => stock.symbol?.trim().toUpperCase())
    .filter(symbol => symbol && symbol.length > 3 && symbol.endsWith('.NS'))
    .map(symbol => symbol.slice(0, -3)))];

  if (!tickers.length) return null;
  const selected = tickers.includes(selection) ? selection : tickers[0];

  return (
    <GlassCard style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(open => !open)}
        style={styles.heading}
      >
        <Text style={styles.title}>NSE quote preview</Text>
        <Text style={styles.action}>{expanded ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.note}>NSE reports a 1–3 minute delay during trading.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tickers}>
            {tickers.map(ticker => (
              <Pressable
                key={ticker}
                accessibilityRole="button"
                accessibilityState={{ selected: ticker === selected }}
                style={[styles.ticker, ticker === selected && styles.selectedTicker]}
                onPress={() => setSelection(ticker)}
              >
                <Text style={styles.tickerText}>{ticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {focused && <Quote key={selected} symbol={selected} />}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md, minHeight: 32 },
  title: { color: COLORS.textPrimary, fontSize: FONTS.md, fontWeight: '700', flexShrink: 1 },
  action: { color: COLORS.accent, fontWeight: '600' },
  panel: { gap: SPACING.md, marginTop: SPACING.sm },
  tickers: { gap: SPACING.sm },
  ticker: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.sm, padding: SPACING.sm },
  selectedTicker: { borderColor: COLORS.accent },
  tickerText: { color: COLORS.textPrimary, fontSize: FONTS.sm },
  price: { color: COLORS.textPrimary, fontSize: FONTS.xxl, fontWeight: '700' },
  note: { color: COLORS.textSecondary, fontSize: FONTS.sm },
});
