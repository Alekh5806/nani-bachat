/**
 * HoldingSelect
 * Select field: shows the chosen holding (or a placeholder) and opens a dialog
 * with the list of holdings to pick from.
 */
import React, { useState } from 'react';
import { shortName } from '../utils/names';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { DialogCard } from './DialogCard';
import { ArrowDown2, TickCircle, SearchNormal1 } from 'iconsax-react-native';
import { CompanyLogo } from './CompanyLogo';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const HoldingSelect = ({ label, holdings, selected, onSelect, emptyText, error }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? holdings.filter((h) => `${h.name} ${h.symbol} ${h.buyer_name || ''}`.toLowerCase().includes(q))
    : holdings;
  const symbolOf = (s) => (s.symbol || '').replace(/\.(NS|BO)$/, '');

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <Pressable accessibilityRole="button"
        accessibilityLabel={selected ? `${label || 'Holding'}, ${selected.name}, ${selected.quantity} shares` : label || 'Select holding'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)} style={[styles.field, !!error && styles.fieldError]}>
        {selected ? (
          <>
            <CompanyLogo symbol={selected.symbol} name={selected.name} size={32} style={styles.logo} />
            <View style={styles.fieldText}>
              <Text style={styles.name}>{shortName(selected.name)}</Text>
              <Text style={styles.sub}>
                {symbolOf(selected)} · {selected.quantity} shares
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>Select holding</Text>
        )}
        <ArrowDown2 size={18} color={COLORS.textSecondary} />
      </Pressable>
      {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

      <DialogCard visible={open} title="Select holding" onDismiss={() => setOpen(false)}>
        <View style={styles.searchBox}>
          <SearchNormal1 size={16} color={COLORS.textMuted} />
          <TextInput
            accessibilityLabel="Search stock or buyer"
            value={query}
            onChangeText={setQuery}
            placeholder="Search stock or buyer"
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
        </View>
        <View>
          {shown.length === 0 && (
            <Text style={styles.empty}>{holdings.length === 0 ? emptyText : 'No match'}</Text>
          )}
          <HoldingList
            holdings={shown}
            selected={selected}
            onPick={(h) => { onSelect(h); setOpen(false); setQuery(''); }}
          />
        </View>
      </DialogCard>
    </View>
  );
};

const HoldingList = ({ holdings, selected, onPick }) => (
  <>
    {holdings.map((h, i) => {
      const active = selected?.id === h.id;
      return (
        <Pressable
          key={h.id}
          onPress={() => onPick(h)}
          style={({ pressed }) => [
            styles.row,
            i > 0 && styles.rowDivider,
            active && styles.rowActive,
            pressed && styles.pressed,
          ]}
        >
          <CompanyLogo symbol={h.symbol} name={h.name} size={40} style={styles.logo} />
          <View style={styles.rowText}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{shortName(h.name)}</Text>
              {active && <TickCircle size={18} color={COLORS.accent} variant="Bold" />}
            </View>
            <View style={styles.chips}>
              <View style={styles.chipShares}>
                <Text style={styles.chipSharesText}>{h.quantity} shares</Text>
              </View>
              <Text style={styles.buyer}>{h.buyer_name || 'Buyer not recorded'}</Text>
            </View>
          </View>
        </Pressable>
      );
    })}
  </>
);

const styles = themedStyles(() => ({
  wrap: { marginBottom: SPACING.lg },
  label: { ...TYPE.inputLabel, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  fieldError: { borderColor: COLORS.loss },
  error: { ...TYPE.secondary, color: COLORS.loss, marginTop: SPACING.xs, marginLeft: SPACING.xs },
  fieldText: { flex: 1, minWidth: 0 },
  placeholder: { flex: 1, ...TYPE.inputText, color: COLORS.textMuted },
  logo: { marginRight: SPACING.md, marginTop: 2 },
  name: { ...TYPE.rowTitle, color: COLORS.textPrimary, flexShrink: 1 },
  sub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, padding: SPACING.lg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
    flex: 1,
    minWidth: 0,
    ...TYPE.inputText,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowActive: { backgroundColor: COLORS.accent + '14' },
  rowText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  buyer: { ...TYPE.caption, color: COLORS.textMuted, flexShrink: 1 },
  chipShares: { backgroundColor: COLORS.accent + '1F', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  chipSharesText: { ...TYPE.captionMedium, color: COLORS.accent },
  pressed: { opacity: 0.8 },
}));
