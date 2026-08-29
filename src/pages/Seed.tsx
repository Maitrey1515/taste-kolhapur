import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import masterData from '@/data/tastekolhapur_master_data.json';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function Seed() {
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  const startSeeding = async () => {
    setSeeding(true);
    setTotal(masterData.length);
    setProgress(0);
    setDone(false);

    try {
      let count = 0;
      for (const r of masterData as any[]) {
        const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
        let cover_image = null;
        if (r.google_places?.photos && r.google_places.photos.length > 0) {
          cover_image = r.google_places.photos[0].url;
        }
        
        const approx_price = parseInt((r.approx_price || '').replace(/[^0-9]/g, '')) || 200;

        const restaurantData = {
          name: r.name,
          slug,
          area: r.area,
          address: r.google_places?.verified_address || '',
          city: 'Kolhapur',
          lat: r.google_places?.lat || null,
          lng: r.google_places?.lng || null,
          google_place_id: r.google_places?.place_id || null,
          phone: r.google_places?.phone || '',
          website: r.google_places?.website || '',
          upi: r.upi === 'yes' ? 'yes' : 'no',
          price_level: 2,
          approx_price,
          seating_capacity: r.seating_capacity || null,
          established_year: r.established_year || null,
          weekly_off: r.weekly_off || '',
          employees: r.employees || null,
          opening_hours: { default: `${r.opening_time || '09:00:00'} - ${r.closing_time || '20:00:00'}` },
          features: {
            parking: r.parking === 'yes',
            ac: false,
            veg: true,
            delivery: r.delivery === 'yes',
            takeaway: true,
            family_friendly: true,
            wheelchair: false
          },
          peak_hours: { default: [r.operations?.peak_hours || ''] },
          cover_image,
          peak_customers_per_day: r.operations?.approx_customers_per_day || null,
          best_selling_dish: r.operations?.best_selling_dish || '',
          marketing_channels: r.operations?.marketing_channels || '',
          biggest_challenge: r.operations?.biggest_challenge || '',
          peak_working_days: r.operations?.peak_working_days || '',
          google_rating: r.source_dataset?.google_rating || r.google_places?.live_rating || null,
          google_reviews: r.source_dataset?.google_reviews || r.google_places?.live_review_count || null,
          claimed: false,
          taste_score: r.source_dataset?.google_rating || r.google_places?.live_rating || 4,
          mps_score: (r.source_dataset?.google_rating || 4) * 2, // Mock MPS score
          review_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const cleanRestaurantData = JSON.parse(JSON.stringify(restaurantData));

        let docId = r.hotel_id;
        if (!docId || docId.includes(' ')) {
          const docRef = await addDoc(collection(db, 'restaurants'), cleanRestaurantData);
          docId = docRef.id;
        } else {
          await setDoc(doc(db, 'restaurants', docId), cleanRestaurantData);
        }

        // Add some mock reviews to make the app look alive
        const mockReview = {
          restaurant_id: docId,
          user_id: 'mock-user',
          overall_rating: 4.5,
          sub_ratings: {
            taste: 4.5, spice: 4.0, authenticity: 5.0, service: 4.0,
            cleanliness: 4.0, ambience: 3.5, value_for_money: 4.5,
            portion_size: 4.0, waiting_time: 3.0, parking: 3.0, staff_behaviour: 4.0
          },
          would_recommend: true,
          would_visit_again: true,
          written_review: "Great misal! Will definitely come back.",
          favourite_dish: "Special Misal",
          amount_spent: 150,
          created_at: new Date().toISOString()
        };
        await addDoc(collection(db, 'reviews'), JSON.parse(JSON.stringify(mockReview)));

        count++;
        setProgress(count);
      }
      
      // Also add some mock events
      const mockEvents = [
        {
          title: "Sunday Special Misal Festival",
          description: "Join us this Sunday for an unlimited misal thali with special sweets.",
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          cover_image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
          is_active: true,
          tags: ['Festival', 'Unlimited']
        },
        {
          title: "Kolhapur Misal Eating Challenge",
          description: "Eat 5 plates of fiery misal in 10 minutes and win exciting prizes!",
          start_date: new Date(Date.now() + 86400000*3).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000*3).toISOString().split('T')[0],
          cover_image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800",
          is_active: true,
          tags: ['Challenge', 'Spicy']
        }
      ];
      
      for (const ev of mockEvents) {
        await addDoc(collection(db, 'restaurant_events'), JSON.parse(JSON.stringify(ev)));
      }
      
      showToast({ type: 'success', title: 'Seeding Complete!' });
      setDone(true);
    } catch (err: any) {
      console.error(err);
      showToast({ type: 'error', title: 'Seeding Failed', message: err.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="page-container py-20 min-h-screen flex items-center justify-center">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-6">
          <Database className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Database Seed</h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          This will read <strong>tastekolhapur_master_data.json</strong> and write {masterData.length} restaurants to your Firestore database.
        </p>

        {done ? (
          <div className="py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-600 mb-2">All Done!</h2>
            <p className="text-sm text-[var(--text-muted)]">Your database is now fully populated.</p>
          </div>
        ) : (
          <button 
            onClick={startSeeding} 
            disabled={seeding}
            className="btn btn-primary w-full py-3"
          >
            {seeding ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Seeding ({progress}/{total})...
              </span>
            ) : (
              'Start Seeding'
            )}
          </button>
        )}
      </div>
    </main>
  );
}
