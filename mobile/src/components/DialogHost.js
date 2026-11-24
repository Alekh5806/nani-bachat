/**
 * DialogHost
 * Renders the dialog requested through Alert.alert() (utils/alert.js). Mount it
 * once at the app root (see App.js).
 */
import React from 'react';
import { DialogCard } from './DialogCard';
import { useDialogStore } from '../store/dialogStore';
import { COLORS } from '../theme/colors';

export const DialogHost = () => {
  const dialog = useDialogStore((s) => s.dialog);
  const hide = useDialogStore((s) => s.hide);
  if (!dialog) return null;

  const { title, message, buttons } = dialog;

  // Close first, then run the button, so a button can open the next dialog.
  const press = (button) => {
    hide();
    button?.onPress?.();
  };

  return (
    <DialogCard
      visible
      title={title}
      message={message}
      onDismiss={() => press(buttons.find((b) => b.style === 'cancel'))}
      buttons={buttons.map((button) => ({
        text: button.text,
        color: button.style === 'destructive' ? COLORS.loss : COLORS.accent,
        onPress: () => press(button),
      }))}
    />
  );
};
