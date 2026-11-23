/**
 * Logo store
 * Holds company logo URLs by symbol. Symbols are looked up in one batched call
 * and remembered for the session, so re-rendering never hits the network.
 * The backend caches the provider answer, so it is not asked twice either.
 */
import { create } from 'zustand';
import api from '../config/api';

const BATCH_DELAY_MS = 30;
let queue = new Set();
let timer = null;

export const useLogoStore = create((set, get) => ({
  // symbol -> url string, or null when the company has no logo
  logos: {},
  requested: {},

  ensure: (symbol) => {
    if (!symbol || get().requested[symbol]) return;
    set((state) => ({ requested: { ...state.requested, [symbol]: true } }));
    queue.add(symbol);
    if (timer) return;
    timer = setTimeout(async () => {
      const batch = [...queue];
      queue = new Set();
      timer = null;
      try {
        const response = await api.get('/portfolio/logos/', {
          params: { symbols: batch.join(',') },
        });
        set((state) => ({ logos: { ...state.logos, ...(response.data?.logos || {}) } }));
      } catch (error) {
        // Allow a retry on the next render if the call failed.
        set((state) => {
          const requested = { ...state.requested };
          batch.forEach((s) => delete requested[s]);
          return { requested };
        });
      }
    }, BATCH_DELAY_MS);
  },

  clear: () => set({ logos: {}, requested: {} }),
}));
