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

    document.getElementById('loading-state').classList.add('hidden');
    
    const role = profile?.role || 'customer';
    
    if (role === 'admin') {
      document.getElementById('admin-dashboard').classList.remove('hidden');
      await loadAdminData();
    } else if (role === 'owner') {
      document.getElementById('owner-dashboard').classList.remove('hidden');
      await loadOwnerData(user.uid);
    } else {
      document.getElementById('customer-dashboard').classList.remove('hidden');
      await loadCustomerData(user.uid);
    }
    
    if (window.lucide) window.lucide.createIcons();
  });
});

async function loadCustomerData(userId) {
  try {
    const q = query(collection(db, 'reviews'), where('user_id', '==', userId), orderBy('created_at', 'desc'), limit(10));
    const snap = await getDocs(q);
    
    document.getElementById('cust-reviews-count').textContent = snap.size;
    
    const list = document.getElementById('cust-reviews-list');
    if (snap.empty) {
      list.innerHTML = `<p class="text-gray-500">You haven't written any reviews yet.</p>`;
      return;
    }
    
    list.innerHTML = snap.docs.map(d => {
      const r = d.data();
      return `
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-start mb-2">
          <p class="font-bold">Review for Restaurant ID: <a href="/restaurant.html?id=${r.restaurant_id}" class="text-orange-500 hover:underline">${r.restaurant_id}</a></p>
          <div class="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
            <span class="text-sm font-bold">${r.taste_score}</span>
            <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
          </div>
        </div>
        <p class="text-gray-600 text-sm">${r.comment}</p>
      </div>`;
    }).join('');
  } catch(e) {
    console.error(e);
  }
}

async function loadOwnerData(userId) {
  try {
    const q = query(collection(db, 'restaurants'), where('owner_id', '==', userId));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const rest = snap.docs[0].data();
      document.getElementById('owner-rating').textContent = (rest.taste_score || 0).toFixed(1);
      document.getElementById('owner-reviews').textContent = rest.review_count || 0;
      
      const rQ = query(collection(db, 'reviews'), where('restaurant_id', '==', snap.docs[0].id), limit(5));
      const rSnap = await getDocs(rQ);
      
      const list = document.getElementById('owner-reviews-list');
      if (rSnap.empty) {
        list.innerHTML = `<p class="text-gray-500">No reviews yet.</p>`;
      } else {
        list.innerHTML = rSnap.docs.map(d => {
          const r = d.data();
          return `<div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-2">
            <p class="font-bold text-sm">${r.user_name || 'Anonymous'}</p>
            <p class="text-gray-600 text-sm">${r.comment}</p>
          </div>`;
        }).join('');
      }
    }
  } catch(e) {
    console.error(e);
  }
}

async function loadAdminData() {
  try {
    const rSnap = await getDocs(collection(db, 'restaurants'));
    document.getElementById('admin-rest-count').textContent = rSnap.size;
    
    const uSnap = await getDocs(collection(db, 'profiles'));
    document.getElementById('admin-user-count').textContent = uSnap.size;
  } catch(e) {
    console.error(e);
  }
}
