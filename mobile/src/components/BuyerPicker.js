/**
 * BuyerPicker
 * Select field for "who bought it": shows the chosen member (or a placeholder)
 * and opens a dialog with the member list. Used by the Add and Edit purchase forms.
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { DialogCard } from './DialogCard';
import { ArrowDown2, TickCircle } from 'iconsax-react-native';
import { UserAvatar } from './UserAvatar';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const BuyerPicker = ({ members, value, onChange, error, readOnly = false, label = 'Buyer' }) => {
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => String(m.id) === String(value));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected?.name || (readOnly ? 'Not recorded' : 'Select buyer')}`}
        accessibilityState={{ expanded: open, disabled: readOnly }}
        onPress={() => !readOnly && setOpen(true)}
        disabled={readOnly}
        style={[styles.field, !!error && styles.fieldError, readOnly && styles.fieldReadOnly]}
      >
        {selected ? (
          <>
            <UserAvatar person={selected} size={32} style={styles.avatar} />
            <Text style={styles.name}>{selected.name}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>{readOnly ? 'Not recorded' : 'Select buyer'}</Text>
        )}
        {!readOnly && <ArrowDown2 size={18} color={COLORS.textSecondary} />}
      </Pressable>
      {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

      <DialogCard visible={open} title="Select buyer" onDismiss={() => setOpen(false)}>
        <View style={styles.list}>
          {members.map((member, i) => {
            const active = String(member.id) === String(value);
            return (
              <Pressable
                key={member.id}
                onPress={() => { onChange(String(member.id)); setOpen(false); }}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  active && styles.rowActive,
                  pressed && styles.pressed,
                ]}
              >
                <UserAvatar person={member} size={40} style={styles.avatar} />
                <Text style={styles.rowName}>{member.name}</Text>
                {active && <TickCircle size={18} color={COLORS.accent} variant="Bold" />}
              </Pressable>
            );
          })}
        </View>
      </DialogCard>
    </View>
  );
};

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
  fieldReadOnly: { opacity: 0.7 },
  error: { ...TYPE.secondary, color: COLORS.loss, marginTop: SPACING.xs, marginLeft: SPACING.xs },
  avatar: { marginRight: SPACING.md },
  name: { flex: 1, minWidth: 0, ...TYPE.inputText, color: COLORS.textPrimary },
  placeholder: { flex: 1, ...TYPE.inputText, color: COLORS.textMuted },
  list: { marginTop: SPACING.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowActive: { backgroundColor: COLORS.accent + '14' },
  rowName: { flex: 1, minWidth: 0, ...TYPE.rowTitle, color: COLORS.textPrimary },
  pressed: { opacity: 0.8 },
}));
