import { configureStore } from '@reduxjs/toolkit';
import chartReducer from './chartSlice';
import signalsReducer from './signalsSlice';
import authReducer from './authSlice';
import ordersReducer from './ordersSlice';
import tradesReducer from './tradesSlice';
import portfolioReducer from './portfolioSlice';

// Middleware to persist state to localStorage
// NOTE: Auth state is intentionally NOT persisted to localStorage for security
const persistMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();
  
  // Save to localStorage after every action
  // Only persist chart and signals - NEVER auth, tokens, or user data
  try {
    localStorage.setItem('reduxState', JSON.stringify({
      chart: state.chart,
      signals: state.signals,
      orders: state.orders,
      trades: state.trades,
      portfolio: state.portfolio,
      // Explicitly NOT saving auth state or any tokens
    }));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
  
  return result;
};

// Load persisted state from localStorage
// Auth state is intentionally excluded - it must be loaded fresh from httpOnly cookies
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('reduxState');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Explicitly clear auth data to ensure it's never loaded from storage
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

// Create preloaded state from localStorage
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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistMiddleware),
});

export default store;
