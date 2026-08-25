import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Review, Restaurant } from '@/types';
import { buildTasteProfileFromReviews, buildRecommendationLists } from '@/lib/recommendations';
import ReviewCard from '@/components/ReviewCard';
import RestaurantCard from '@/components/RestaurantCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { User, MapPin, Edit3, Save, Compass } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function CustomerDashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Profile edit state
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    
    setDisplayName(profile.display_name ?? '');
    setCity(profile.city ?? '');
    setBio(profile.bio ?? '');
    setAvatar(profile.avatar ?? '');

    const loadData = async () => {
      // 1. Fetch user's reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, restaurant:restaurants(*), replies:review_replies(*, owner:profiles(display_name,avatar))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      const userReviews = (revs ?? []) as Review[];
      setReviews(userReviews);

      // 2. Compute taste profile & update if needed
      const tasteProfile = buildTasteProfileFromReviews(userReviews);
      await supabase.from('profiles').update({ taste_profile: tasteProfile }).eq('id', user.id);

      // 3. Fetch all restaurants for recommendations
      const { data: allRests } = await supabase.from('restaurants').select('*');
      
      // 4. Build recommendations
      if (allRests) {
        const lists = buildRecommendationLists(allRests as Restaurant[], tasteProfile);
        setRecommendations(lists);
      }
      
      setLoading(false);
    };

    loadData();
  }, [user, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      city,
      bio,
      avatar,
    }).eq('id', user.id);
    
    setSaving(false);
    if (error) {
      showToast({ type: 'error', title: 'Update failed', message: error.message });
    } else {
      showToast({ type: 'success', title: 'Profile updated' });
      setEditing(false);
      refreshProfile();
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <main className="page-container py-8 space-y-8">
      {/* ─── Header & Profile Edit ──────────────────────────────── */}
      <div className="card p-6 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-2xl bg-gradient-misal p-1 flex-shrink-0 mx-auto md:mx-0">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl border-2 border-white" />
            ) : (
              <div className="w-full h-full rounded-xl bg-[var(--surface)] flex items-center justify-center">
                <User className="w-10 h-10 text-orange-500" />
              </div>
            )}
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
                {profile?.display_name ?? 'My Profile'}
              </h1>
              <button 
                onClick={() => editing ? handleSaveProfile() : setEditing(true)} 
                className="btn btn-secondary btn-sm"
                disabled={saving}
              >
                {editing ? <><Save className="w-4 h-4"/> Save</> : <><Edit3 className="w-4 h-4"/> Edit</>}
              </button>
            </div>
            
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="label">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} className="input" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Bio</label>
                  <input type="text" value={bio} onChange={e => setBio(e.target.value)} className="input" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Avatar URL</label>
                  <input type="url" value={avatar} onChange={e => setAvatar(e.target.value)} className="input" placeholder="https://..." />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                  {profile?.city || 'City not set'}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{profile?.bio || 'No bio yet.'}</p>
                <div className="flex gap-2 mt-2">
                  <span className="badge badge-orange">{reviews.length} Reviews</span>
                  <span className="badge badge-gray">Member since {new Date(profile?.created_at ?? '').getFullYear()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Recommendations ────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">Recommended for You</h2>
        </div>
        
        <div className="space-y-8">
          {recommendations.map(list => (
            <div key={list.category}>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                {list.icon} {list.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">{list.subtitle}</p>
              
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {list.restaurants.map((r: Restaurant) => (
                  <div key={r.id} className="w-64 flex-shrink-0 snap-start">
                    <RestaurantCard restaurant={r} showMPS={false} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── My Reviews ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">
          My Reviews ({reviews.length})
        </h2>
        
        {reviews.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            You haven't written any reviews yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(review => (
              <div key={review.id} className="card overflow-hidden">
                <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--border)] flex justify-between items-center">
                  <div className="font-semibold text-sm">{review.restaurant?.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{new Date(review.created_at).toLocaleDateString()}</div>
                </div>
                <div className="p-0 border-none shadow-none bg-transparent">
                   <ReviewCard review={review} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
