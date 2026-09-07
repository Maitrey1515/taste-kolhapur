import { initAuth, AuthState, subscribeToAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

initAuth();
initNavbar();

document.addEventListener('DOMContentLoaded', () => {
  subscribeToAuth(async (user, profile) => {
    if (AuthState.loading) return;
    if (!user) {
      window.location.href = '/login.html';
      return;
    }
    if (profile?.role !== 'owner') {
      window.location.href = '/dashboard.html'; // let it re-route
      return;
    }
    
    await loadData();
    if (window.lucide) window.lucide.createIcons();
  });
});

async function loadData() {
  try {
    const q = query(collection(db, 'restaurants'), where('owner_id', '==', AuthState.user.uid));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      document.getElementById('loading-state').innerHTML = `<p class="text-red-500">You don't own any restaurants yet. <a href="/add-restaurant.html" class="underline">Add one</a></p>`;
      return;
    }
    
    const restaurant = { id: snap.docs[0].id, ...snap.docs[0].data() };
    
    document.getElementById('rest-name').textContent = restaurant.name;
    document.getElementById('rest-area').textContent = restaurant.area;
    document.getElementById('stat-rating').textContent = (restaurant.taste_score || restaurant.google_rating || 0).toFixed(1);
    document.getElementById('stat-reviews').textContent = restaurant.review_count || 0;
    
    // Set URL
    const url = `${window.location.origin}/verify-visit.html?slug=${restaurant.slug}`;
    document.getElementById('rest-url').value = url;
    
    // Load reviews
    const rQ = query(collection(db, 'reviews'), where('restaurant_id', '==', restaurant.id), orderBy('created_at', 'desc'), limit(10));
    const rSnap = await getDocs(rQ);
    
    const reviewsList = document.getElementById('reviews-list');
    if (rSnap.empty) {
      reviewsList.innerHTML = `<div class="bg-white p-6 rounded-3xl border border-gray-100 text-center text-gray-500">No reviews yet.</div>`;
    } else {
      reviewsList.innerHTML = rSnap.docs.map(d => {
        const r = d.data();
        return `
          <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="font-bold text-sm">${r.user_name || 'Anonymous'}</p>
                <p class="text-xs text-gray-500">${r.created_at?.toDate ? r.created_at.toDate().toLocaleDateString() : 'Recent'}</p>
              </div>
              <div class="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                <span class="text-sm font-bold">${r.overall_rating || r.taste_score || 0}</span>
                <i data-lucide="star" class="w-3 h-3 fill-current"></i>
              </div>
            </div>
            <p class="text-sm text-gray-700">${r.written_review || r.comment}</p>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
    
  } catch (err) {
    console.error(err);
    document.getElementById('loading-state').innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
  }
}
