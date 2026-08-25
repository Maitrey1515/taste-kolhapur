import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { DiscoveryFilters } from '@/types';
import clsx from 'clsx';

const AREAS = [
  'Mahadwar Road', 'Tarabai Park', 'Rankala', 'Rajarampuri',
  'Kasba Bawada', 'Shahu Nagar', 'Laxmipuri', 'Jaysingpur',
  'Karvir', 'New Shahupuri',
];

const SORT_OPTIONS: Array<{ value: DiscoveryFilters['sort']; label: string }> = [
  { value: 'relevance',   label: 'Relevance' },
  { value: 'rating',      label: 'Highest Rated' },
  { value: 'distance',    label: 'Distance' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'reviews',     label: 'Most Reviewed' },
  { value: 'newest',      label: 'Newest' },
];

interface Props {
  filters: DiscoveryFilters;
  onChange: (f: DiscoveryFilters) => void;
  onReset: () => void;
  className?: string;
}

type BoolKey = 'open_now' | 'parking' | 'family_friendly' | 'ac' | 'takeaway' | 'delivery' | 'wheelchair' | 'veg';

const FEATURE_TOGGLES: Array<{ key: BoolKey; label: string }> = [
  { key: 'open_now',       label: '🟢 Open Now' },
  { key: 'parking',        label: '🅿️ Parking' },
  { key: 'family_friendly',label: '👨‍👩‍👧 Family Friendly' },
  { key: 'ac',             label: '❄️ Air Conditioned' },
  { key: 'takeaway',       label: '🥡 Takeaway' },
  { key: 'delivery',       label: '🛵 Delivery' },
  { key: 'wheelchair',     label: '♿ Wheelchair Access' },
  { key: 'veg',            label: '🌿 Pure Veg' },
];

export default function FilterSidebar({ filters, onChange, onReset, className }: Props) {
  const [expanded, setExpanded] = useState({ features: true, sort: true, price: true, rating: true, area: true });

  const toggle = (key: keyof typeof expanded) =>
    setExpanded(e => ({ ...e, [key]: !e[key] }));

  const set = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount = [
    filters.area,
    filters.price_level,
    filters.min_rating,
    filters.open_now,
    filters.parking,
    filters.family_friendly,
    filters.ac,
    filters.takeaway,
    filters.delivery,
    filters.wheelchair,
    filters.veg,
  ].filter(Boolean).length;

  return (
    <aside className={clsx('w-64 flex-shrink-0', className)}>
      <div className="card p-4 sticky top-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange-500" />
            <h3 className="font-display font-semibold text-[var(--text-primary)]">Filters</h3>
            {activeCount > 0 && (
              <span className="badge bg-orange-500 text-white text-[10px]">{activeCount}</span>
            )}
          </div>
          {activeCount > 0 && (
            <button onClick={onReset} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Sort */}
        <Section title="Sort By" open={expanded.sort} onToggle={() => toggle('sort')}>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={e => set('sort', e.target.value as DiscoveryFilters['sort'])}
            className="input text-xs"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Section>

        <div className="divider" />

        {/* Area */}
        <Section title="Area" open={expanded.area} onToggle={() => toggle('area')}>
          <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-hide">
            <button
              onClick={() => set('area', '')}
              className={clsx('w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all',
                !filters.area ? 'bg-orange-500 text-white' : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
              )}
            >
              All Areas
            </button>
            {AREAS.map(area => (
              <button
                key={area}
                onClick={() => set('area', filters.area === area ? '' : area)}
                className={clsx('w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all',
                  filters.area === area ? 'bg-orange-500 text-white' : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </Section>

        <div className="divider" />

        {/* Price Level */}
        <Section title="Price Level" open={expanded.price} onToggle={() => toggle('price')}>
          <div className="flex gap-2">
            {([null, 1, 2, 3, 4] as const).map(level => (
              <button
                key={level ?? 'all'}
                onClick={() => set('price_level', level)}
                className={clsx(
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  filters.price_level === level
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-orange-300'
                )}
              >
                {level === null ? 'All' : '₹'.repeat(level)}
              </button>
            ))}
          </div>
        </Section>

        <div className="divider" />

        {/* Min Rating */}
        <Section title="Min Rating" open={expanded.rating} onToggle={() => toggle('rating')}>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>Any</span>
              <span className="font-semibold text-orange-500">
                {filters.min_rating ? `${filters.min_rating}+ ⭐` : 'Any rating'}
              </span>
            </div>
            <input
              id="filter-rating"
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={filters.min_rating ?? 0}
              onChange={e => set('min_rating', parseFloat(e.target.value) || null)}
              className="w-full accent-orange-500"
            />
          </div>
        </Section>

        <div className="divider" />

        {/* Features */}
        <Section title="Features" open={expanded.features} onToggle={() => toggle('features')}>
          <div className="space-y-2">
            {FEATURE_TOGGLES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={clsx(
                    'w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                    filters[key]
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-[var(--border)] group-hover:border-orange-300'
                  )}
                  onClick={() => set(key, !filters[key])}
                >
                  {filters[key] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => set(key, !filters[key])}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────
function Section({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && children}
    </div>
  );
}
