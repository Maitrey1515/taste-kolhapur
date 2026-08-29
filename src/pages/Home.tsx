import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sparkles, Trophy, MapPin, Calendar, ArrowRight, Star, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, getDoc, doc } from 'firebase/firestore';
import type { Restaurant, RestaurantEvent } from '@/types';
import RestaurantCard from '@/components/RestaurantCard';
import EventCard from '@/components/EventCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { parseNLQuery } from '@/lib/nlp';

export default function Home() {
  const [search, setSearch] = useState('');
  const [topRestaurants, setTopRestaurants] = useState<Restaurant[]>([]);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'restaurants'), orderBy('taste_score', 'desc'), limit(6))),
      getDocs(query(
        collection(db, 'restaurant_events'), 
        where('is_active', '==', true), 
        where('start_date', '>=', new Date().toISOString().split('T')[0]), 
        orderBy('start_date', 'asc'), 
        limit(4)
      ))
    ]).then(async ([restaurantsSnap, eventsSnap]) => {
      setTopRestaurants(restaurantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Restaurant[]);
      
      const evsData = await Promise.all(eventsSnap.docs.map(async (d) => {
        const ev = { id: d.id, ...d.data() } as any;
        if (ev.restaurant_id) {
          const rDoc = await getDoc(doc(db, 'restaurants', ev.restaurant_id));
          if (rDoc.exists()) ev.restaurant = { name: rDoc.data().name, area: rDoc.data().area, slug: rDoc.data().slug };
        }
        return ev;
      }));
      setEvents(evsData as RestaurantEvent[]);
      setLoading(false);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      navigate('/discover');
      return;
    }
    const { filters, cleanedSearch } = parseNLQuery(search);
    const params = new URLSearchParams();
    if (cleanedSearch) params.set('q', cleanedSearch);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== false && v !== '') {
        params.set(k, String(v));
      }
    });
    navigate(`/discover?${params.toString()}`);
  };

  const categories = [
    { label: 'Top Rated',    icon: '⭐', filter: 'sort=rating',            color: 'from-amber-400 to-orange-500' },
    { label: 'Open Now',     icon: '🟢', filter: 'open_now=true',          color: 'from-green-400 to-emerald-500' },
    { label: 'Budget Picks', icon: '💰', filter: 'price_level=2',          color: 'from-blue-400 to-indigo-500' },
    { label: 'With Parking', icon: '🅿️', filter: 'parking=true',           color: 'from-purple-400 to-violet-500' },
    { label: 'Family Spots', icon: '👨‍👩‍👧', filter: 'family_friendly=true',  color: 'from-pink-400 to-rose-500' },
    { label: 'AC Places',    icon: '❄️', filter: 'ac=true',                color: 'from-cyan-400 to-blue-500' },
    { label: 'Delivery',     icon: '🛵', filter: 'delivery=true',           color: 'from-orange-400 to-red-500' },
    { label: 'Pure Veg',     icon: '🌿', filter: 'veg=true',               color: 'from-emerald-400 to-green-500' },
  ];

  return (
    <main>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1600&q=85"
            alt="Kolhapur Misal"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        </div>

        <div className="relative page-container py-20 w-full">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 backdrop-blur-sm mb-4 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 text-xs font-medium">Kolhapur's #1 Misal Discovery Platform</span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-black text-5xl sm:text-6xl text-white leading-tight mb-4 animate-slide-up">
              Find Your Perfect<br />
              <span className="text-gradient">Misal</span> in Kolhapur
            </h1>
            <p className="text-white/70 text-lg mb-8 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Discover, rate, and explore 13+ authentic Misal restaurants across Kolhapur.
              AI-powered recommendations based on your taste.
            </p>

            {/* Search box */}
            <form onSubmit={handleSearch} className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gray-400 z-10" />
                <input
                  id="hero-search"
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder='Try "cheap spicy misal open now near Rankala"'
                  className="w-full pl-12 pr-36 py-4 rounded-2xl bg-white/95 dark:bg-[var(--surface)]/95
                             text-[var(--text-primary)] placeholder-gray-400 text-sm border-0
                             focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-2xl backdrop-blur-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 btn btn-primary py-2.5 rounded-xl"
                >
                  Search
                </button>
              </div>
              <p className="text-white/50 text-xs mt-2 ml-1">
                💡 Try natural language: "family friendly with parking", "best value under ₹100"
              </p>
            </form>

            {/* Stats */}
            <div className="flex gap-6 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {[
                { value: '13+', label: 'Restaurants' },
                { value: '4.2★', label: 'Avg Rating' },
                { value: '100%', label: 'Real Reviews' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-2xl font-display font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Categories ─────────────────────────────────────────── */}
      <section className="py-10 bg-[var(--surface-secondary)]">
        <div className="page-container">
          <div className="flex overflow-x-auto gap-3 scrollbar-hide pb-2">
            {categories.map(cat => (
              <Link
                key={cat.label}
                to={`/discover?${cat.filter}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl
                           bg-[var(--surface)] border border-[var(--border)] hover:border-orange-300
                           hover:shadow-md transition-all duration-200 group min-w-[80px]"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl
                                 group-hover:scale-110 transition-transform duration-200`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap text-center">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Top Restaurants ────────────────────────────────────── */}
      <section className="py-14 page-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Top Rated Restaurants
            </h2>
            <p className="section-subtitle">Ranked by community ratings & Misal Performance Score</p>
          </div>
          <Link to="/discover?sort=rating" className="btn btn-ghost btn-sm group">
            See all <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading restaurants…" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topRestaurants.map((r, i) => (
              <div key={r.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <RestaurantCard restaurant={r} showMPS />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Features strip ─────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="page-container grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: <Sparkles className="w-6 h-6" />, title: 'AI Recommendations', desc: 'Matched to your taste profile' },
            { icon: <Star className="w-6 h-6" />,     title: '11 Sub-Ratings',    desc: 'Beyond just stars' },
            { icon: <Zap className="w-6 h-6" />,      title: 'MPS Score',         desc: 'Business intelligence rankings' },
            { icon: <TrendingUp className="w-6 h-6" />,title: 'Real Insights',    desc: 'Data-driven discoveries' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{f.title}</p>
                <p className="text-white/70 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Events ─────────────────────────────────────────────── */}
      {events.length > 0 && (
        <section className="py-14 page-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Calendar className="w-6 h-6 text-orange-500" />
                Upcoming Events
              </h2>
              <p className="section-subtitle">Festivals, competitions & special menus</p>
            </div>
            <Link to="/events" className="btn btn-ghost btn-sm group">
              All events <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {events.map((ev, i) => (
              <div key={ev.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <EventCard event={ev} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-[var(--surface-secondary)]">
        <div className="page-container text-center">
          <h2 className="font-display font-black text-4xl text-[var(--text-primary)] mb-4">
            Own a Misal Restaurant?
          </h2>
          <p className="text-[var(--text-muted)] mb-8 max-w-xl mx-auto">
            Register your restaurant to respond to reviews, post events, and get access to powerful analytics.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/discover" className="btn btn-secondary btn-lg">
              <MapPin className="w-4 h-4" /> Find Misal Places
            </Link>
            <Link to="/add-restaurant" className="btn btn-primary btn-lg">
              <ArrowRight className="w-4 h-4" /> Register Restaurant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
