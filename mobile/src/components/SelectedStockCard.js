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
import { shortName } from '../utils/names';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const SelectedStockCard = ({ symbol, name, rows = [], onChange, right, style, children }) => (
  <FormCard style={style}>
    <View style={styles.header}>
      <CompanyLogo symbol={symbol} name={name} size={40} style={styles.logo} />
      <View style={styles.info}>
        <Text style={styles.name}>{shortName(name)}</Text>
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
      {right}
      {!!onChange && (
        <Pressable onPress={onChange} style={styles.changeBtn}>
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      )}
    </View>
    {children}
    {rows.map((row) => (
      <View key={row.label} style={styles.row}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={[styles.value, row.color && { color: row.color }]} numberOfLines={1}>
          {row.value}
        </Text>
      </View>
    ))}
  </FormCard>
);

const styles = themedStyles(() => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  logo: { marginRight: SPACING.md },
  info: { flex: 1, minWidth: 0 },
  name: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  symbol: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  changeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.accent + '14',
  },
  changeText: { ...TYPE.captionMedium, color: COLORS.accent },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  label: { ...TYPE.cardTitle, fontSize: 12, flex: 1, color: COLORS.textPrimary },
  value: { ...TYPE.secondary, fontSize: 12, flex: 1, color: COLORS.textSecondary },
}));
