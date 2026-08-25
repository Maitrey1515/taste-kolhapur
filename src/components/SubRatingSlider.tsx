import clsx from 'clsx';

interface Props {
  label: string;
  value: number;       // 1–5
  onChange?: (v: number) => void;
  description?: string;
}

const LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
};
const COLORS: Record<number, string> = {
  1: 'from-red-400 to-red-500',
  2: 'from-orange-400 to-orange-500',
  3: 'from-amber-400 to-amber-500',
  4: 'from-green-400 to-green-500',
  5: 'from-emerald-400 to-emerald-500',
};

export default function SubRatingSlider({ label, value, onChange, description }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
          {description && (
            <span className="ml-1 text-[10px] text-[var(--text-muted)]">({description})</span>
          )}
        </div>
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          value >= 4
            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
            : value >= 3
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
        )}>
          {value}/5 · {LABELS[value]}
        </span>
      </div>
      <div className="relative">
        <div className="sub-rating-bar">
          <div
            className={clsx('sub-rating-fill bg-gradient-to-r', COLORS[value])}
            style={{ width: `${(value / 5) * 100}%` }}
          />
        </div>
        {onChange && (
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            onChange={e => onChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}
