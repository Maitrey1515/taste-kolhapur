import { useState, useEffect } from 'react';
import { Calendar, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc } from 'firebase/firestore';
import type { RestaurantEvent } from '@/types';
import EventCard from '@/components/EventCard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Events() {
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let q = query(collection(db, 'restaurant_events'), where('is_active', '==', true));

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        q = query(q, where('start_date', '>=', today), orderBy('start_date', 'asc'));
      } else if (filter === 'past') {
        q = query(q, where('start_date', '<', today), orderBy('start_date', 'desc'));
      } else {
        q = query(q, orderBy('start_date', 'desc'));
      }

      const snap = await getDocs(q);
      const data = await Promise.all(snap.docs.map(async d => {
        const ev = { id: d.id, ...d.data() } as any;
        if (ev.restaurant_id) {
          const rDoc = await getDoc(doc(db, 'restaurants', ev.restaurant_id));
          if (rDoc.exists()) ev.restaurant = { name: rDoc.data().name, area: rDoc.data().area, slug: rDoc.data().slug };
        }
        return ev;
      }));
      setEvents(data as RestaurantEvent[]);
      setLoading(false);
    };
    fetchEvents();
  }, [filter]);

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.restaurant?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page-container py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">Events</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm max-w-xl">
            Discover Misal festivals, special menus, eating competitions, and more happenings around Kolhapur.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="input pl-9"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="input w-36"
          >
            <option value="upcoming">Upcoming</option>
            <option value="past">Past Events</option>
            <option value="all">All Events</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 card">
          <Calendar className="w-12 h-12 text-[var(--border)] mx-auto mb-3" />
          <p className="text-[var(--text-primary)] font-semibold">No events found</p>
          <p className="text-sm text-[var(--text-muted)]">Check back later for exciting Misal events!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map((ev, i) => (
            <div key={ev.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <EventCard event={ev} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
