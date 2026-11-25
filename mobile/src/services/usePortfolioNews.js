import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../config/api';

const ENDPOINT = '/investments/stocks/news/portfolio/';
const FRESH_FOR = 60_000;
const SOURCE_RETRY_DELAY = 12_000;

function mergeRecent(data, previous, cursor) {
  if (cursor) {
    const known = new Set(previous.recent.map((item) => item.id));
    return [...previous.recent, ...data.recent.filter((item) => !known.has(item.id))];
  }
  if (!previous?.loadedMore || !data.next_cursor) return data.recent;

  // Keep older pages in place when refreshing the first page on focus.
  const boundary = data.recent[data.recent.length - 1];
  const older = previous.recent.filter((item) => (
    item.date < boundary.date || (item.date === boundary.date && item.id > boundary.id)
  ));
  return [...data.recent, ...older];
}

export function usePortfolioNews() {
  const [symbol, setSymbol] = useState(null);
  const [stocks, setStocks] = useState(null);
  const [feeds, setFeeds] = useState(() => new Map());
  const [network, setNetwork] = useState({ pending: null, error: null });
  const request = useRef(null);
  const fetchedAt = useRef(new Map());
  const feed = feeds.get(symbol);
  const sourcesUpdating = feed?.issues.some((issue) => issue.updating);

  const load = useCallback(async (key, cursor = null) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setNetwork({ pending: cursor ? 'more' : 'feed', error: null });
    try {
      const { data } = await api.get(ENDPOINT, {
        params: { symbol: key, cursor },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setStocks(data.stocks);
      if (!cursor) fetchedAt.current.set(key, Date.now());
      setFeeds((existing) => {
        const previous = existing.get(key);
        const recent = mergeRecent(data, previous, cursor);
        const retainedPages = !cursor && recent.length > data.recent.length;
        const next = new Map(existing);
        next.set(key, {
          ...data, recent,
          next_cursor: retainedPages ? previous.next_cursor : data.next_cursor,
          loadedMore: Boolean(cursor || retainedPages),
        });
        return next;
      });
      setNetwork({ pending: null, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (key && error.response?.status === 404) {
        fetchedAt.current.delete(null);
        fetchedAt.current.delete(key);
        setFeeds((existing) => {
          const next = new Map(existing);
          next.delete(key);
          return next;
        });
        setSymbol(null);
        setNetwork({ pending: null, error: null });
      } else {
        setNetwork({ pending: null, error: cursor ? 'more' : 'feed' });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  useFocusEffect(useCallback(() => {
    const age = Date.now() - (fetchedAt.current.get(symbol) ?? 0);
    if (age >= FRESH_FOR) load(symbol);
  }, [load, symbol]));

  useFocusEffect(useCallback(() => {
    if (!sourcesUpdating || network.pending || network.error) return undefined;
    const timer = setTimeout(() => load(symbol), SOURCE_RETRY_DELAY);
    return () => clearTimeout(timer);
  }, [load, symbol, sourcesUpdating, network.pending, network.error]));

  return {
    feed, stocks, symbol, ...network,
    select: (next) => {
      if (next === symbol) return;
      request.current?.abort();
      request.current = null;
      setNetwork({ pending: null, error: null });
      setSymbol(next);
    },
    refresh: () => load(symbol),
    loadMore: () => load(symbol, feed?.next_cursor),
  };
}
