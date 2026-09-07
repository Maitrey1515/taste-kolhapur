import { initAuth, AuthState, subscribeToAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { showToast, showGlobalLoading } from './utils.js';
import { getMPSTier, formatMPS } from './mps.js';

initAuth();
initNavbar();

const urlParams = new URLSearchParams(window.location.search);
// Can support ID or Slug. We'll check ID first, if not found, we query by slug.
const paramId = urlParams.get('id');
const paramSlug = urlParams.get('slug');

let restaurant = null;
let reviewsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!paramId && !paramSlug) {
    window.location.href = '/index.html';
    return;
  }
  
  await fetchRestaurant();
  
  if (restaurant) {
    await fetchReviews();
  }
  
  subscribeToAuth((user) => {
    if (user) {
      document.getElementById('show-review-modal-btn').classList.remove('hidden');
      document.getElementById('login-to-review-btn').classList.add('hidden');
    } else {
      document.getElementById('show-review-modal-btn').classList.add('hidden');
      document.getElementById('login-to-review-btn').classList.remove('hidden');
    }
  });

  // Modal logic
  const modal = document.getElementById('review-modal');
  document.getElementById('show-review-modal-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('close-review-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('cancel-review-btn')?.addEventListener('click', () => modal.classList.add('hidden'));

  if (window.lucide) window.lucide.createIcons();
});

async function fetchRestaurant() {
  try {
    let snap;
    if (paramId) {
      snap = await getDoc(doc(db, 'restaurants', paramId));
      if (snap.exists()) restaurant = { id: snap.id, ...snap.data() };
    } 
    
    if (!restaurant && paramSlug) {
      const q = query(collection(db, 'restaurants'), where('slug', '==', paramSlug));
      const res = await getDocs(q);
      if (!res.empty) {
        restaurant = { id: res.docs[0].id, ...res.docs[0].data() };
      }
    }

    if (!restaurant) throw new Error('Not found');
    
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('content-state').classList.remove('hidden');
    
    // Populate UI
    document.getElementById('rest-name').textContent = restaurant.name;
    document.getElementById('rest-area').textContent = restaurant.area;
    document.getElementById('rest-avg-score').textContent = (restaurant.taste_score || restaurant.google_rating || 0).toFixed(1);
    document.getElementById('rest-review-count').textContent = restaurant.review_count || 0;
    document.getElementById('rest-image').src = restaurant.cover_image || 'https://via.placeholder.com/1200x600?text=No+Image';
    document.getElementById('rest-desc').textContent = restaurant.description || 'No description available.';
    document.getElementById('rest-address').querySelector('span').textContent = restaurant.address || 'Address not available';
    document.getElementById('rest-phone').querySelector('span').textContent = restaurant.phone || 'Phone not available';
    
    if (restaurant.google_rating) {
      document.getElementById('google-rating-container').classList.remove('hidden');
      document.getElementById('rest-google-rating').textContent = restaurant.google_rating.toFixed(1);
    }
    
    if (restaurant.mps_score) {
      document.getElementById('rest-mps').textContent = formatMPS(restaurant.mps_score);
      const tier = getMPSTier(restaurant.mps_score);
      const tierEl = document.getElementById('rest-mps-tier');
      tierEl.textContent = tier.label;
      tierEl.className = `text-xs font-semibold ${tier.color}`;
    } else {
      document.getElementById('mps-container').classList.add('hidden');
    }
    
    if (restaurant.location) {
      document.getElementById('rest-directions').href = `https://www.google.com/maps/search/?api=1&query=${restaurant.location._lat},${restaurant.location._long}`;
    }

    const isOpen = true; // Assuming open for vanilla, or write a real function
    const statusEl = document.getElementById('rest-status');
    statusEl.textContent = isOpen ? '🟢 Open Now' : '⭕ Closed';
    if (!isOpen) {
      statusEl.classList.remove('bg-gray-800', 'text-gray-300');
      statusEl.classList.add('bg-red-900', 'text-red-300');
    }

    // Features
    const featuresDiv = document.getElementById('rest-features');
    if (restaurant.features) {
      const f = restaurant.features;
      const html = [];
      if (f.veg) html.push('Pure Veg');
      if (f.ac) html.push('AC Available');
      if (f.parking) html.push('Parking');
      if (f.family_friendly) html.push('Family Friendly');
      
      featuresDiv.innerHTML = html.map(feat => `<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">${feat}</span>`).join('');
    }
    
  } catch (e) {
    console.error(e);
    document.getElementById('loading-state').innerHTML = `<p class="text-red-500 font-bold">Restaurant not found.</p>`;
  }
}

