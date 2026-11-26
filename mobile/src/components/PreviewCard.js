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

// The value uses its full width before wrapping onto a separate line.
export const PreviewRow = ({ label, sub, value, color, strong }) => (
  <View style={styles.row}>
    <View style={styles.labelBlock}>
      <Text style={[styles.label, strong && styles.labelStrong]}>{label}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
    <Text style={[styles.value, strong && styles.valueStrong, color && { color }]}>
      {value}
    </Text>
  </View>
);

// Divider above the rows that sum the preview up.
export const PreviewTotal = ({ children }) => <View style={styles.total}>{children}</View>;

const styles = themedStyles(() => ({
  title: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: SPACING.sm, paddingVertical: 6 },
  labelBlock: { flexBasis: '42%', flexGrow: 1, minWidth: 0 },
  label: { ...TYPE.secondaryMedium, color: COLORS.textPrimary },
  labelStrong: { ...TYPE.rowTitle },
  sub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },
  value: { ...TYPE.smallValue, maxWidth: '100%', marginLeft: 'auto', color: COLORS.textSecondary, textAlign: 'right' },
  valueStrong: { ...TYPE.listAmount, color: COLORS.accent },
  total: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
  },
}));
