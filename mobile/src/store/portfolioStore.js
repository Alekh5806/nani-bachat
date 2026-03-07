/**
 * Portfolio Data Store (Zustand)
 * Manages dashboard, portfolio, and stock data
 */
import { create } from 'zustand';
import api from '../config/api';

export const usePortfolioStore = create((set, get) => ({
  // ── State ──
  dashboard: null,
  stocks: [],
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
      get().fetchStocks();
      get().fetchStockSummary();
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || 'Failed to add stock',
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
        error: error.response?.data || 'Failed to add dividend',
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
