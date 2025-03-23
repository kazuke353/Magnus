import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Global toast state and functions
let toasts: Toast[] = [];
let listeners: (() => void)[] = [];

export function showToast({ type, message, duration = 3000 }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { id, type, message, duration };
  
  toasts = [...toasts, newToast];
  notifyListeners();
  
  // Auto-remove toast after duration
  setTimeout(() => {
    removeToast(id);
  }, duration);
  
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter(toast => toast.id !== id);
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Set up portal container
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    setPortalContainer(container);
    
    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);
  
  // Subscribe to toast changes
  useEffect(() => {
    const updateLocalToasts = () => {
      setLocalToasts([...toasts]);
    };
    
    listeners.push(updateLocalToasts);
    
    return () => {
      listeners = listeners.filter(listener => listener !== updateLocalToasts);
    };
  }, []);
  
  // Position classes
  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4'
  };
  
  // Type classes
  const getTypeClasses = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200';
    }
  };
  
  if (!portalContainer) return null;
  
  return createPortal(
    <div className={`z-50 space-y-2 w-72 ${positionClasses[position]}`}>
      {localToasts.map(toast => (
        <div
          key={toast.id}
          className={`border-l-4 p-4 rounded shadow-md animate-fade-in ${getTypeClasses(toast.type)}`}
          role="alert"
        >
          <div className="flex justify-between">
            <p className="text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-sm font-medium ml-3"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>,
    portalContainer
  );
}
