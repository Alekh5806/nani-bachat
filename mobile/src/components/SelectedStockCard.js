/**
 * SelectedStockCard
 * Card shown after a stock is picked: logo, short name and symbol on top
 * (optional "Change" button), then label / value rows under a divider.
 *   <SelectedStockCard symbol name rows={[{ label, value, color }]} onChange>
 *     {extra content shown between the header and the rows, e.g. inputs}
 *   </SelectedStockCard>
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CompanyLogo } from './CompanyLogo';
import { FormCard } from './FormScreen';
import { PreviewRow } from './PreviewCard';
import { shortName } from '../utils/names';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const SelectedStockCard = ({ symbol, name, rows = [], onChange, right, style, children }) => {
  // With no rows or content under it, the header needs no divider.
  const hasBody = rows.length > 0 || !!children;
  return (
  <FormCard style={style}>
    <View style={[styles.header, !hasBody && styles.headerAlone]}>
      <CompanyLogo symbol={symbol} name={name} size={40} style={styles.logo} />
      <View style={styles.info}>
        <Text style={styles.name}>{shortName(name)}</Text>
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
      {right}
      {!!onChange && (
        <Pressable accessibilityRole="button" onPress={onChange} style={styles.changeBtn}>
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      )}
    </View>
    {children}
    {rows.map((row) => (
      <PreviewRow key={row.label} label={row.label} value={row.value} color={row.color} />
    ))}
  </FormCard>
  );
};

const styles = themedStyles(() => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerAlone: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  logo: { marginRight: SPACING.md },
  info: { flex: 1, minWidth: 0 },
  name: { ...TYPE.rowTitle, color: COLORS.textPrimary },
  symbol: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },
  changeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.accent + '14',
    maxWidth: '48%',
    minHeight: 44,
    justifyContent: 'center',
  },
  changeText: { ...TYPE.button, color: COLORS.accent, textAlign: 'center' },
}));
