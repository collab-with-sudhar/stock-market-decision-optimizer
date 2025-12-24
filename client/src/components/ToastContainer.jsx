import React, { useEffect } from 'react';
import { useToast } from '../contexts/useToast.js';

const ToastNotification = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = React.useState(false);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }[toast.type];

  const icon = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm
        ${bgColor} text-white
        transform transition-all duration-300
        ${isExiting ? 'translate-x-96 opacity-0' : 'translate-x-0 opacity-100'}
        border border-white/20
      `}
    >
      <span className="material-symbols-outlined flex-shrink-0 text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{toast.message}</p>
        {toast.data && (
          <pre className="mt-1 text-xs bg-black/20 p-2 rounded max-w-sm overflow-auto">
            {typeof toast.data === 'string' ? toast.data : JSON.stringify(toast.data, null, 2)}
          </pre>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
      >
        <span className="material-symbols-outlined text-xl">close</span>
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-auto">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};