async function fetchReviews() {
  const reviewsList = document.getElementById('reviews-list');
  try {
    const q = query(collection(db, 'reviews'), where('restaurant_id', '==', restaurant.id), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    
    reviewsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (reviewsData.length === 0) {
      reviewsList.innerHTML = `<div class="bg-white p-8 rounded-3xl text-center border border-gray-100">
        <p class="text-gray-500 text-sm">No reviews yet. Be the first to share your experience!</p>
      </div>`;
      return;
    }
    
    reviewsList.innerHTML = reviewsData.map(r => `
      <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-4">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
              ${r.user_name ? r.user_name.charAt(0) : 'U'}
            </div>
            <div>
              <p class="font-bold text-sm flex items-center gap-2">
                ${r.user_name || 'Anonymous'}
                ${r.verified_visit ? `<span class="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full uppercase tracking-wider font-bold"><i data-lucide="check-circle" class="w-3 h-3 inline"></i> Verified</span>` : ''}
              </p>
              <p class="text-xs text-gray-500">${r.created_at?.toDate ? r.created_at.toDate().toLocaleDateString() : r.visit_date || 'Recent'}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
            <span class="text-sm font-bold">${r.overall_rating || r.taste_score || 0}</span>
            <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
          </div>
        </div>
        <p class="text-gray-700 text-sm leading-relaxed mb-4">${r.written_review || r.comment || ''}</p>
        
        ${r.sub_ratings ? `
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-4 border-t border-gray-50">
           <div class="text-center"><p class="text-[10px] text-gray-400">Taste</p><p class="text-xs font-bold">${r.sub_ratings.taste}</p></div>
           <div class="text-center"><p class="text-[10px] text-gray-400">Spice</p><p class="text-xs font-bold">${r.sub_ratings.spice_level}</p></div>
           <div class="text-center"><p class="text-[10px] text-gray-400">Service</p><p class="text-xs font-bold">${r.sub_ratings.service}</p></div>
           <div class="text-center"><p class="text-[10px] text-gray-400">Clean</p><p class="text-xs font-bold">${r.sub_ratings.cleanliness}</p></div>
           <div class="text-center"><p class="text-[10px] text-gray-400">Ambience</p><p class="text-xs font-bold">${r.sub_ratings.ambience}</p></div>
           <div class="text-center"><p class="text-[10px] text-gray-400">Value</p><p class="text-xs font-bold">${r.sub_ratings.value_for_money}</p></div>
        </div>
        ` : ''}
      </div>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    console.error(e);
    reviewsList.innerHTML = `<p class="text-red-500 text-sm">Could not load reviews.</p>`;
  }
}

// Check for verified visit
const isVerified = sessionStorage.getItem(`verified_visit_${restaurant?.slug || paramSlug}`) === 'true';

// Handle review submission
document.getElementById('review-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!AuthState.user || !restaurant) return;
  
  const rating = parseFloat(document.getElementById('rating-input').value);
  const comment = document.getElementById('comment-input').value;
  
  if (comment.trim().length < 20) {
    alert("Review must be at least 20 characters long.");
    return;
  }

  showGlobalLoading(true);
  try {
    const subRatings = {
      taste: parseInt(document.getElementById('sr-taste').value),
      spice_level: parseInt(document.getElementById('sr-spice').value),
      service: parseInt(document.getElementById('sr-service').value),
      cleanliness: parseInt(document.getElementById('sr-clean').value),
      ambience: parseInt(document.getElementById('sr-ambience').value),
      value_for_money: parseInt(document.getElementById('sr-value').value),
    };

    // Fake simple spam heuristic
    const isFake = comment.includes('http') || comment.length < 25;

    await addDoc(collection(db, 'reviews'), {
      restaurant_id: restaurant.id,
      user_id: AuthState.user.uid,
      user_name: AuthState.profile?.display_name || 'User',
      overall_rating: rating,
      taste_score: rating, // Legacy support
      written_review: comment,
      comment: comment, // Legacy support
      sub_ratings: subRatings,
      favourite_dish: document.getElementById('fav-dish').value || null,
      amount_spent: parseInt(document.getElementById('amount-spent').value) || null,
      would_recommend: document.getElementById('would-recommend').checked,
      would_visit_again: document.getElementById('would-visit').checked,
      verified_visit: isVerified,
      is_fake: isFake,
      fake_score: isFake ? 0.9 : 0.1,
      status: 'published',
      created_at: serverTimestamp()
    });
    
    showToast('Review submitted successfully!');
    document.getElementById('review-form').reset();
    document.getElementById('review-modal').classList.add('hidden');
    
    // Clear the token
    sessionStorage.removeItem(`verified_visit_${restaurant.slug}`);
    
    await fetchReviews();
  } catch(err) {
    console.error(err);
    alert('Failed to submit review');
  } finally {
    showGlobalLoading(false);
  }
});
