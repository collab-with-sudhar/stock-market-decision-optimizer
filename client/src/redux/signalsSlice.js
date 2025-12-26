import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  signals: [],
  totalSignals: 0,
  lastUpdated: null,
};

const actionMap = {
  0: 'HOLD',
  1: 'BUY',
  2: 'SELL',
};

export const signalsSlice = createSlice({
  name: 'signals',
  initialState,
  reducers: {
    addSignal: (state, action) => {
      const signal = action.payload;

      
      if (typeof signal.action === 'number' && !signal.label) {
        signal.label = actionMap[signal.action] || 'UNK';
      }

      
      if (state.signals.length > 0) {
        const last = state.signals[0];
        
        const timeDiff = Math.abs(new Date(signal.createdAt).getTime() - new Date(last.createdAt).getTime());
        if (last.symbol === signal.symbol && last.action === signal.action && timeDiff < 2000) {
          return;
        }
      }

      state.signals.unshift(signal);
      state.totalSignals += 1;
      state.lastUpdated = new Date().toISOString();
      if (state.signals.length > 50) {
        state.signals = state.signals.slice(0, 50);
      }
    },

    setSignals: (state, action) => {
      const signals = action.payload.map(s => ({
        ...s,
        label: typeof s.action === 'number' ? (actionMap[s.action] || 'UNK') : s.action,
      }));
      state.signals = signals;
      state.totalSignals = signals.length;
      state.lastUpdated = new Date().toISOString();
    },

    clearSignals: (state) => {
      state.signals = [];
      state.totalSignals = 0;
      state.lastUpdated = null;
    },

    setTotalSignalsCount: (state, action) => {
      state.totalSignals = action.payload;
    },
  },
});

export const { addSignal, setSignals, clearSignals, setTotalSignalsCount } = signalsSlice.actions;
export default signalsSlice.reducer;
