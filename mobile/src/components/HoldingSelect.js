/**
 * HoldingSelect
 * Select field: shows the chosen holding (or a placeholder) and opens a dialog
 * with the list of holdings to pick from.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform } from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
import { ArrowDown2, TickCircle, SearchNormal1 } from 'iconsax-react-native';
import { CompanyLogo } from './CompanyLogo';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const HoldingSelect = ({ label, holdings, selected, onSelect, emptyText }) => {
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

      <Pressable onPress={() => setOpen(true)} style={styles.field}>
        {selected ? (
          <>
            <CompanyLogo symbol={selected.symbol} name={selected.name} size={32} style={styles.logo} />
            <View style={styles.fieldText}>
              <Text style={styles.name} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {symbolOf(selected)} · {selected.quantity} shares
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>Select holding</Text>
        )}
        <ArrowDown2 size={18} color={COLORS.textSecondary} />
      </Pressable>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog}>
          <Dialog.Title>Select holding</Dialog.Title>
          <View style={styles.searchBox}>
            <SearchNormal1 size={16} color={COLORS.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search stock or buyer"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Dialog.ScrollArea style={styles.scrollArea}>
            {shown.length === 0 && (
              <Text style={styles.empty}>{holdings.length === 0 ? emptyText : 'No match'}</Text>
            )}
            <HoldingList
              holdings={shown}
              selected={selected}
              onPick={(h) => { onSelect(h); setOpen(false); setQuery(''); }}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const HoldingList = ({ holdings, selected, onPick }) => (
  <ScrollView showsVerticalScrollIndicator={false}>
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
              <Text style={styles.name} numberOfLines={1}>{h.name}</Text>
              {active && <TickCircle size={18} color={COLORS.accent} variant="Bold" />}
            </View>
            <View style={styles.chips}>
              <View style={styles.chipShares}>
                <Text style={styles.chipSharesText}>{h.quantity} shares</Text>
              </View>
              <Text style={styles.buyer} numberOfLines={1}>{h.buyer_name || 'Buyer not recorded'}</Text>
            </View>
          </View>
        </Pressable>
      );
    })}
  </ScrollView>
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
  fieldText: { flex: 1, minWidth: 0 },
  placeholder: { flex: 1, ...TYPE.inputText, color: COLORS.textMuted },
  logo: { marginRight: SPACING.md, marginTop: 2 },
  name: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary, flexShrink: 1 },
  sub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  dialog: { backgroundColor: COLORS.cardBg, maxHeight: '80%' },
  scrollArea: { paddingHorizontal: 0, maxHeight: 400 },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, padding: SPACING.lg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
    flex: 1,
    ...TYPE.inputText,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowActive: { backgroundColor: COLORS.accent + '14' },
  rowText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  buyer: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, flexShrink: 1 },
  chipShares: { backgroundColor: COLORS.accent + '1F', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  chipSharesText: { ...TYPE.captionMedium, fontSize: 10, color: COLORS.accent },
  pressed: { opacity: 0.8 },
}));
