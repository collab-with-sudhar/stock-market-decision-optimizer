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

    
    updatePortfolioStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    updatePortfolioSuccess: (state, action) => {
      state.loading = false;
      
      state.summary = action.payload;
      state.positions = action.payload.positions || [];
      state.lastUpdated = new Date().toISOString();
    },
    updatePortfolioFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    
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
