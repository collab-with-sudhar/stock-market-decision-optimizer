import { configureStore } from '@reduxjs/toolkit';
import chartReducer from './chartSlice';
import signalsReducer from './signalsSlice';
import authReducer from './authSlice';
import ordersReducer from './ordersSlice';
import tradesReducer from './tradesSlice';
import portfolioReducer from './portfolioSlice';
import websocketReducer from './websocketSlice';



const persistMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();
  
  
  
  try {
    localStorage.setItem('reduxState', JSON.stringify({
      chart: state.chart,
      signals: state.signals,
      orders: state.orders,
      trades: state.trades,
      portfolio: state.portfolio,
      
    }));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
  
  return result;
};



const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('reduxState');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      if (parsed.auth) {
        delete parsed.auth;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  return undefined;
};


const preloadedState = loadPersistedState();

const store = configureStore({
  preloadedState,
  reducer: {
    chart: chartReducer,
    signals: signalsReducer,
    auth: authReducer,
    orders: ordersReducer,
    trades: tradesReducer,
    portfolio: portfolioReducer,
    websocket: websocketReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistMiddleware),
});

export default store;
