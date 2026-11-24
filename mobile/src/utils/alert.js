/**
 * Alert
 * Same call as React Native's Alert.alert(title, message, buttons), but the
 * popup is the app's own dialog (DialogHost), so it looks the same on iOS,
 * Android and web. Button styles: 'cancel', 'destructive' or default.
 */
import { useDialogStore } from '../store/dialogStore';

export const Alert = {
  alert: (title, message, buttons) => {
    useDialogStore.getState().show({
      title,
      message,
      buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
    });
  },
};
