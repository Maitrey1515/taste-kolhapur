import { Star } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  value: number;          // 0–5
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  id?: string;
}

const SIZES = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };

export default function StarRating({ value, onChange, size = 'md', showValue, id }: Props) {
  const interactive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1" id={id}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={() => onChange?.(star)}
          className={clsx(
            'transition-transform duration-100',
            interactive && 'hover:scale-110 cursor-pointer',
            !interactive && 'cursor-default pointer-events-none'
          )}
          aria-label={interactive ? `Rate ${star} stars` : undefined}
        >
          <Star
            className={clsx(
              SIZES[size],
              'transition-colors duration-100',
              star <= value ? 'text-amber-400 fill-amber-400' : 'text-[var(--border)] fill-[var(--border)]'
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-semibold text-[var(--text-secondary)]">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
