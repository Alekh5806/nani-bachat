import React, { useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { fetchNseQuote } from '../services/nseQuotes';
import { COLORS, FONTS, SPACING, themedStyles } from '../theme/colors';
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

export function NseQuotePreview({ symbol }) {
  const [expanded, setExpanded] = useState(false);
  const focused = useIsFocused();

  return (
    <GlassCard>
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
          <Text style={styles.note}>Delayed NSE quote. Holding values use Yahoo Finance prices or saved estimates.</Text>
          {focused && <Quote key={symbol} symbol={symbol} />}
        </View>
      )}
    </GlassCard>
  );
}

const styles = themedStyles(() => ({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
  title: { color: COLORS.textPrimary, fontSize: FONTS.md, fontWeight: '600', flexShrink: 1 },
  action: { color: COLORS.textPrimary, fontSize: FONTS.sm, fontWeight: '600' },
  panel: { gap: SPACING.sm },
  price: { color: COLORS.textPrimary, fontSize: FONTS.xxl, fontWeight: '600' },
  note: { color: COLORS.textSecondary, fontSize: FONTS.sm },
}));
