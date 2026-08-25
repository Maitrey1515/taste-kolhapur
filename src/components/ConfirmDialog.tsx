import { AlertTriangle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading,
  onConfirm, onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal max-w-sm animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              variant === 'danger'  && 'bg-red-100 dark:bg-red-950/50',
              variant === 'warning' && 'bg-amber-100 dark:bg-amber-950/50',
              variant === 'default' && 'bg-orange-100 dark:bg-orange-950/50',
            )}>
              <AlertTriangle className={clsx(
                'w-5 h-5',
                variant === 'danger'  && 'text-red-500',
                variant === 'warning' && 'text-amber-500',
                variant === 'default' && 'text-orange-500',
              )} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{message}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onCancel} disabled={loading} className="btn btn-secondary btn-sm">
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={clsx(
                'btn btn-sm',
                variant === 'danger'  ? 'btn-danger' : 'btn-primary'
              )}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
