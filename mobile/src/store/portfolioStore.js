/**
 * Portfolio Data Store (Zustand)
 * Manages dashboard, portfolio, and stock data
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import { fetchPages } from '../config/fetchPages';
import { getErrorMessage } from '../utils/errors';

// Data that is saved on the device, so screens show the last known values
// immediately and refresh in the background.
const CACHE_KEY = 'portfolio_cache_v1';
const CACHED_KEYS = ['dashboard', 'stockSummary', 'stocks', 'soldStocks', 'members', 'dividends', 'dividendsLoaded'];
const EMPTY_CACHE = {
  dashboard: null, stockSummary: null, stocks: [], soldStocks: [],
  members: [], dividends: [], dividendsLoaded: false,
};

let searchRequestId = 0;
let dashboardRequest = 0;
let holdingsRequest = 0;
let dividendRequest = 0;

export const usePortfolioStore = create((set, get) => ({
  // ── State ──
  dashboard: null,
  stocks: [],
  soldStocks: [],
  stockSummary: null,
  members: [],
  contributions: [],
  dividends: [],
  searchResults: [],
  isSearching: false,
  dividendsLoaded: false,
  dividendsFailed: false,
  holdingsFailed: false,
  isLoading: false,
  error: null,

  // ── Forget saved data (logout, or a different user signs in) ──
  clearCache: async () => {
    dashboardRequest += 1;
    holdingsRequest += 1;
    dividendRequest += 1;
    set({ ...EMPTY_CACHE, error: null, isLoading: false, holdingsFailed: false, dividendsFailed: false });
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  },

  // ── Fetch Dashboard Data ──
  fetchDashboard: async () => {
    const request = ++dashboardRequest;
    set({ isLoading: true });
    try {
      const response = await api.get('/portfolio/dashboard/');
      if (request === dashboardRequest) set({ dashboard: response.data, isLoading: false, error: null });
      return response.data;
    } catch (error) {
      if (request === dashboardRequest) set({ isLoading: false, error: 'Failed to load dashboard' });
      return null;
    }
  },

  // ── Fetch Stock Summary ──
  fetchStockSummary: async () => {
    const request = ++holdingsRequest;
    try {
      const response = await api.get('/investments/stocks/summary/');
      if (request === holdingsRequest) set({ stockSummary: response.data, holdingsFailed: false });
      return response.data;
    } catch (error) {
      if (request === holdingsRequest) set({ holdingsFailed: true });
      console.error('Failed to fetch stock summary:', error);
      return null;
    }
  },

  // ── Fetch All Stocks ──
  fetchStocks: async () => {
    try {
      const response = await api.get('/investments/stocks/?is_sold=false');
      set({ stocks: response.data.results || response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
      return null;
    }
  },

  // ── Fetch Sold Lots ──
  // Selling splits a lot, so each sold row is its own realized transaction
  // carrying the sell price/date and the buyer it was held under.
  fetchSoldStocks: async () => {
    try {
      const sales = [];
      let page = 1;
      while (true) {
        const { data } = await api.get('/investments/stocks/', { params: { is_sold: true, page } });
        sales.push(...(data.results || data));
        if (!data.next) break;
        page += 1;
      }
      set({ soldStocks: sales });
      return sales;
    } catch (error) {
      console.error('Failed to fetch sold stocks:', error);
      return null;
    }
  },

  // ── Search Stocks (Yahoo Finance) ──
  searchStocks: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [], isSearching: false });
      return [];
    }
    // Only the newest search may write results, so a slow older one cannot overwrite it.
    const requestId = ++searchRequestId;
    set({ isSearching: true });
    try {
      const response = await api.get(`/portfolio/search-stocks/?q=${encodeURIComponent(query)}`);
      const results = response.data.results || [];
      if (requestId === searchRequestId) set({ searchResults: results, isSearching: false });
      return results;
    } catch (error) {
      console.error('Stock search failed:', error);
      if (requestId === searchRequestId) set({ searchResults: [], isSearching: false });
      return [];
    }
  },

  clearSearch: () => { searchRequestId += 1; set({ searchResults: [], isSearching: false }); },

  // ── Create Stock (Admin) ──
  createStock: async (stockData) => {
    try {
      const response = await api.post('/investments/stocks/create/', stockData);
      await Promise.all([
        get().fetchStocks(),
        get().fetchStockSummary(),
        get().fetchDashboard(),
      ]);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to add stock'),
      };
    }
  },

  // ── Update Stock (Admin) ──
  // Price/quantity/brokerage edits change what a month actually spent, so the
  // caller is expected to re-settle that month and the ones after it.
  updateStock: async (id, stockData) => {
    try {
      const response = await api.patch(`/investments/stocks/${id}/update/`, stockData);
      await Promise.all([
        get().fetchStocks(),
        get().fetchStockSummary(),
        get().fetchDashboard(),
      ]);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to update stock'),
      };
    }
  },

  // ── Delete Stock (Admin) ──
  deleteStock: async (id) => {
    try {
      await api.delete(`/investments/stocks/${id}/delete/`);
      get().fetchStocks();
      get().fetchStockSummary();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete stock' };
    }
  },

  // ── Sell Stock (Admin) ──
  sellStock: async (id, saleData) => {
    try {
      const response = await api.patch(`/investments/stocks/${id}/sell/`, saleData);
      await Promise.all([
        get().fetchStocks(),
        get().fetchSoldStocks(),
        get().fetchStockSummary(),
        get().fetchDashboard(),
      ]);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to sell stock'),
      };
    }
  },

  updateSale: async (id, changes) => {
    try {
      const { data } = await api.patch(`/investments/stocks/${id}/sale/`, changes);
      set(state => ({
        soldStocks: state.soldStocks.map(sale => sale.id === id ? data : sale),
      }));
      await get().fetchDashboard();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Could not update sale') };
    }
  },

  // ── Fetch Members ──
  fetchMembers: async () => {
    try {
      const response = await api.get('/auth/members/');
      set({ members: response.data.results || response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return null;
    }
  },

  // ── Fetch Contributions ──
  fetchContributions: async (month) => {
    try {
      const params = month ? `?month=${month}` : '';
      const response = await api.get(`/contributions/${params}`);
      set({ contributions: response.data.results || response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
      return null;
    }
  },

  // ── Update Contribution Status (Admin) ──
  updateContribution: async (id, data) => {
    try {
      const response = await api.patch(`/contributions/${id}/update/`, data);
      get().fetchContributions();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update contribution' };
    }
  },

  // ── Generate Monthly Contributions (Admin) ──
  generateContributions: async (month) => {
    try {
      const response = await api.post('/contributions/generate/', { month });
      get().fetchContributions(month);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Failed to generate contributions' };
    }
  },

  // ── Fetch Dividends ──
  fetchDividends: async () => {
    const request = ++dividendRequest;
    try {
      const rows = await fetchPages('/dividends/');
      if (request === dividendRequest) set({ dividends: rows, dividendsLoaded: true, dividendsFailed: false });
      return rows;
    } catch (error) {
      if (request === dividendRequest) set({ dividendsFailed: true });
      console.error('Failed to fetch dividends:', error);
      return null;
    }
  },

  // ── Create Dividend (Admin) ──
  createDividend: async (dividendData) => {
    try {
      const response = await api.post('/dividends/create/', dividendData);
      get().fetchDividends();
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to add dividend'),
      };
    }
  },

  // ── Pool Settlement ──
  fetchPoolStatus: async (month) => {
    try {
      const params = month ? `?month=${month}` : '';
      const response = await api.get(`/contributions/pool-status/${params}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to load pool status') };
    }
  },

  // Who physically sends what to this month's buyer. The pool keeps no account
  // of its own, so its spare cash lives in members' hands between purchases.
  fetchCashHandover: async (month) => {
    try {
      const params = month ? `?month=${month}` : '';
      const response = await api.get(`/contributions/handover/${params}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to load cash handover') };
    }
  },

  settleMonth: async (month, options = {}) => {
    try {
      const body = { month };
      if (options.buyingMember) body.buying_member = options.buyingMember;
      if (options.force) body.force = true;
      const response = await api.post('/contributions/settle/', body);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to settle month'),
        status: error?.response?.status,
      };
    }
  },

  setBuyingMember: async (month, buyingMember) => {
    try {
      const response = await api.post('/contributions/set-buyer/', {
        month,
        buying_member: buyingMember,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to set buying member') };
    }
  },

  syncPools: async () => {
    try {
      const response = await api.post('/contributions/sync-pools/');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, 'Failed to sync pools') };
    }
  },

  // ── Refresh Prices (Admin) ──
  refreshPrices: async () => {
    try {
      const response = await api.post('/portfolio/refresh-prices/');
      // Prices updated synchronously — re-fetch data immediately
      await Promise.all([
        get().fetchDashboard(),
        get().fetchStockSummary(),
      ]);
      return { success: true, message: response.data?.message || 'Prices updated' };
    } catch (error) {
      console.error('Refresh prices failed:', error?.response?.data || error.message);
      return { success: false, error: error?.response?.data?.error || 'Failed to refresh prices' };
    }
  },
}));

// ── Save to the device ──
// zustand's persist middleware uses `import.meta`, which breaks the web
// bundle, so the cache is written by hand: a debounced save on every change.
let saveTimer = null;
usePortfolioStore.subscribe((state) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const snapshot = Object.fromEntries(CACHED_KEYS.map((k) => [k, state[k]]));
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)).catch(() => {});
  }, 300);
});

/** Fill the store from the saved copy. Call once before the first screen renders. */
export const loadPortfolioCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) usePortfolioStore.setState(JSON.parse(raw));
  } catch (e) {
    // A missing or unreadable cache just means screens load normally
  }
};
