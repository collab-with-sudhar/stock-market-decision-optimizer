import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  summary: null,
  positions: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    // Fetch portfolio
    fetchPortfolioStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchPortfolioSuccess: (state, action) => {
      state.loading = false;
      state.summary = action.payload;
      state.positions = action.payload.positions || [];
      state.lastUpdated = new Date().toISOString();
    },
    fetchPortfolioFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Update portfolio
    updatePortfolioStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    updatePortfolioSuccess: (state, action) => {
      state.loading = false;
      // The payload is already the summary data
      state.summary = action.payload;
      state.positions = action.payload.positions || [];
      state.lastUpdated = new Date().toISOString();
    },
    updatePortfolioFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchPortfolioStart,
  fetchPortfolioSuccess,
  fetchPortfolioFailure,
  updatePortfolioStart,
  updatePortfolioSuccess,
  updatePortfolioFailure,
  clearError,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
