import { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Restaurant } from '@/types';
import RestaurantCard from '@/components/RestaurantCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { attachDistances } from '@/lib/recommendations';

export default function Nearby() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'locating' | 'granted' | 'denied'>('prompt');
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  const requestLocation = () => {
    setLocationStatus('locating');
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      (err) => {
        console.error(err);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (coords) {
      setLoading(true);
      getDocs(collection(db, 'restaurants'))
        .then((snap) => {
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const withDistances = attachDistances(data as Restaurant[], coords.lat, coords.lng)
            .filter(r => r.distance_km !== undefined)
            .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
          setRestaurants(withDistances);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching nearby restaurants:", err);
          setLoading(false);
        });
    }
  }, [coords]);

  return (
    <main className="page-container py-8 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Nearby Misal</h1>
          <p className="text-sm text-[var(--text-muted)]">Find the closest restaurants to your current location</p>
        </div>
      </div>

      {locationStatus === 'prompt' || locationStatus === 'denied' ? (
        <div className="card p-10 text-center max-w-lg mx-auto mt-12 animate-scale-in">
          <Compass className="w-16 h-16 text-orange-200 dark:text-orange-900 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-2">
            Location Access Required
          </h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            {locationStatus === 'denied'
              ? "We couldn't access your location. Please enable location permissions in your browser settings and try again."
              : "Allow TasteKolhapur to access your location to find the best Misal spots near you."}
          </p>
          <button onClick={requestLocation} className="btn btn-primary btn-lg w-full">
            <Navigation className="w-5 h-5" />
            {locationStatus === 'denied' ? 'Try Again' : 'Find Misal Near Me'}
          </button>
        </div>
      ) : locationStatus === 'locating' ? (
        <div className="py-20">
          <LoadingSpinner label="Getting your precise location…" />
        </div>
      ) : (
        <>
          {loading ? (
            <LoadingSpinner label="Finding restaurants near you…" />
          ) : restaurants.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)]">No restaurants found near your location.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {restaurants.map((r, i) => (
                <div key={r.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <RestaurantCard restaurant={r} showDistance />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
