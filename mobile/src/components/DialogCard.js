/**
 * DialogCard
 * The one dialog look of the app: dimmed backdrop, rounded card, title,
 * message and right-aligned buttons. It is a native Modal, so it also shows on
 * top of other modals (Paper's Portal dialogs would hide behind them).
 * Used by ConfirmDialog and DialogHost; use those instead of this directly.
 */
import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';

// buttons: [{ text, color, loading, disabled, onPress }]
export const DialogCard = ({ visible, title, message, buttons, onDismiss }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      {/* An inner Pressable stops taps on the card from closing the dialog. */}
      <Pressable style={styles.card} onPress={() => {}}>
        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}
        <View style={styles.actions}>
          {buttons.map((button, i) => (
            <Button
              key={`${button.text}-${i}`}
              onPress={button.onPress}
              textColor={button.color}
              loading={button.loading}
              disabled={button.disabled}
            >
              {button.text}
            </Button>
          ))}
        </View>
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
  title: { ...TYPE.sectionTitle, fontSize: 20, color: COLORS.textPrimary },
  message: { ...TYPE.body, fontWeight: '400', color: COLORS.textSecondary, marginTop: SPACING.md },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
}));
