import React, { useCallback, useState } from 'react';
import { ToastContext } from './ToastContextCreate';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000, data = null) => {
    const id = Date.now();
    const toast = { id, message, type, data };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration = 3000, data = null) => {
    return addToast(message, 'success', duration, data);
  }, [addToast]);

  const error = useCallback((message, duration = 5000, data = null) => {
    return addToast(message, 'error', duration, data);
  }, [addToast]);

  const warning = useCallback((message, duration = 4000, data = null) => {
    return addToast(message, 'warning', duration, data);
  }, [addToast]);

  const info = useCallback((message, duration = 3000, data = null) => {
    return addToast(message, 'info', duration, data);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

