import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastType } from '../types';

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-900/95 border-green-500',
        icon: <CheckCircle size={18} className="text-green-400" />,
        text: 'text-green-100'
      };
    case 'error':
      return {
        bg: 'bg-red-900/95 border-red-500',
        icon: <XCircle size={18} className="text-red-400" />,
        text: 'text-red-100'
      };
    case 'warning':
      return {
        bg: 'bg-amber-900/95 border-amber-500',
        icon: <AlertTriangle size={18} className="text-amber-400" />,
        text: 'text-amber-100'
      };
    case 'info':
    default:
      return {
        bg: 'bg-slate-800/95 border-slate-600',
        icon: <Info size={18} className="text-blue-400" />,
        text: 'text-slate-100'
      };
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-md pointer-events-none" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`${styles.bg} ${styles.text} border rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto`}
          >
            <span className="mt-0.5 shrink-0">{styles.icon}</span>
            <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={14} className="opacity-60" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
