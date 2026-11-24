/**
 * usePersistedState
 * Like useState, but the value survives a reload or an app restart. Used for
 * the selected tab of a screen, so it opens on the tab the user left.
 *   const [tab, setTab] = usePersistedState('tab:members', 'members', ['members', 'history']);
 * `allowed` (optional) is the list of valid values; anything else is ignored.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePersistedState = (key, initial, allowed) => {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (!cancelled && saved && (!allowed || allowed.includes(saved))) setValue(saved);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  const set = useCallback((next) => {
    setValue(next);
    AsyncStorage.setItem(key, next).catch(() => {});
  }, [key]);

  return [value, set];
};
