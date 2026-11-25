import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GrowthChart } from './GrowthChart';
import { fetchPages } from '../config/fetchPages';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';
import { fmtFull } from '../utils/currency';
import { chartPoints, firstDayOfRange, historyCovered, valueChange } from '../utils/portfolioHistory';

const RANGES = [
  { label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 },
  { label: '1Y', days: 365 }, { label: 'All', days: null },
];

export function PortfolioHistory({ recent, complete, today, refreshKey }) {
  const [range, setRange] = useState(RANGES[1]);
  const [history, setHistory] = useState(null);
  const [retry, setRetry] = useState(0);
  const since = firstDayOfRange(today, range.days);
  // The dashboard already contains the latest 30 daily snapshots, newest first.
  const covered = historyCovered(recent, since, today, complete);
  const key = range.label + today;
  useFocusEffect(useCallback(() => {
    if (covered) return;
    const controller = new AbortController();
    setHistory((last) => last?.key === key && last.failed ? { key, rows: last.rows } : last);
    // The existing API accepts a maximum record count and paginates the result.
    fetchPages('/portfolio/growth/', {
      params: { limit: range.days ? range.days + 1 : 'all', ...(since && { since }) },
      signal: controller.signal,
      stopAfter: (page) => since && page[page.length - 1].date <= since,
    }).then((rows) => {
      if (!controller.signal.aborted) setHistory({ key, rows });
    }).catch(() => {
      if (!controller.signal.aborted) setHistory((last) => ({ key, rows: last?.key === key ? last.rows : null, failed: true }));
    });
    return () => controller.abort();
  }, [covered, key, range.days, since, refreshKey, retry]));

  const result = history?.key === key ? history : null;
  const ready = covered || Boolean(result?.rows);
  // Merge on every dashboard refresh, including when a longer range is open.
  const points = useMemo(() => {
    const rows = covered ? recent : result?.rows ?? recent;
    return rows ? chartPoints([...(rows || []), ...(recent || [])], since, today) : null;
  }, [covered, recent, result?.rows, since, today]);
  const failed = !covered && result?.failed;
  const change = ready ? valueChange(points) : null;
  const delta = change && (change.percentage != null ? change.percentage.toFixed(2) + '%' : fmtFull(change.amount));
  return (
    <View style={styles.history}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Value History</Text>
        {change != null && <Text style={styles.change}>
          {(change.amount > 0 ? '+' : '') + delta} in value
        </Text>}
      </View>
      <View style={styles.ranges}>
        {RANGES.map((item) => (
          <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: range === item }} aria-pressed={range === item}
            accessibilityLabel={item.days ? 'Last ' + item.days + ' days' : 'All history'}
            onPress={() => setRange(item)}
            style={({ pressed }) => [styles.range, range === item && styles.active, pressed && styles.pressed]}>
            <Text style={[styles.rangeText, range === item && styles.activeText]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {points && <GrowthChart key={key} data={points} />}
      {failed ? (
        <Pressable accessibilityRole="button" onPress={() => setRetry((n) => n + 1)} style={styles.retry}>
          <Text style={styles.status}>Full history couldn’t refresh. Try again</Text>
        </Pressable>
      ) : !ready && <Text style={styles.status} accessibilityLiveRegion="polite">Loading full history…</Text>}
    </View>
  );
}

const styles = themedStyles(() => ({
  history: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.lg, marginTop: SPACING.lg },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  change: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  title: { ...TYPE.cardTitle, color: COLORS.textPrimary },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.xs, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, marginVertical: SPACING.md },
  range: { flexGrow: 1, flexShrink: 1, minWidth: 44, paddingHorizontal: SPACING.xs, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: RADIUS.md },
  active: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  rangeText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  activeText: { color: COLORS.isDark ? COLORS.textPrimary : COLORS.accent },
  pressed: { opacity: 0.75 },
  retry: { minHeight: 44, justifyContent: 'center' },
  status: { ...TYPE.secondaryMedium, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: SPACING.md },
}));
