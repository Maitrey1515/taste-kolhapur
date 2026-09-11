import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, orderBy, getDoc, increment } from 'firebase/firestore';
import type { Restaurant, Review, RestaurantEvent } from '@/types';
import { 
  Building, QrCode, Calendar, MessageSquare, Edit3, Settings, 
  BarChart2, TrendingUp, Users, Star, Plus, Trash2, Shield, Loader2 
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import QRDisplay from '@/components/QRDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import ReviewCard from '@/components/ReviewCard';
import clsx from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'qr'|'events'|'edit'|'reviews'>('overview');
  
  // Data state
  const [stats, setStats] = useState({ views: 1245, scans: 342, recentRating: 4.2 });
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [chartData, setChartData] = useState<{name:string, rating:number}[]>([]);
  
  // Edit State
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});
  const [saving, setSaving] = useState(false);
  
  // Events state
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'special_menu', description: '', start_date: '', end_date: '' });
  
  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    
    // Failsafe timer in case Firebase hangs
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);
    
    // Fetch the restaurant owned by this user
    const q = query(collection(db, 'restaurants'), where('owner_id', '==', user.uid));
    getDocs(q).then(async (snap) => {
      if (!isMounted) return;
      
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Restaurant;
        setRestaurant(data);
        setEditForm(data);
        
        // Fetch events
        try {
          const eventsQ = query(collection(db, 'restaurant_events'), where('restaurant_id', '==', data.id), orderBy('start_date', 'desc'));
          const eventsSnap = await getDocs(eventsQ);
          const evs = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (evs) setEvents(evs as RestaurantEvent[]);
        } catch (e) {
          console.error("Failed to fetch events", e);
        }
        
        let reviewsData: any[] = [];
        // Fetch reviews
        try {
          const reviewsQ = query(collection(db, 'reviews'), where('restaurant_id', '==', data.id), orderBy('created_at', 'desc'));
          const reviewsSnap = await getDocs(reviewsQ);
          reviewsData = await Promise.all(reviewsSnap.docs.map(async (d) => {
            const review = { id: d.id, ...d.data() } as any;
            if (review.user_id) {
              const uDoc = await getDoc(doc(db, 'profiles', review.user_id));
              if (uDoc.exists()) review.reviewer = { id: uDoc.id, ...uDoc.data() };
            }
            const repliesQ = query(collection(db, 'review_replies'), where('review_id', '==', d.id));
            const repliesSnap = await getDocs(repliesQ);
            review.replies = await Promise.all(repliesSnap.docs.map(async (rd: any) => {
              const reply = { id: rd.id, ...rd.data() } as any;
              if (reply.owner_id) {
                const oDoc = await getDoc(doc(db, 'profiles', reply.owner_id));
                if (oDoc.exists()) reply.owner = oDoc.data();
              }
              return reply;
            }));
            return review;
          }));
          setReviews(reviewsData as Review[]);
        } catch (e) {
          console.error("Failed to fetch reviews", e);
        }
        
        // Generate real chart data & stats
        const allReviews = (reviewsData || []) as Review[];
        const totalRevs = allReviews.length || data.review_count || 0;
        const avgOverall = allReviews.length > 0 
            ? (allReviews.reduce((sum, r) => sum + r.overall_rating, 0) / allReviews.length).toFixed(1)
            : (data.taste_score || data.google_rating || 0).toFixed(1);
            
        setStats({
          views: totalRevs,
          scans: data.mps_score ? Number(data.mps_score.toFixed(1)) : 0,
          recentRating: Number(avgOverall)
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const trendData = [];
        for (let i = 5; i >= 0; i--) {
           let d = new Date();
           d.setMonth(currentMonth - i);
           const mName = monthNames[d.getMonth()];
           const mReviews = allReviews.filter(r => {
             const rd = new Date(r.created_at);
             return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
           });
           let mRating = 0;
           if (mReviews.length > 0) {
              mRating = mReviews.reduce((sum, r) => sum + r.overall_rating, 0) / mReviews.length;
           } else {
              mRating = trendData.length > 0 ? trendData[trendData.length - 1].rating : Number(avgOverall);
           }
           trendData.push({ name: mName, rating: Number(mRating.toFixed(1)) });
        }
        setChartData(trendData);
      }
      clearTimeout(fallbackTimer);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch restaurant", err);
      clearTimeout(fallbackTimer);
      if (isMounted) setLoading(false);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [user]);

  const handleSaveDetails = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), editForm as any);
      setSaving(false);
      showToast({ type: 'success', title: 'Details updated' });
      setRestaurant({ ...restaurant, ...editForm } as Restaurant);
    } catch (error: any) {
      setSaving(false);
      showToast({ type: 'error', title: 'Update Failed', message: error.message });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    
    try {
      const docRef = await addDoc(collection(db, 'restaurant_events'), {
        restaurant_id: restaurant.id,
        ...newEvent,
        is_active: true
      });
      showToast({ type: 'success', title: 'Event created' });
      setEvents([{ id: docRef.id, restaurant_id: restaurant.id, ...newEvent, is_active: true } as unknown as RestaurantEvent, ...events]);
      setEventFormOpen(false);
      setNewEvent({ title: '', type: 'special_menu', description: '', start_date: '', end_date: '' });
    } catch (error: any) {
      showToast({ type: 'error', title: 'Failed to create event', message: error.message });
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'restaurant_events', confirmDelete));
      setEvents(events.filter(e => e.id !== confirmDelete));
      showToast({ type: 'success', title: 'Event deleted' });
    } catch (error) {
      // ignore
    }
    setConfirmDelete(null);
  };

  const handleHelpful = async (reviewId: string) => {
    await updateDoc(doc(db, 'reviews', reviewId), { helpful_count: increment(1) });
    setReviews(rs => rs.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r));
  };

  const handleOwnerReply = async (reviewId: string, content: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'review_replies'), {
        review_id: reviewId, owner_id: user.uid, content, created_at: new Date().toISOString()
      });
      showToast({ type: 'success', title: 'Reply posted' });
      // Quick manual reload of reviews so we see it immediately
      const reviewsQ = query(collection(db, 'reviews'), where('restaurant_id', '==', restaurant!.id), orderBy('created_at', 'desc'));
      const reviewsSnap = await getDocs(reviewsQ);
      const reviewsData = await Promise.all(reviewsSnap.docs.map(async (d) => {
        const review = { id: d.id, ...d.data() } as any;
        if (review.user_id) {
          const uDoc = await getDoc(doc(db, 'profiles', review.user_id));
          if (uDoc.exists()) review.reviewer = { id: uDoc.id, ...uDoc.data() };
        }
        const repliesQ = query(collection(db, 'review_replies'), where('review_id', '==', d.id));
        const repliesSnap = await getDocs(repliesQ);
        review.replies = await Promise.all(repliesSnap.docs.map(async (rd: any) => {
          const reply = { id: rd.id, ...rd.data() } as any;
          if (reply.owner_id) {
            const oDoc = await getDoc(doc(db, 'profiles', reply.owner_id));
            if (oDoc.exists()) reply.owner = oDoc.data();
          }
          return reply;
        }));
        return review;
      }));
      setReviews(reviewsData as Review[]);
    } catch(err) {
      showToast({ type: 'error', title: 'Error posting reply' });
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!restaurant) {
    return (
      <main className="page-container py-20 text-center">
        <Building className="w-16 h-16 text-orange-200 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">No Restaurant Assigned</h2>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Your account is marked as an Owner, but no restaurant is currently assigned to you. 
          If you recently submitted a claim, it may still be pending admin approval.
        </p>
      </main>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'qr',       label: 'QR Scanner', icon: QrCode },
    { id: 'events',   label: 'Manage Events', icon: Calendar },
    { id: 'reviews',  label: 'Customer Reviews', icon: MessageSquare },
    { id: 'edit',     label: 'Edit Details', icon: Edit3 },
  ] as const;

  return (
    <main className="page-container py-8 flex flex-col md:flex-row gap-6">
      {/* ─── Sidebar ────────────────────────────────────────── */}
      <aside className="w-full md:w-64 flex-shrink-0 space-y-2">
        <div className="card p-4 mb-6 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Managing</p>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)] leading-tight">{restaurant.name}</h2>
          <div className="flex gap-1 mt-2">
            <span className="badge badge-green text-[10px]"><Shield className="w-3 h-3"/> Claimed</span>
          </div>
        </div>

        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.id 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </aside>

      {/* ─── Content ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* TAB: Overview (BI Dashboard) */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-4">Business Intelligence</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 border-t-4 border-t-blue-500">
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Users className="w-4 h-4"/> Total Reviews</p>
                <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.views.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Verified customer feedback</p>
              </div>
              <div className="card p-5 border-t-4 border-t-purple-500">
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><BarChart2 className="w-4 h-4"/> MPS Score</p>
                <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.scans > 0 ? stats.scans : 'N/A'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Misal Performance Score</p>
              </div>
              <div className="card p-5 border-t-4 border-t-orange-500">
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Star className="w-4 h-4"/> Avg Rating</p>
                <p className="text-3xl font-display font-bold text-[var(--text-primary)] mt-2">{stats.recentRating}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Based on recent reviews</p>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Rating Trend (Last 6 Months)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis domain={[0, 5]} stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                    <Line type="monotone" dataKey="rating" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB: QR */}
        {activeTab === 'qr' && (
          <div className="animate-fade-in max-w-md mx-auto">
            <QRDisplay slug={restaurant.slug} restaurantName={restaurant.name} size={250} />
          </div>
        )}

        {/* TAB: Events */}
        {activeTab === 'events' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">Manage Events</h2>
              <button onClick={() => setEventFormOpen(!eventFormOpen)} className="btn btn-primary btn-sm">
                {eventFormOpen ? 'Cancel' : <><Plus className="w-4 h-4"/> Create Event</>}
              </button>
            </div>

            {eventFormOpen && (
              <form onSubmit={handleCreateEvent} className="card p-5 bg-[var(--surface-secondary)] border border-orange-200 dark:border-orange-900">
                <h3 className="font-semibold mb-4">New Event</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Event Title</label>
                    <input required type="text" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} className="input" />
                  </div>
                  <div>
                    <label className="label">Event Type</label>
                    <select required value={newEvent.type} onChange={e=>setNewEvent({...newEvent, type: e.target.value})} className="input">
                      <option value="special_menu">Special Menu</option>
                      <option value="festival">Festival</option>
                      <option value="competition">Competition</option>
                      <option value="celebration">Celebration</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Start Date</label>
                    <input required type="date" value={newEvent.start_date} onChange={e=>setNewEvent({...newEvent, start_date: e.target.value})} className="input" />
                  </div>
                  <div>
                    <label className="label">End Date (Optional)</label>
                    <input type="date" value={newEvent.end_date} onChange={e=>setNewEvent({...newEvent, end_date: e.target.value})} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Description</label>
                    <textarea value={newEvent.description} onChange={e=>setNewEvent({...newEvent, description: e.target.value})} className="input" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">Publish Event</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] bg-[var(--surface-secondary)] rounded-2xl">
                  No events created yet.
                </div>
              ) : (
                events.map(ev => (
                  <div key={ev.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{ev.title}</span>
                        <span className="badge badge-gray text-[10px]">{ev.type}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{ev.start_date} {ev.end_date ? `to ${ev.end_date}` : ''}</p>
                    </div>
                    <button onClick={() => setConfirmDelete(ev.id)} className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: Edit Details */}
        {activeTab === 'edit' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">Edit Restaurant Details</h2>
            <div className="card p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Restaurant Name</label>
                  <input type="text" value={editForm.name || ''} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="label">Area / Neighborhood</label>
                  <input type="text" value={editForm.area || ''} onChange={e=>setEditForm({...editForm, area: e.target.value})} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Full Address</label>
                  <input type="text" value={editForm.address || ''} onChange={e=>setEditForm({...editForm, address: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" value={editForm.phone || ''} onChange={e=>setEditForm({...editForm, phone: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="label">Website / Instagram Link</label>
                  <input type="url" value={editForm.website || ''} onChange={e=>setEditForm({...editForm, website: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="label">UPI ID for Payments</label>
                  <input type="text" value={editForm.upi || ''} onChange={e=>setEditForm({...editForm, upi: e.target.value})} className="input" placeholder="e.g. business@ybl" />
                </div>
                <div>
                  <label className="label">Average Cost (₹) for Two</label>
                  <input type="number" value={editForm.avg_cost || ''} onChange={e=>setEditForm({...editForm, avg_cost: parseInt(e.target.value)})} className="input" />
                </div>
                <div>
                  <label className="label">Seating Capacity</label>
                  <input type="number" value={editForm.seating_capacity || ''} onChange={e=>setEditForm({...editForm, seating_capacity: parseInt(e.target.value)})} className="input" />
                </div>
                <div>
                  <label className="label">Cover Image URL</label>
                  <input type="url" value={editForm.cover_image || ''} onChange={e=>setEditForm({...editForm, cover_image: e.target.value})} className="input" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                <button onClick={handleSaveDetails} disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Reviews */}
        {activeTab === 'reviews' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">Customer Reviews</h2>
            
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] bg-[var(--surface-secondary)] rounded-2xl">
                  No reviews yet. 
                </div>
              ) : (
                reviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onHelpful={handleHelpful}
                    isOwner={true}
                    onReply={handleOwnerReply}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteEvent}
        onCancel={() => setConfirmDelete(null)}
      />
    </main>
  );
}
