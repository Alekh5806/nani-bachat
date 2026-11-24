/**
 * Dialog store
 * Holds the confirmation / notice dialog that DialogHost shows. Screens do not
 * use it directly: call Alert.alert(...) from utils/alert.js.
 */
import { create } from 'zustand';

export const useDialogStore = create((set) => ({
  // { title, message, buttons: [{ text, style, onPress }] } or null
  dialog: null,
  show: (dialog) => set({ dialog }),
  hide: () => set({ dialog: null }),
}));
