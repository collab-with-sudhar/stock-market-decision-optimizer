import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './redux/store.js';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Orders from './pages/Orders.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ToastContainer } from './components/ToastContainer.jsx';
import { loadUser, logout } from './redux/authSlice.js';
import HowItWorksPage from './pages/HowItWorksPage.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const [initializing, setInitializing] = React.useState(true);
  
  
  const { socketConnected } = useWebSocket();

  useEffect(() => {
    
    const loadUserData = async () => {
      try {
        const { authApi } = await import('./api/authApi.js');
        const response = await authApi.getMe();
        if (response.data?.success && response.data?.user) {
          dispatch(loadUser(response.data.user));
        } else {
          dispatch(logout());
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        dispatch(logout());
      } finally {
        setInitializing(false);
      }
    };

    loadUserData();
  }, [dispatch]);

  
  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FDF9F9] dark:bg-[#1A1212]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-landing-primary mx-auto mb-4"></div>
          <p className="text-landing-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Provider>
  );
};

export default App;