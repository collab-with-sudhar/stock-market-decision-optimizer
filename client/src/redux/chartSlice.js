import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  candles: [],
  currentPrice: null,
  lastUpdated: null,
};

export const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    addTick: (state, action) => {
      try {
        const { price, ts } = action.payload;
        const CANDLE_MS = 60000; 
        
        const bucket = Math.floor(ts / CANDLE_MS) * CANDLE_MS;
        state.currentPrice = price;
        state.lastUpdated = new Date().toISOString();
        
        const lastCandle = state.candles[state.candles.length - 1];
        
        if (!lastCandle || lastCandle.bucket !== bucket) {
          
          const newCandle = {
            bucket,
            label: new Date(bucket).toLocaleTimeString('en-IN', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 1,
          };
          state.candles.push(newCandle);
          console.log('[ChartSlice] New candle created:', newCandle);
        } else {
          
          lastCandle.high = Math.max(lastCandle.high, price);
          lastCandle.low = Math.min(lastCandle.low, price);
          lastCandle.close = price;
          lastCandle.volume = (lastCandle.volume || 0) + 1;
          console.log('[ChartSlice] Candle updated:', lastCandle);
        }
        
        
        if (state.candles.length > 60) {
          state.candles = state.candles.slice(-60);
        }
      } catch (error) {
        console.error('[ChartSlice] Error in addTick:', error);
      }
    },
    
    setCandles: (state, action) => {
      state.candles = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    clearCandles: (state) => {
      state.candles = [];
      state.currentPrice = null;
      state.lastUpdated = null;
    },

    prependCandles: (state, action) => {
      
      state.candles = [...action.payload, ...state.candles];
      if (state.candles.length > 60) {
        state.candles = state.candles.slice(-60);
      }
      state.lastUpdated = new Date().toISOString();
    },
  },
});

export const { addTick, setCandles, clearCandles, prependCandles } = chartSlice.actions;
export default chartSlice.reducer;
