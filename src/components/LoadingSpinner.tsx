import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function LoadingSpinner({ fullScreen, size = 'md', label }: Props) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--surface)] z-50 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-misal opacity-20 animate-ping absolute inset-0" />
          <div className="w-16 h-16 rounded-full bg-gradient-misal flex items-center justify-center relative">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <p className="text-[var(--text-muted)] text-sm font-medium animate-pulse-subtle">
          {label ?? 'Loading TasteKolhapur…'}
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center justify-center gap-2', fullScreen && 'min-h-[200px]')}>
      <Loader2 className={clsx(sizes[size], 'text-orange-500 animate-spin')} />
      {label && <span className="text-sm text-[var(--text-muted)]">{label}</span>}
    </div>
  );
}
