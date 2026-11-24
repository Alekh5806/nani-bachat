/**
 * BuyerPicker
 * Select field for "who bought it": shows the chosen member (or a placeholder)
 * and opens a dialog with the member list. Used by the Add and Edit purchase forms.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
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
        onPress={() => !readOnly && setOpen(true)}
        disabled={readOnly}
        style={[styles.field, !!error && styles.fieldError, readOnly && styles.fieldReadOnly]}
      >
        {selected ? (
          <>
            <UserAvatar person={selected} size={32} style={styles.avatar} />
            <Text style={styles.name} numberOfLines={1}>{selected.name}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>{readOnly ? 'Not recorded' : 'Select buyer'}</Text>
        )}
        {!readOnly && <ArrowDown2 size={18} color={COLORS.textSecondary} />}
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <DialogCard visible={open} title="Select buyer" onDismiss={() => setOpen(false)}>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.rowName} numberOfLines={1}>{member.name}</Text>
                {active && <TickCircle size={18} color={COLORS.accent} variant="Bold" />}
              </Pressable>
            );
          })}
        </ScrollView>
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
  error: { ...TYPE.caption, color: COLORS.loss, marginTop: SPACING.xs, marginLeft: SPACING.xs },
  avatar: { marginRight: SPACING.md },
  name: { flex: 1, ...TYPE.inputText, color: COLORS.textPrimary },
  placeholder: { flex: 1, ...TYPE.inputText, color: COLORS.textMuted },
  list: { maxHeight: 360, marginTop: SPACING.lg, marginHorizontal: -SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowActive: { backgroundColor: COLORS.accent + '14' },
  rowName: { flex: 1, ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  pressed: { opacity: 0.8 },
}));
