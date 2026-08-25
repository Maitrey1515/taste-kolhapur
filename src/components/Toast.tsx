import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let currentToasts: ToastItem[] = [];

export function showToast(toast: Omit<ToastItem, 'id'>) {
  const item: ToastItem = { ...toast, id: `toast-${Date.now()}` };
  currentToasts = [...currentToasts, item];
  toastListeners.forEach(l => l(currentToasts));

  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== item.id);
    toastListeners.forEach(l => l(currentToasts));
  }, toast.duration ?? 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => { toastListeners = toastListeners.filter(l => l !== setToasts); };
  }, []);

  const dismiss = useCallback((id: string) => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    toastListeners.forEach(l => l(currentToasts));
  }, []);

  const ICONS = {
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error:   <AlertCircle className="w-4 h-4 text-red-500" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
    info:    <Info className="w-4 h-4 text-blue-500" />,
  };

  const BG_COLORS: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error:   'border-l-red-500',
    warning: 'border-l-amber-500',
    info:    'border-l-blue-500',
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            'toast border-l-4 animate-slide-up',
            BG_COLORS[toast.type]
          )}
        >
          {ICONS[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
            {toast.message && <p className="text-xs text-[var(--text-muted)] mt-0.5">{toast.message}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
