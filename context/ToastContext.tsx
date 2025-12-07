import React, { createContext, useContext, useState, useCallback, useRef, useEffect, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Toast, ToastType } from '../types';

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: PropsWithChildren<{}>) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    // Clear timeout when toast is manually dismissed
    if (toastTimeouts.current.has(id)) {
      clearTimeout(toastTimeouts.current.get(id)!);
      toastTimeouts.current.delete(id);
    }
  }, []);

  // Cleanup all timeouts on provider unmount
  useEffect(() => {
    const timeouts = toastTimeouts.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = uuidv4();
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      toastTimeouts.current.set(id, timer);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
