/**
 * Date Picker Field
 *
 * A calendar popover built from plain React Native primitives so it behaves
 * the same on iOS, Android and the web build (the community date picker has
 * no web implementation). Reads and writes 'YYYY-MM-DD' strings, which is
 * exactly what the Django serializers expect.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { DialogCard } from './DialogCard';
import { Icon } from './Icon';
import { AppIcon } from './Icon';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (n) => String(n).padStart(2, '0');

export const toDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayString = () => toDateString(new Date());

/** Parses 'YYYY-MM-DD' as a local date; returns null for anything else. */
export const parseDateString = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null;
  return parsed;
};

/** '2026-04-07' -> '07 Apr 2026'. Falls back to the raw value. */
export const formatDateDisplay = (value) => {
  const parsed = parseDateString(value);
  if (!parsed) return value || '';
  return `${pad(parsed.getDate())} ${MONTH_NAMES[parsed.getMonth()].substring(0, 3)} ${parsed.getFullYear()}`;
};

export const DatePickerField = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  error,
  clearable = false,
  style,
  icon = '📅',
}) => {
  const [open, setOpen] = useState(false);
  const selected = parseDateString(value);
  const [cursor, setCursor] = useState(() => selected || new Date());

  const min = parseDateString(minDate);
  const max = parseDateString(maxDate);

  const openPicker = () => {
    setCursor(parseDateString(value) || new Date());
    setOpen(true);
  };

  const isDisabled = (date) => {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
    return cells;
  }, [cursor]);

  const shiftMonth = (delta) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const shiftYear = (delta) => {
    setCursor((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  const pick = (date) => {
    if (isDisabled(date)) return;
    onChange(toDateString(date));
    setOpen(false);
  };

  const selectToday = () => {
    const now = new Date();
    if (isDisabled(now)) return;
    onChange(todayString());
    setOpen(false);
  };

  const todayStr = todayString();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          error && styles.fieldError,
          pressed && styles.fieldPressed,
        ]}
      >
        <Icon name={icon} size={18} color={COLORS.textMuted} style={styles.icon} />
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatDateDisplay(value) : placeholder}
        </Text>
        {clearable && !!value ? (
          <Pressable onPress={() => onChange('')} hitSlop={10} style={styles.clearBtn}>
            <AppIcon name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        ) : (
          <AppIcon name="calendar-outline" size={18} color={COLORS.textMuted} />
        )}
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <DialogCard
        visible={open}
        title="Select date"
        onDismiss={() => setOpen(false)}
        buttons={[
          { text: 'Cancel', onPress: () => setOpen(false) },
          { text: 'Today', onPress: selectToday },
        ]}
      >
        <View style={styles.calendar}>
        {/* Month / year navigation */}
        <View style={styles.navRow}>
          <Pressable onPress={() => shiftYear(-1)} style={styles.navBtn} hitSlop={6}>
            <AppIcon name="play-back" size={14} color={COLORS.textSecondary} />
          </Pressable>
          <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={6}>
            <AppIcon name="chevron-back" size={18} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.navTitle}>
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={6}>
            <AppIcon name="chevron-forward" size={18} color={COLORS.textPrimary} />
          </Pressable>
          <Pressable onPress={() => shiftYear(1)} style={styles.navBtn} hitSlop={6}>
            <AppIcon name="play-forward" size={14} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
          ))}
        </View>

        <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent}>
          {days.map((date, index) => {
            if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />;
            const dateStr = toDateString(date);
            const isSelected = dateStr === value;
            const isToday = dateStr === todayStr;
            const disabled = isDisabled(date);
            return (
              <Pressable
                key={dateStr}
                onPress={() => pick(date)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.dayCell,
                  isSelected && styles.daySelected,
                  !isSelected && isToday && styles.dayToday,
                  pressed && !disabled && styles.dayPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    !isSelected && isToday && styles.dayTextToday,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        </View>
      </DialogCard>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: { marginBottom: SPACING.lg },
  label: {
    ...TYPE.inputLabel,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
    minHeight: 54,
  },
  fieldPressed: { borderColor: COLORS.accent, opacity: 0.9 },
  fieldError: { borderColor: COLORS.loss },
  icon: { marginRight: SPACING.md },
  fieldText: {
    ...TYPE.inputText,
    flex: 1,
    color: COLORS.textPrimary,
  },
  placeholder: { color: COLORS.placeholder, fontWeight: '400' },
  clearBtn: { padding: 2 },
  errorText: {
    ...TYPE.caption,
    color: COLORS.loss,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },

  calendar: { marginTop: SPACING.lg },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    ...TYPE.cardTitle,
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  weekRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  weekday: {
    ...TYPE.captionMedium,
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
  grid: { maxHeight: 260 },
  gridContent: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  daySelected: { backgroundColor: COLORS.accent },
  dayToday: { borderWidth: 1, borderColor: COLORS.accent + '66' },
  dayPressed: { backgroundColor: COLORS.surface },
  dayText: { ...TYPE.secondaryMedium, color: COLORS.textPrimary },
  dayTextSelected: { color: COLORS.onAccent, fontWeight: '600' },
  dayTextToday: { color: COLORS.accent },
  dayTextDisabled: { color: COLORS.textMuted, opacity: 0.4 },
}));
