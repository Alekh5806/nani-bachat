/**
 * DialogCard
 * The one dialog look of the app: dimmed backdrop, rounded card, a title with a
 * round close (X) button, optional message and content, and full-width pill
 * buttons at the bottom. It is a native Modal, so it also shows on top of other
 * modals (Paper's Portal dialogs would hide behind them).
 * Used by ConfirmDialog and DialogHost; use those instead of this directly.
 *
 * buttons: [{ text, color, variant, loading, disabled, onPress }].
 *   The last button is the main one (solid blue, or solid red when its color is
 *   COLORS.loss); the others are light. Set variant 'secondary' to force light.
 * children: content between the message and the buttons (for example an input).
 * The X shows whenever onDismiss is given (it is left out while loading).
 */
import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Add } from 'iconsax-react-native';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

const DialogButton = ({ button, primary }) => {
  const danger = button.color === COLORS.loss;
  const isDisabled = button.disabled || button.loading;
  const solid = primary && button.variant !== 'secondary';
  const background = solid ? (danger ? COLORS.loss : COLORS.accent) : COLORS.surface;
  const textColor = solid ? COLORS.onAccent : danger ? COLORS.loss : COLORS.textPrimary;
  return (
    <Pressable
      onPress={button.onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.button, { backgroundColor: background }, (pressed || isDisabled) && styles.dim]}
    >
      {button.loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[styles.buttonText, { color: textColor }]}>{button.text}</Text>}
    </Pressable>
  );
};

export const DialogCard = ({ visible, title, message, buttons = [], onDismiss, children }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      {/* An inner Pressable stops taps on the card from closing the dialog. */}
      <Pressable style={styles.card} onPress={() => {}}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {!!onDismiss && (
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Add size={20} color={COLORS.textPrimary} style={styles.closeIcon} />
            </Pressable>
          )}
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}
        {children}
        {buttons.length > 0 && (
          <View style={styles.actions}>
            {buttons.map((button, i) => (
              <View key={`${button.text}-${i}`} style={styles.actionCell}>
                <DialogButton button={button} primary={i === buttons.length - 1} />
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = themedStyles(() => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.cardBg,
    borderRadius: 28,
    padding: SPACING.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  title: { ...TYPE.sectionTitle, fontSize: 20, color: COLORS.textPrimary, flex: 1 },
  close: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg,
  },
  closeIcon: { transform: [{ rotate: '45deg' }] },
  message: { ...TYPE.body, fontWeight: '400', color: COLORS.textSecondary, marginTop: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  actionCell: { flex: 1 },
  button: { minHeight: 48, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  buttonText: { ...TYPE.button },
  dim: { opacity: 0.7 },
}));
