import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import api from '../config/api';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { formatDateDisplay } from '../components/DatePickerField';
import { Alert } from '../utils/alert';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme/colors';

const endpoint = '/investments/stocks/news/';
const openSource = (url) => Linking.openURL(url).catch(() => Alert.alert('Could not open source', url));

function NewsItem({ item }) {
  const dividend = item.kind === 'Dividend';
  const dated = item.kind === 'Filing' ? 'Filed' : 'Ex-date';
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.meta}>{item.kind} · {dated} {formatDateDisplay(item.date)}</Text>
      <Text style={styles.title}>{item.title}</Text>
      {dividend && (
        <View style={styles.details}>
          {item.rate != null && <Text style={styles.note}>₹{item.rate} per share</Text>}
          {item.shares === 0 ? <Text style={styles.note}>No shares qualified on this ex-date.</Text> : item.expected != null ? (
            <Text style={styles.total}>
              {item.projected ? 'Projected' : 'Estimated'} gross · ₹{item.expected} on {item.shares} shares
            </Text>
          ) : <Text style={styles.note}>Check the filing and share count to confirm the gross amount.</Text>}
          {item.projected && <Text style={styles.note}>Based on the shares currently recorded in the pool.</Text>}
          {Number(item.received) > 0 && <Text style={styles.note}>Recorded with a payment date · ₹{item.received}</Text>}
          {Number(item.undated) > 0 && <Text style={styles.note}>Already recorded without a payment date · ₹{item.undated}</Text>}
          {item.record_date && <Text style={styles.note}>Record date · {formatDateDisplay(item.record_date)}</Text>}
          {item.payment_date && <Text style={styles.note}>Scheduled payment · {formatDateDisplay(item.payment_date)}</Text>}
        </View>
      )}
      <View style={styles.links}>
        <Text accessibilityRole="link" style={styles.link} onPress={() => openSource(item.url)}>
          {item.kind === 'Filing' ? 'Open filing ↗' : 'View source ↗'}
        </Text>
        {item.calendar_url && item.url !== item.calendar_url && (
          <Text accessibilityRole="link" style={styles.link} onPress={() => openSource(item.calendar_url)}>Dividend calendar ↗</Text>
        )}
      </View>
    </GlassCard>
  );
}

function StockFeed({ stock }) {
  const [feed, setFeed] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setFeed(null);
    setFailed(false);
    api.get(endpoint, { params: { symbol: stock.symbol }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setFeed(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [stock.symbol]);

  return (
    <View>
      <Text style={styles.company}>{stock.name}</Text>
      {!stock.active && <Text style={styles.notice}>Sold holding · outstanding dividends</Text>}
      {failed && <Text style={styles.notice}>Could not load updates. Tap Refresh to try again.</Text>}
      {!feed && !failed && <ActivityIndicator color={COLORS.accent} />}
      {feed?.issues.map(issue => <Text key={issue} style={styles.notice}>{issue}</Text>)}
      {feed?.items.length === 0 && !feed.issues.length && (
        <Text style={styles.note}>{stock.active ? 'No matching updates yet.' : 'No outstanding dividends found.'}</Text>
      )}
      {feed?.items.map(item => (
        <NewsItem key={JSON.stringify([item.kind, item.date, item.url, item.title])} item={item} />
      ))}
    </View>
  );
}

export function StockNewsScreen({ navigation }) {
  const [stocks, setStocks] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revision, setRevision] = useState(0);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setFailed(false);
    setStocks(null);
    api.get(endpoint, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setStocks(data.stocks); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [revision]));
  const stock = stocks?.find(s => s.symbol === selected) || stocks?.[0];
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Group stock news" showBack onBack={() => navigation.goBack()}
        rightAction={() => setRevision(value => value + 1)} rightLabel="Refresh" />
      <ScrollView contentContainerStyle={styles.body}>
        {failed && <Text style={styles.notice}>Could not load the group’s stocks. Tap Refresh to try again.</Text>}
        {!stocks && !failed && <ActivityIndicator color={COLORS.accent} />}
        {stocks?.length === 0 && <Text style={styles.note}>News will appear after the group’s first stock purchase.</Text>}
        {!!stocks?.length && (
          <View style={styles.selector}>
            {stocks.map(s => (
              <Pressable key={s.symbol} accessibilityRole="button" accessibilityState={{ selected: s.symbol === stock.symbol }}
                style={[styles.chip, s.symbol === stock.symbol && styles.selected]} onPress={() => setSelected(s.symbol)}>
                <Text style={styles.chipText}>{s.symbol}{s.active ? '' : ' · sold'}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {stock && <StockFeed key={stock.symbol} stock={stock} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge },
  company: { color: COLORS.textPrimary, fontSize: FONTS.lg, fontWeight: '700', marginBottom: SPACING.md },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  chip: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.lg, padding: SPACING.sm },
  chipText: { color: COLORS.textPrimary, fontWeight: '600' },
  selected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '18' },
  card: { gap: SPACING.sm, marginBottom: SPACING.md },
  meta: { color: COLORS.textSecondary, fontSize: FONTS.xs },
  title: { color: COLORS.textPrimary, fontSize: FONTS.md, fontWeight: '700' },
  details: { gap: SPACING.xs },
  note: { color: COLORS.textSecondary, fontSize: FONTS.sm },
  total: { color: COLORS.textPrimary, fontWeight: '600' },
  notice: { color: COLORS.textSecondary, marginBottom: SPACING.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg },
  link: { color: COLORS.accent, fontWeight: '600', paddingVertical: SPACING.xs },
});
