/**
 * Portfolio Data Store (Zustand)
 * Manages dashboard, portfolio, and stock data
 */
import { create } from 'zustand';
import api from '../config/api';
import { getErrorMessage } from '../utils/errors';

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
  growthData: [],
  isLoading: false,
  error: null,

  // ── Fetch Dashboard Data ──
  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/portfolio/dashboard/');
      set({ dashboard: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load dashboard' });
      return null;
    }
  },

  // ── Fetch Stock Summary ──
  fetchStockSummary: async () => {
    try {
      const response = await api.get('/investments/stocks/summary/');
      set({ stockSummary: response.data });
      return response.data;
    } catch (error) {
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
      const response = await api.get('/investments/stocks/?is_sold=true');
      const data = response.data.results || response.data;
      set({ soldStocks: data });
      return data;
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
    set({ isSearching: true });
    try {
      const response = await api.get(`/portfolio/search-stocks/?q=${encodeURIComponent(query)}`);
      const results = response.data.results || [];
      set({ searchResults: results, isSearching: false });
      return results;
    } catch (error) {
      console.error('Stock search failed:', error);
      set({ searchResults: [], isSearching: false });
      return [];
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

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
    try {
      const response = await api.get('/dividends/');
      set({ dividends: response.data.results || response.data });
      return response.data;
    } catch (error) {
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

  // ── Fetch Growth Data ──
  fetchGrowthData: async (limit = 30) => {
    try {
      const response = await api.get(`/portfolio/growth/?limit=${limit}`);
      set({ growthData: response.data.results || response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch growth data:', error);
      return null;
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
