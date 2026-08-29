import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Restaurant, DiscoveryFilters } from '@/types';
import RestaurantCard from '@/components/RestaurantCard';
import FilterSidebar from '@/components/FilterSidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { parseNLQuery, describeQuery } from '@/lib/nlp';
import clsx from 'clsx';

const DEFAULT_FILTERS: DiscoveryFilters = {
  search: '', area: '', price_level: null, min_rating: null,
  open_now: false, parking: false, family_friendly: false, ac: false,
  takeaway: false, delivery: false, wheelchair: false, veg: false,
  max_wait: null, max_distance: null, sort: 'relevance',
};

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<DiscoveryFilters>(() => parseFiltersFromURL(searchParams));
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nlpHint, setNlpHint] = useState('');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const fetchRestaurants = useCallback(async (f: DiscoveryFilters, pageNum: number) => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'restaurants'));
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));

      // Filter in memory
      if (f.search) {
        const q = f.search.toLowerCase();
        data = data.filter(r => 
          r.name?.toLowerCase().includes(q) || 
          r.area?.toLowerCase().includes(q) || 
          r.address?.toLowerCase().includes(q)
        );
      }
      if (f.area) data = data.filter(r => r.area?.toLowerCase().includes(f.area.toLowerCase()));
      if (f.price_level) data = data.filter(r => r.price_level === f.price_level);
      if (f.min_rating) data = data.filter(r => (r.taste_score || 0) >= f.min_rating!);
      
      if (f.parking) data = data.filter(r => r.features?.parking);
      if (f.family_friendly) data = data.filter(r => r.features?.family_friendly);
      if (f.ac) data = data.filter(r => r.features?.ac);
      if (f.takeaway) data = data.filter(r => r.features?.takeaway);
      if (f.delivery) data = data.filter(r => r.features?.delivery);
      if (f.wheelchair) data = data.filter(r => r.features?.wheelchair);
      if (f.veg) data = data.filter(r => r.features?.veg);

      // Sort
      switch (f.sort) {
        case 'rating':     data.sort((a,b) => (b.taste_score || 0) - (a.taste_score || 0)); break;
        case 'price_asc':  data.sort((a,b) => (a.avg_cost || 0) - (b.avg_cost || 0)); break;
        case 'price_desc': data.sort((a,b) => (b.avg_cost || 0) - (a.avg_cost || 0)); break;
        case 'reviews':    data.sort((a,b) => (b.review_count || 0) - (a.review_count || 0)); break;
        case 'newest':     data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
        default:           data.sort((a,b) => (b.taste_score || 0) - (a.taste_score || 0)); break;
      }

      setTotal(data.length);

      // Pagination
      const paged = data.slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

      if (pageNum === 0) {
        setRestaurants(paged);
      } else {
        setRestaurants(prev => [...prev, ...paged]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchRestaurants(filters, 0);
    // Update URL
    const params = new URLSearchParams();
    if (filters.search) params.set('q', filters.search);
    if (filters.area) params.set('area', filters.area);
    if (filters.price_level) params.set('price_level', String(filters.price_level));
    if (filters.min_rating) params.set('min_rating', String(filters.min_rating));
    if (filters.open_now) params.set('open_now', 'true');
    if (filters.parking) params.set('parking', 'true');
    if (filters.sort !== 'relevance') params.set('sort', filters.sort);
    setSearchParams(params, { replace: true });
  }, [filters, fetchRestaurants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setFilters(f => ({ ...f, search: '' }));
      setNlpHint('');
      return;
    }
    const { filters: parsedFilters, cleanedSearch } = parseNLQuery(searchInput);
    const hint = describeQuery(parsedFilters);
    setNlpHint(hint);
    setFilters(f => ({ ...f, ...parsedFilters, search: cleanedSearch }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setNlpHint('');
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRestaurants(filters, next);
  };

  const hasMore = restaurants.length < total;

  return (
    <main className="page-container py-8 min-h-screen">
      {/* ─── Header + Search ──────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-4">
          Discover Misal in Kolhapur
        </h1>
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              id="discover-search"
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder='Search or try "cheap spicy misal near Rankala"'
              className="input pl-10 pr-4"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <Search className="w-4 h-4" /> Search
          </button>
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(o => !o)}
            className="btn btn-secondary md:hidden relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </form>

        {/* NLP Hint */}
        {nlpHint && (
          <div className="flex items-center gap-2 mt-3 p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-xs text-orange-700 dark:text-orange-300">{nlpHint}</span>
            <button onClick={handleReset} className="ml-auto text-xs text-orange-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* ─── Filter Sidebar (desktop) ─────────────────────── */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
          className="hidden md:block"
        />

        {/* ─── Mobile sidebar overlay ───────────────────────── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-[var(--surface)] overflow-y-auto p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-semibold">Filters</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
              <FilterSidebar
                filters={filters}
                onChange={f => { setFilters(f); setSidebarOpen(false); }}
                onReset={() => { handleReset(); setSidebarOpen(false); }}
              />
            </div>
          </div>
        )}

        {/* ─── Results ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Result count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--text-muted)]">
              {loading && page === 0 ? 'Loading…' : `${total} restaurant${total !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {loading && page === 0 ? (
            <LoadingSpinner label="Finding the best Misal…" />
          ) : restaurants.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-2">No restaurants found</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Try adjusting your filters or search query.</p>
              <button onClick={handleReset} className="btn btn-primary">Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {restaurants.map((r, i) => (
                  <div
                    key={r.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                  >
                    <RestaurantCard restaurant={r} showMPS />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className={clsx('btn btn-secondary', loading && 'opacity-50')}
                  >
                    {loading ? 'Loading…' : `Load more (${total - restaurants.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Parse URL params to filters ─────────────────────────────────────────
function parseFiltersFromURL(params: URLSearchParams): DiscoveryFilters {
  return {
    search:          params.get('q') ?? '',
    area:            params.get('area') ?? '',
    price_level:     params.has('price_level') ? Number(params.get('price_level')) as 1|2|3|4 : null,
    min_rating:      params.has('min_rating') ? Number(params.get('min_rating')) : null,
    open_now:        params.get('open_now') === 'true',
    parking:         params.get('parking') === 'true',
    family_friendly: params.get('family_friendly') === 'true',
    ac:              params.get('ac') === 'true',
    takeaway:        params.get('takeaway') === 'true',
    delivery:        params.get('delivery') === 'true',
    wheelchair:      params.get('wheelchair') === 'true',
    veg:             params.get('veg') === 'true',
    max_wait:        null,
    max_distance:    null,
    sort:            (params.get('sort') as DiscoveryFilters['sort']) ?? 'relevance',
  };
}
