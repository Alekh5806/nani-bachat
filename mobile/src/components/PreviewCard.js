/**
 * PreviewCard
 * The "preview" card of the Add Stock and Sell forms: a title with a divider,
 * label / value rows (PreviewRow) and an optional totals block (PreviewTotal).
 */
import React from 'react';
import { View, Text } from 'react-native';
import { FormCard } from './FormScreen';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const PreviewCard = ({ title, style, children }) => (
  <FormCard style={style}>
    <Text style={styles.title}>{title}</Text>
    {children}
  </FormCard>
);

// Bold label on the left (optional grey line under it), value in the right half.
export const PreviewRow = ({ label, sub, value, color, strong }) => (
  <View style={styles.row}>
    <View style={styles.labelBlock}>
      <Text style={[styles.label, strong && styles.labelStrong]}>{label}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
    <Text style={[styles.value, strong && styles.valueStrong, color && { color }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// Divider above the rows that sum the preview up.
export const PreviewTotal = ({ children }) => <View style={styles.total}>{children}</View>;

const styles = themedStyles(() => ({
  title: {
    ...TYPE.cardTitle,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  labelBlock: { flex: 1 },
  label: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.textPrimary },
  labelStrong: { fontSize: 14 },
  sub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  value: { ...TYPE.secondary, fontSize: 12, flex: 1, color: COLORS.textSecondary },
  valueStrong: { ...TYPE.smallValue, fontSize: 14, color: COLORS.accent },
  total: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
  },
}));
