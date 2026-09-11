import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone, Globe, Clock, Users, Car, Leaf, Truck, Wifi, Star, CheckCircle, ArrowLeft, Share2, Heart, Shield, Loader2, Camera, ThumbsUp, ThumbsDown, Smile, Frown, Award, UtensilsCrossed, X } from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, addDoc, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import type { Restaurant, Review, ReviewSubRatings } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/StarRating';
import SubRatingSlider from '@/components/SubRatingSlider';
import ReviewCard from '@/components/ReviewCard';
import QRScanner from '@/components/QRScanner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import { formatMPS, getMPSTier } from '@/lib/mps';
import { parseVerifyUrl } from '@/lib/qr';
import { isRestaurantOpenNow } from '@/lib/chatbot';
import clsx from 'clsx';

const DEFAULT_SUB: ReviewSubRatings = {
  taste: 3, spice: 3, authenticity: 3, service: 3,
  cleanliness: 3, ambience: 3, value_for_money: 3,
  portion_size: 3, waiting_time: 3, parking: 3, staff_behaviour: 3,
};

const SUB_LABELS: Record<keyof ReviewSubRatings, string> = {
  taste: 'Taste', spice: 'Spice Level', authenticity: 'Authenticity',
  service: 'Service', cleanliness: 'Cleanliness', ambience: 'Ambience',
  value_for_money: 'Value for Money', portion_size: 'Portion Size',
  waiting_time: 'Waiting Time', parking: 'Parking', staff_behaviour: 'Staff Behaviour',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function RestaurantDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [verifiedVisit, setVerifiedVisit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [overallRating, setOverallRating] = useState(4);
  const [subRatings, setSubRatings] = useState<ReviewSubRatings>(DEFAULT_SUB);
  const [reviewText, setReviewText] = useState('');
  const [favouriteDish, setFavouriteDish] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [wouldVisitAgain, setWouldVisitAgain] = useState(true);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const q = query(collection(db, 'restaurants'), where('slug', '==', slug), limit(1));
    getDocs(q).then((snap) => {
      if (snap.empty) { navigate('/discover'); return; }
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setRestaurant(data as Restaurant);
      setLoading(false);
      loadReviews(data.id);
    }).catch(err => {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'Failed to load restaurant details.' });
      setLoading(false);
    });
  }, [slug]);

  const loadReviews = async (restaurantId: string) => {
    setReviewsLoading(true);
    const q = query(collection(db, 'reviews'), where('restaurant_id', '==', restaurantId), where('is_spam', '==', false), orderBy('created_at', 'desc'), limit(50));
    const snap = await getDocs(q);
    const reviewsData = await Promise.all(snap.docs.map(async (d) => {
      const review = { id: d.id, ...d.data() } as any;
      if (review.user_id) {
        const uDoc = await getDoc(doc(db, 'profiles', review.user_id));
        if (uDoc.exists()) review.reviewer = { id: uDoc.id, ...uDoc.data() };
      }
      const repliesQ = query(collection(db, 'review_replies'), where('review_id', '==', d.id));
      const repliesSnap = await getDocs(repliesQ);
      review.replies = await Promise.all(repliesSnap.docs.map(async rd => {
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
    setReviewsLoading(false);
  };

  const handleQRScan = async (url: string) => {
    const parsed = parseVerifyUrl(url);
    if (!parsed || parsed.slug !== slug) {
      showToast({ type: 'error', title: 'Invalid QR', message: 'This QR is not for this restaurant.' });
      setQrScanOpen(false);
      return;
    }
    setVerifiedVisit(true);
    setQrScanOpen(false);
    showToast({ type: 'success', title: '✅ Visit Verified!', message: 'Your review will be marked as a verified visit.' });
  };

  const handleSubmitReview = async () => {
    if (!user || !restaurant) {
      navigate('/auth');
      return;
    }
    if (!reviewText.trim() || reviewText.trim().length < 20) {
      showToast({ type: 'warning', title: 'Review too short', message: 'Please write at least 20 characters.' });
      return;
    }

    setSubmitting(true);
    // Spam heuristics
    const fakeScore = computeFakeScore({
      reviewText, overallRating, previousReviews: reviews.filter(r => r.user_id === user.uid)
    });

    try {
      await addDoc(collection(db, 'reviews'), {
        restaurant_id: restaurant.id,
        user_id: user.uid,
        sub_ratings: subRatings,
        overall_rating: overallRating,
        would_recommend: wouldRecommend,
        would_visit_again: wouldVisitAgain,
        written_review: reviewText.trim(),
        favourite_dish: favouriteDish.trim() || null,
        amount_spent: amountSpent ? parseInt(amountSpent) : null,
        visit_date: new Date().toISOString().split('T')[0],
        tags,
        media: [],
        verified_visit: verifiedVisit,
        is_spam: false,
        is_fake: fakeScore >= 0.7,
        fake_score: fakeScore,
        helpful_count: 0,
        created_at: new Date().toISOString()
      });

      const currentReviewCount = restaurant.review_count || 0;
      const currentTasteScore = restaurant.taste_score || 0;
      const newReviewCount = currentReviewCount + 1;
      const newTasteScore = ((currentTasteScore * currentReviewCount) + overallRating) / newReviewCount;

      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        review_count: newReviewCount,
        taste_score: newTasteScore
      });

      setRestaurant(prev => prev ? { ...prev, review_count: newReviewCount, taste_score: newTasteScore } : null);

      setSubmitting(false);
      showToast({ type: 'success', title: 'Review submitted!', message: 'Thank you for your feedback.' });
      setReviewModalOpen(false);
      resetForm();
      loadReviews(restaurant.id);
    } catch (error: any) {
      setSubmitting(false);
      showToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const resetForm = () => {
    setOverallRating(4); setSubRatings(DEFAULT_SUB); setReviewText('');
    setFavouriteDish(''); setAmountSpent(''); setWouldRecommend(true);
    setWouldVisitAgain(true); setTags([]); setVerifiedVisit(false);
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
      loadReviews(restaurant!.id);
    } catch (err) {
      showToast({ type: 'error', title: 'Error posting reply' });
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!restaurant) return null;

  const isOpen = isRestaurantOpenNow(restaurant);
  const mps = restaurant.mps_score;
  const mpsTier = mps ? getMPSTier(mps) : null;
  const avgScore = restaurant.taste_score ?? restaurant.google_rating ?? 0;

  // ─── AI Review Summary ──────────────────────────────────────
  const reviewSummary = computeReviewSummary(reviews);

  // ─── Opening hours table ────────────────────────────────────
  const hours = restaurant.opening_hours;

  return (
    <main>
      {/* ─── Hero ──────────────────────────────────────────── */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={restaurant.cover_image || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1400&q=85'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="page-container flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx('badge text-[10px] font-bold', isOpen ? 'bg-green-500 text-white' : 'bg-gray-800/80 text-gray-300')}>
                  {isOpen ? '🟢 Open Now' : '⭕ Closed'}
                </span>
                {restaurant.claimed && (
                  <span className="badge bg-orange-500/90 text-white text-[10px]">
                    <Shield className="w-2.5 h-2.5" /> Claimed
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white">{restaurant.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/70 text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{restaurant.area}</span>
                {restaurant.established_year && <span>Est. {restaurant.established_year}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {restaurant.ar_enabled && (
                <a
                  href={`/ar.html?name=${encodeURIComponent(restaurant.name)}&rating=${avgScore}&mps=${mps || ''}&price=${restaurant.avg_cost || ''}&model=${encodeURIComponent(restaurant.ar_model_url || '')}&scale=${encodeURIComponent(restaurant.ar_model_scale || '1 1 1')}`}
                  className="btn bg-orange-500 border-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] mr-2 flex items-center gap-2"
                >
                  🍲 <span className="hidden sm:inline">View in</span> AR
                </a>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="btn btn-primary bg-green-500 border-green-500 hover:bg-green-600 shadow-lg mr-2 text-white">
                  <Phone className="w-4 h-4" /> Call Now
                </a>
              )}
              <button
                onClick={() => navigator.share?.({ title: restaurant.name, url: window.location.href }).catch(() => { })}
                className="btn-icon bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button className="btn-icon bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                <Heart className="w-4 h-4" />
              </button>
              <Link to="/discover" className="btn-icon bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────── */}
      <div className="page-container py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Left column (2/3) ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Rating row */}
          <div className="card p-5 flex flex-wrap gap-6 items-center">
            <div className="text-center">
              <div className="text-4xl font-display font-black text-gradient">{avgScore.toFixed(1)}</div>
              <StarRating value={Math.round(avgScore)} size="sm" />
              <p className="text-xs text-[var(--text-muted)] mt-1">{restaurant.review_count} reviews</p>
            </div>
            {restaurant.google_rating && (
              <div className="text-center border-l border-[var(--border)] pl-6">
                <div className="text-2xl font-display font-bold text-[var(--text-primary)]">{restaurant.google_rating}</div>
                <p className="text-xs text-[var(--text-muted)]">Google ({restaurant.google_reviews?.toLocaleString()})</p>
              </div>
            )}
            {mps && (
              <div className="text-center border-l border-[var(--border)] pl-6">
                <div className="text-2xl font-display font-bold text-orange-500">{formatMPS(mps)}<span className="text-sm">/10</span></div>
                <p className={clsx('text-xs font-semibold', mpsTier?.color)}>{mpsTier?.label}</p>
                <p className="text-xs text-[var(--text-muted)]">MPS Score</p>
              </div>
            )}
            <div className="ml-auto">
              {user ? (
                <button
                  id="write-review-btn"
                  onClick={() => setReviewModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Star className="w-4 h-4" /> Write a Review
                </button>
              ) : (
                <Link to="/auth" className="btn btn-primary">Sign in to Review</Link>
              )}
            </div>
          </div>

          {/* AI Review Summary */}
          {reviews.length >= 3 && (
            <div className="card p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-orange-500" />
                <h3 className="font-display font-semibold text-[var(--text-primary)]">Review Insights</h3>
                <span className="badge badge-orange text-[10px]">AI Summary</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Sentiment</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${reviewSummary.positive}%` }} />
                    </div>
                    <span className="text-xs font-bold text-green-600">{reviewSummary.positive}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Most Loved</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {reviewSummary.mostLovedDish || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Avg Wait</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {reviewSummary.avgWaitTime > 0 ? `${reviewSummary.avgWaitTime} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Best Time</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{reviewSummary.bestTime || 'Anytime'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Would Recommend</p>
                  <p className="text-sm font-semibold text-green-600">{reviewSummary.recommendRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Will Return</p>
                  <p className="text-sm font-semibold text-blue-600">{reviewSummary.returnRate}%</p>
                </div>
              </div>
              {reviewSummary.commonComplaint && (
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  ⚠️ Common feedback: <em>{reviewSummary.commonComplaint}</em>
                </p>
              )}
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-4">
              Customer Reviews ({reviews.length})
            </h2>
            {reviewsLoading ? (
              <LoadingSpinner />
            ) : reviews.length === 0 ? (
              <div className="card p-8 text-center">
                <UtensilsCrossed className="w-10 h-10 text-[var(--border)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)] text-sm">No reviews yet. Be the first to share your experience!</p>
                {user && (
                  <button onClick={() => setReviewModalOpen(true)} className="btn btn-primary mt-4">
                    Write First Review
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onHelpful={handleHelpful}
                    isOwner={profile?.role === 'owner' && restaurant.owner_id === user?.uid}
                    onReply={handleOwnerReply}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right sidebar (1/3) ───────────────────────────── */}
        <aside className="space-y-5">
          {/* Info card */}
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold text-[var(--text-primary)]">Restaurant Info</h3>
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">{restaurant.address}, {restaurant.city}</p>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 group">
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-[var(--text-secondary)] group-hover:text-orange-500 transition-colors">
                  {restaurant.phone}
                </span>
              </a>
            )}
            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                <Globe className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-[var(--text-secondary)] group-hover:text-orange-500 truncate transition-colors">
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </span>
              </a>
            )}
            {restaurant.avg_cost && (
              <div className="flex items-center gap-3">
                <span className="text-orange-500 font-bold text-sm flex-shrink-0">₹</span>
                <span className="text-sm text-[var(--text-secondary)]">~₹{restaurant.avg_cost} per person</span>
              </div>
            )}
            {restaurant.seating_capacity && (
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-[var(--text-secondary)]">{restaurant.seating_capacity} seats</span>
              </div>
            )}
            {restaurant.weekly_off && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-[var(--text-secondary)]">Closed on {restaurant.weekly_off}</span>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-[var(--text-primary)] mb-3">Features</h3>
            <div className="flex flex-wrap gap-2">
              {restaurant.features?.parking && <span className="feature-chip feature-chip-active"><Car className="w-3 h-3" />Parking</span>}
              {restaurant.features?.ac && <span className="feature-chip feature-chip-active"><Wifi className="w-3 h-3" />AC</span>}
              {restaurant.features?.veg && <span className="feature-chip feature-chip-active"><Leaf className="w-3 h-3" />Pure Veg</span>}
              {restaurant.features?.delivery && <span className="feature-chip feature-chip-active"><Truck className="w-3 h-3" />Delivery</span>}
              {restaurant.features?.takeaway && <span className="feature-chip feature-chip-active"><UtensilsCrossed className="w-3 h-3" />Takeaway</span>}
              {restaurant.features?.family_friendly && <span className="feature-chip feature-chip-active"><Users className="w-3 h-3" />Family</span>}
            </div>
          </div>

          {/* Opening hours */}
          {hours && (
            <div className="card p-5">
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-3">Opening Hours</h3>
              <div className="space-y-1">
                {DAYS.map(day => {
                  const h = (hours as Record<string, string>)[day.slice(0, 3)] ?? hours.default ?? 'N/A';
                  const isToday = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase() === day;
                  return (
                    <div key={day} className={clsx('flex justify-between text-xs py-1', isToday && 'text-orange-500 font-semibold')}>
                      <span className="capitalize">{day}</span>
                      <span>{h === 'closed' ? '❌ Closed' : h}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



          {/* Map */}
          {restaurant.lat && restaurant.lng && (
            <div className="card p-4 overflow-hidden">
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-3">Location</h3>
              <div className="h-48 rounded-xl overflow-hidden bg-[var(--surface-secondary)] border border-[var(--border)]">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${restaurant.lat},${restaurant.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                ></iframe>
              </div>
              {restaurant.google_place_id && (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary w-full mt-3 text-sm"
                >
                  Get Directions
                </a>
              )}
            </div>
          )}

          {/* UPI */}
          {restaurant.upi && (
            <div className="card p-4 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">UPI Payment</p>
              <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{restaurant.upi}</p>
            </div>
          )}
        </aside>
      </div>

      {/* ─── Review Modal ─────────────────────────────────────── */}
      {reviewModalOpen && (
        <div className="modal-backdrop">
          <div className="modal max-w-2xl animate-scale-in">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                Review {restaurant.name}
              </h2>
              <button onClick={() => { setReviewModalOpen(false); resetForm(); }} className="btn-icon btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Overall rating */}
              <div>
                <label className="label">Overall Rating *</label>
                <StarRating value={overallRating} onChange={setOverallRating} size="lg" showValue id="overall-rating" />
              </div>

              {/* Sub-ratings */}
              <div>
                <label className="label">Detailed Ratings</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {(Object.keys(SUB_LABELS) as (keyof ReviewSubRatings)[]).map(key => (
                    <SubRatingSlider
                      key={key}
                      label={SUB_LABELS[key]}
                      value={subRatings[key]}
                      onChange={v => setSubRatings(s => ({ ...s, [key]: v }))}
                    />
                  ))}
                </div>
              </div>

              {/* Written review */}
              <div>
                <label className="label" htmlFor="review-text">Your Review *</label>
                <textarea
                  id="review-text"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className="input resize-none"
                  rows={4}
                  placeholder="Share your experience with the Misal, service, ambiance…"
                  minLength={20}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{reviewText.length}/20 min chars</p>
              </div>

              {/* Quick fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="fav-dish">Favourite Dish</label>
                  <input id="fav-dish" type="text" value={favouriteDish} onChange={e => setFavouriteDish(e.target.value)} className="input" placeholder="e.g. Tambda Rassa Misal" />
                </div>
                <div>
                  <label className="label" htmlFor="amount-spent">Amount Spent (₹)</label>
                  <input id="amount-spent" type="number" value={amountSpent} onChange={e => setAmountSpent(e.target.value)} className="input" placeholder="e.g. 120" />
                </div>
              </div>

              {/* Would recommend / visit again */}
              <div className="flex gap-6">
                <div>
                  <label className="label">Would Recommend?</label>
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(true)}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all', wouldRecommend ? 'bg-green-500 text-white border-green-500' : 'border-[var(--border)] text-[var(--text-muted)]')}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(false)}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all', !wouldRecommend ? 'bg-red-500 text-white border-red-500' : 'border-[var(--border)] text-[var(--text-muted)]')}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> No
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Visit Again?</label>
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setWouldVisitAgain(true)}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all', wouldVisitAgain ? 'bg-green-500 text-white border-green-500' : 'border-[var(--border)] text-[var(--text-muted)]')}
                    >
                      <Smile className="w-3.5 h-3.5" /> Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setWouldVisitAgain(false)}
                      className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all', !wouldVisitAgain ? 'bg-red-500 text-white border-red-500' : 'border-[var(--border)] text-[var(--text-muted)]')}
                    >
                      <Frown className="w-3.5 h-3.5" /> No
                    </button>
                  </div>
                </div>
              </div>

              {/* Verified visit */}
              <div className="p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {verifiedVisit ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Camera className="w-5 h-5 text-orange-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {verifiedVisit ? '✅ Visit Verified!' : 'Verify Your Visit'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Scan the QR code at the restaurant for a verified badge
                      </p>
                    </div>
                  </div>
                  {!verifiedVisit && (
                    <button
                      type="button"
                      onClick={() => setQrScanOpen(true)}
                      className="btn btn-secondary btn-sm"
                    >
                      Scan QR
                    </button>
                  )}
                </div>
              </div>

              {/* QR Scanner */}
              {qrScanOpen && (
                <div className="p-4 border border-orange-200 dark:border-orange-800 rounded-xl animate-fade-in">
                  <QRScanner onScan={handleQRScan} onClose={() => setQrScanOpen(false)} />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-end">
              <button
                onClick={() => { setReviewModalOpen(false); resetForm(); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="btn btn-primary"
                id="submit-review-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function computeReviewSummary(reviews: Review[]) {
  if (reviews.length === 0) return { positive: 0, mostLovedDish: '', commonComplaint: '', bestTime: '', avgWaitTime: 0, recommendRate: 0, returnRate: 0 };

  const positive = Math.round((reviews.filter(r => r.overall_rating >= 4).length / reviews.length) * 100);
  const recommendRate = Math.round((reviews.filter(r => r.would_recommend).length / reviews.length) * 100);
  const returnRate = Math.round((reviews.filter(r => r.would_visit_again).length / reviews.length) * 100);

  // Most loved dish
  const dishCounts: Record<string, number> = {};
  reviews.forEach(r => { if (r.favourite_dish) dishCounts[r.favourite_dish] = (dishCounts[r.favourite_dish] ?? 0) + 1; });
  const mostLovedDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  // Avg wait time from sub_ratings.waiting_time (1-5 scale, ~15 min steps)
  const avgWait = reviews.reduce((s, r) => s + r.sub_ratings.waiting_time, 0) / reviews.length;
  const avgWaitTime = Math.round((5 - avgWait) * 5); // invert: 5 = no wait = 0 min, 1 = very long = 20+ min

  // Common complaint (lowest rated dimension)
  const subAvgs: Record<string, number> = {};
  const SUB_KEYS = Object.keys(reviews[0].sub_ratings);
  SUB_KEYS.forEach(k => {
    subAvgs[k] = reviews.reduce((s, r) => s + (r.sub_ratings as unknown as Record<string, number>)[k], 0) / reviews.length;
  });
  const lowestKey = Object.entries(subAvgs).sort((a, b) => a[1] - b[1])[0]?.[0];
  const COMPLAINT_MAP: Record<string, string> = {
    waiting_time: 'Long wait times reported', parking: 'Limited parking',
    cleanliness: 'Cleanliness could improve', ambience: 'Ambience is basic',
    value_for_money: 'Slightly pricey for portions',
  };
  const commonComplaint = lowestKey && subAvgs[lowestKey] < 3.5 ? (COMPLAINT_MAP[lowestKey] ?? `${lowestKey} rated lower`) : '';

  // Best time
  const visitHours = reviews.map(r => r.visit_date ? new Date(r.visit_date).getHours() : null).filter(Boolean) as number[];
  const avgHour = visitHours.length ? visitHours.reduce((a, b) => a + b, 0) / visitHours.length : 9;
  const bestTime = avgHour < 12 ? 'Morning (7–11 AM)' : avgHour < 15 ? 'Lunch (12–3 PM)' : 'Evening (5–8 PM)';

  return { positive, mostLovedDish, commonComplaint, bestTime, avgWaitTime, recommendRate, returnRate };
}

function computeFakeScore({ reviewText, overallRating, previousReviews }: {
  reviewText: string;
  overallRating: number;
  previousReviews: Review[];
}): number {
  let score = 0;
  // Too short
  if (reviewText.length < 30) score += 0.3;
  // Extreme rating with short text
  if ((overallRating === 1 || overallRating === 5) && reviewText.length < 50) score += 0.2;
  // Duplicate text
  const isDuplicate = previousReviews.some(r => r.written_review === reviewText);
  if (isDuplicate) score += 0.5;
  // Review velocity (3+ reviews in 24h from same user)
  const recent = previousReviews.filter(r => {
    const h = (Date.now() - new Date(r.created_at).getTime()) / 3600000;
    return h < 24;
  });
  if (recent.length >= 2) score += 0.3;
  return Math.min(score, 1);
}
