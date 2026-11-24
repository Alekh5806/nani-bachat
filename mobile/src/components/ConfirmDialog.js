/**
 * ConfirmDialog
 * Confirmation modal with a Cancel and a confirm button, for actions that need
 * a loading state (for example delete). For plain popups call Alert.alert
 * (utils/alert.js), which uses the same look through DialogHost.
 *   <ConfirmDialog visible title message confirmText="Delete" destructive
 *     loading onConfirm onCancel />
 */
import React from 'react';
import { DialogCard } from './DialogCard';
import { COLORS } from '../theme/colors';

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <DialogCard
    visible={visible}
    title={title}
    message={message}
    onDismiss={loading ? undefined : onCancel}
    buttons={[
      { text: cancelText, color: COLORS.accent, disabled: loading, onPress: onCancel },
      {
        text: confirmText,
        color: destructive ? COLORS.loss : COLORS.accent,
        loading,
        disabled: loading,
        onPress: onConfirm,
      },
    ]}
  />
);
