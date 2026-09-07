import { initAuth, AuthState, subscribeToAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

initAuth();
initNavbar();

document.addEventListener('DOMContentLoaded', () => {
  subscribeToAuth(async (user, profile) => {
    if (AuthState.loading) return;
    if (!user) {
      window.location.href = '/login.html';
      return;
    }
    if (profile?.role !== 'admin') {
      window.location.href = '/dashboard.html';
      return;
    }
    
    await loadData();
    if (window.lucide) window.lucide.createIcons();
  });
});

async function loadData() {
  try {
    const rSnap = await getDocs(collection(db, 'restaurants'));
    const uSnap = await getDocs(collection(db, 'profiles'));
    const revSnap = await getDocs(collection(db, 'reviews'));
    
    document.getElementById('stat-rest-count').textContent = rSnap.size;
    document.getElementById('stat-user-count').textContent = uSnap.size;
    document.getElementById('stat-review-count').textContent = revSnap.size;
    
    const pendingList = document.getElementById('pending-list');
    
    const pendingQ = query(collection(db, 'restaurants'), where('status', '==', 'pending'));
    const pSnap = await getDocs(pendingQ);
    
    if (pSnap.empty) {
      pendingList.innerHTML = `<p class="text-gray-500">No pending restaurants.</p>`;
    } else {
      pendingList.innerHTML = pSnap.docs.map(d => {
        const r = d.data();
        return `
          <div class="bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center" id="pending-${d.id}">
            <div>
              <p class="font-bold text-gray-900">${r.name}</p>
              <p class="text-sm text-gray-500">${r.area} | ${r.phone}</p>
            </div>
            <button class="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg text-sm approve-btn" data-id="${d.id}">Approve</button>
          </div>
        `;
      }).join('');
      
      document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await approveRestaurant(id);
        });
      });
    }
    
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
    
  } catch (err) {
    console.error(err);
    document.getElementById('loading-state').innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
  }
}

window.approveRestaurant = async function(id) {
  try {
    await updateDoc(doc(db, 'restaurants', id), { status: 'published' });
    document.getElementById(`pending-${id}`).remove();
    alert('Restaurant approved!');
  } catch (e) {
    alert('Failed to approve');
  }
};
