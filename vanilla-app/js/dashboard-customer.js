import { initAuth, AuthState, subscribeToAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { showToast, showGlobalLoading } from './utils.js';
import { buildTasteProfileFromReviews, buildRecommendationLists } from './recommendations.js';

initAuth();
initNavbar();

let isEditing = false;
let userReviews = [];

document.addEventListener('DOMContentLoaded', () => {
  subscribeToAuth(async (user, profile) => {
    if (AuthState.loading) return;
    if (!user) {
      window.location.href = '/login.html';
      return;
    }
    
    if (profile?.role === 'owner') window.location.href = '/dashboard-owner.html';
    if (profile?.role === 'admin') window.location.href = '/dashboard-admin.html';
    
    // Init profile UI
    document.getElementById('profile-name').textContent = profile?.display_name || 'My Profile';
    document.getElementById('profile-city').textContent = profile?.city || 'City not set';
    document.getElementById('profile-bio').textContent = profile?.bio || 'No bio yet.';
    if (profile?.avatar) document.getElementById('profile-avatar').src = profile.avatar;
    
    document.getElementById('edit-name').value = profile?.display_name || '';
    document.getElementById('edit-city').value = profile?.city || '';
    document.getElementById('edit-bio').value = profile?.bio || '';
    document.getElementById('edit-avatar').value = profile?.avatar || '';

    await loadData();
    if (window.lucide) window.lucide.createIcons();
  });

  document.getElementById('btn-edit-profile').addEventListener('click', async () => {
    if (isEditing) {
      await saveProfile();
    } else {
      isEditing = true;
      document.getElementById('view-profile').classList.add('hidden');
      document.getElementById('edit-profile-form').classList.remove('hidden');
      document.getElementById('edit-btn-text').textContent = 'Save';
    }
  });
});

async function saveProfile() {
  const btn = document.getElementById('btn-edit-profile');
  btn.disabled = true;
  try {
    const data = {
      display_name: document.getElementById('edit-name').value,
      city: document.getElementById('edit-city').value,
      bio: document.getElementById('edit-bio').value,
      avatar: document.getElementById('edit-avatar').value,
    };
    
    await updateDoc(doc(db, 'profiles', AuthState.user.uid), data);
    showToast('Profile updated');
    
    document.getElementById('profile-name').textContent = data.display_name || 'My Profile';
    document.getElementById('profile-city').textContent = data.city || 'City not set';
    document.getElementById('profile-bio').textContent = data.bio || 'No bio yet.';
    if (data.avatar) document.getElementById('profile-avatar').src = data.avatar;
    
    isEditing = false;
    document.getElementById('view-profile').classList.remove('hidden');
    document.getElementById('edit-profile-form').classList.add('hidden');
    document.getElementById('edit-btn-text').textContent = 'Edit';
  } catch(e) {
    console.error(e);
    alert('Failed to update profile');
  } finally {
    btn.disabled = false;
  }
}

async function loadData() {
  try {
    const q = query(collection(db, 'reviews'), where('user_id', '==', AuthState.user.uid));
    const snap = await getDocs(q);
    
    userReviews = await Promise.all(snap.docs.map(async (d) => {
      const review = { id: d.id, ...d.data() };
      if (review.restaurant_id) {
        const rDoc = await getDoc(doc(db, 'restaurants', review.restaurant_id));
        if (rDoc.exists()) review.restaurant = { id: rDoc.id, ...rDoc.data() };
      }
      return review;
    }));
    
    userReviews.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    
    document.getElementById('review-count-badge').textContent = `${userReviews.length} Reviews`;
    document.getElementById('reviews-header').textContent = `My Reviews (${userReviews.length})`;
    
    renderReviews();

    // Recommendations
    const tasteProfile = buildTasteProfileFromReviews(userReviews);
    await updateDoc(doc(db, 'profiles', AuthState.user.uid), { taste_profile: tasteProfile });

    const restsSnap = await getDocs(collection(db, 'restaurants'));
    const allRests = restsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (allRests.length) {
      const lists = buildRecommendationLists(allRests, tasteProfile);
      renderRecommendations(lists);
    }
    
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
    
  } catch (err) {
    console.error(err);
    document.getElementById('loading-state').innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
  }
}

function renderReviews() {
  const container = document.getElementById('my-reviews-list');
  if (userReviews.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center bg-white rounded-3xl border border-gray-100 text-gray-500">You haven't written any reviews yet.</div>`;
    return;
  }
  
  container.innerHTML = userReviews.map(r => `
    <div class="bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <div class="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <div class="font-bold text-sm"><a href="/restaurant.html?id=${r.restaurant_id}" class="hover:text-orange-500">${r.restaurant?.name || 'Unknown Restaurant'}</a></div>
        <div class="text-xs text-gray-500">${r.created_at?.toDate ? r.created_at.toDate().toLocaleDateString() : 'Recent'}</div>
      </div>
      <div class="p-4">
        <div class="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg w-max mb-2">
          <span class="text-sm font-bold">${r.overall_rating || r.taste_score || 0}</span>
          <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
        </div>
        <p class="text-sm text-gray-600 line-clamp-3">${r.written_review || r.comment}</p>
      </div>
    </div>
  `).join('');
}

function renderRecommendations(lists) {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = lists.map(list => `
    <div>
      <h3 class="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
        ${list.icon} ${list.title}
      </h3>
      <p class="text-xs text-gray-500 mb-3">${list.subtitle}</p>
      
      <div class="flex gap-4 overflow-x-auto pb-4 snap-x">
        ${list.restaurants.map(r => `
          <div class="w-64 flex-shrink-0 snap-start bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            ${r.cover_image ? `<img src="${r.cover_image}" class="w-full h-32 object-cover">` : `<div class="w-full h-32 bg-gray-200"></div>`}
            <div class="p-3">
              <h4 class="font-bold text-sm truncate"><a href="/restaurant.html?id=${r.id}" class="hover:text-orange-500">${r.name}</a></h4>
              <p class="text-xs text-gray-500 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${r.area}</p>
              <div class="flex items-center mt-2 text-sm font-bold text-gray-900">
                <i data-lucide="star" class="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1"></i> ${(r.taste_score || r.google_rating || 0).toFixed(1)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
