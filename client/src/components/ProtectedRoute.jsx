import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FDF9F9] dark:bg-[#1A1212]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-landing-primary mx-auto mb-4"></div>
          <p className="text-landing-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
