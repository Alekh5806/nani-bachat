/**
 * Cross-platform Alert
 * react-native-web's Alert.alert() is a no-op, so on web this falls back
 * to window.alert/window.confirm. Native (iOS/Android) behavior is untouched —
 * it just forwards straight to React Native's own Alert.
 */
import { Platform, Alert as RNAlert } from 'react-native';

const showWebAlert = (title, message, buttons) => {
  const text = [title, message].filter(Boolean).join('\n\n');

  // No buttons or a single non-cancel button — simple notice.
  if (!buttons || buttons.length <= 1) {
    if (typeof window !== 'undefined') window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Multiple buttons — use confirm() to decide which callback to run.
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = typeof window !== 'undefined' ? window.confirm(text) : false;
  if (confirmed) {
    actionButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
};

export const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === 'web') {
      showWebAlert(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
