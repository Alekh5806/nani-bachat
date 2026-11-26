/**
 * MonthPickerDialog
 * Pick one month without a long list: a year with back/forward arrows and a
 * 12-month grid. Months not in `enabledMonths` are greyed out and cannot be
 * tapped, so it stays small however many months exist. "All months" clears it.
 *
 *   <MonthPickerDialog visible={open} value="2026-11" enabledMonths={['2026-11', '2026-10']}
 *     onSelect={setMonth} onClose={() => setOpen(false)} />
 * onSelect gets 'YYYY-MM', or null for all months.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { DialogCard } from './DialogCard';
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react-native';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthPickerDialog = ({ visible, title = 'Select month', value, enabledMonths = [], onSelect, onClose }) => {
  const years = enabledMonths.map((m) => parseInt(String(m).slice(0, 4), 10)).filter(Boolean);
  const minYear = years.length ? Math.min(...years) : new Date().getFullYear();
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const startYear = value ? parseInt(value.slice(0, 4), 10) : maxYear;
  const [year, setYear] = useState(startYear);

  // Open on the chosen month's year (or the latest year) each time.
  useEffect(() => { if (visible) setYear(startYear); }, [visible]);

  return (
    <DialogCard
      visible={visible}
      title={title}
      onDismiss={onClose}
      buttons={[{ text: 'All months', variant: 'secondary', onPress: () => { onSelect(null); onClose(); } }]}
    >
      <View style={styles.yearRow}>
        <Pressable
          onPress={() => setYear((y) => y - 1)}
          disabled={year <= minYear}
          style={[styles.yearArrow, year <= minYear && styles.disabled]}
          accessibilityLabel="Previous year"
        >
          <ArrowLeft2 size={18} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.yearText}>{year}</Text>
        <Pressable
          onPress={() => setYear((y) => y + 1)}
          disabled={year >= maxYear}
          style={[styles.yearArrow, year >= maxYear && styles.disabled]}
          accessibilityLabel="Next year"
        >
          <ArrowRight2 size={18} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {SHORT.map((name, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`;
          const enabled = enabledMonths.includes(key);
          const active = value === key;
          return (
            <Pressable
              key={key}
              disabled={!enabled}
              onPress={() => { onSelect(key); onClose(); }}
              style={[styles.cell, active && styles.cellActive, !enabled && styles.disabled]}
            >
              <Text style={[styles.cellText, active && styles.cellTextActive]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

    </DialogCard>
  );
};

const styles = themedStyles(() => ({
  yearRow: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  yearArrow: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent + '14',
  },
  yearText: { ...TYPE.sectionTitle, color: COLORS.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cell: {
    width: '23%',
    flexGrow: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  cellActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cellText: { ...TYPE.secondaryMedium, color: COLORS.textPrimary },
  cellTextActive: { color: COLORS.onAccent },
  disabled: { opacity: 0.35 },
}));
