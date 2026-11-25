/**
 * SwitchRow
 * On/off setting in a form: a title, an optional grey line under it and a
 * flat pill switch on the right. No box around it. Use it for any form toggle.
 *
 *   <SwitchRow label="Catch-up payment" hint="Pays old months now" value={on} onValueChange={setOn} />
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

export const SwitchRow = ({ label, hint, value, onValueChange, style }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    accessibilityRole="switch"
    aria-checked={!!value}
    accessibilityLabel={label}
    style={[styles.row, style]}
  >
    <View style={styles.text}>
      <Text style={styles.label}>{label}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
    <View style={[styles.track, value && styles.trackOn]}>
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </View>
  </Pressable>
);

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  text: { flex: 1, minWidth: 0 },
  label: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  hint: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  trackOn: { backgroundColor: COLORS.accent },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  thumbOn: { alignSelf: 'flex-end' },
}));
