/**
 * SummaryCard
 * Top card of a screen: a small label, one big value, an optional round
 * action button, a dashed line and a few label/value rows.
 *
 *   <SummaryCard label="Holdings (10)" value="₹1,12,871"
 *     action={{ icon: <Refresh2 />, onPress, loading, label: 'Refresh' }}
 *     rows={[{ label: 'Invested', value: '₹1,10,892.39', color }]} note="Optional footnote" />
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { GlassCard } from './GlassCard';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const SummaryCard = ({ label, value, valueColor, action, rows = [], note, style }) => (
  <GlassCard style={[styles.card, style]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.top}>
      <Text style={[styles.big, valueColor && { color: valueColor }]}>{value}</Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          disabled={action.loading}
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
        >
          {action.loading ? <ActivityIndicator size="small" color={COLORS.textSecondary} /> : action.icon}
        </Pressable>
      )}
    </View>
    {rows.length > 0 && (
      <>
        <View style={styles.dashedClip}>
          <View style={styles.dashed} />
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={[styles.rowValue, row.color && { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
      </>
    )}
    {!!note && <Text style={styles.note}>{note}</Text>}
  </GlassCard>
);

const styles = themedStyles(() => ({
  card: { marginBottom: SPACING.md },
  label: { ...TYPE.secondary, color: COLORS.textSecondary },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginTop: SPACING.xs },
  big: { ...TYPE.portfolioValue, color: COLORS.textPrimary, maxWidth: '100%' },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  // A dashed line: a clipped box holding a taller dashed-border box.
  dashedClip: { height: 1, overflow: 'hidden', marginVertical: SPACING.lg },
  dashed: {
    height: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: SPACING.sm, rowGap: SPACING.xs, paddingVertical: 6 },
  note: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm },
  rowLabel: { ...TYPE.secondary, color: COLORS.textSecondary, flexBasis: 100, flexGrow: 1, flexShrink: 1 },
  rowValue: { ...TYPE.smallValue, color: COLORS.textPrimary, marginLeft: 'auto', maxWidth: '100%', textAlign: 'right' },
}));
