import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  trades: [],
  closedTrades: [],
  openTrades: [],
  loading: false,
  error: null,
};

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    // Fetch trades
    fetchTradesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchTradesSuccess: (state, action) => {
      state.loading = false;
      state.trades = action.payload;
      state.closedTrades = action.payload.filter(t => t.status === 'CLOSED');
      state.openTrades = action.payload.filter(t => t.status === 'OPEN');
    },
    fetchTradesFailure: (state, action) => {
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
  fetchTradesStart,
  fetchTradesSuccess,
  fetchTradesFailure,
  clearError,
} = tradesSlice.actions;

export default tradesSlice.reducer;
