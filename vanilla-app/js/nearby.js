import { initAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { attachDistances } from './recommendations.js';

initAuth();
initNavbar();

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
});

const promptDiv = document.getElementById('location-prompt');
const loadingDiv = document.getElementById('loading-state');
const loadingText = document.getElementById('loading-text');
const resultsGrid = document.getElementById('results-grid');

document.getElementById('btn-request-location').addEventListener('click', requestLocation);

function requestLocation() {
  promptDiv.classList.add('hidden');
  loadingDiv.classList.remove('hidden');
  
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await fetchNearbyRestaurants(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      console.error(err);
      showError("We couldn't access your location. Please enable location permissions in your browser settings and try again.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function showError(msg) {
  loadingDiv.classList.add('hidden');
  promptDiv.classList.remove('hidden');
  document.getElementById('location-msg').textContent = msg;
  document.getElementById('btn-request-location').textContent = 'Try Again';
}

async function fetchNearbyRestaurants(lat, lng) {
  loadingText.textContent = "Finding restaurants near you...";
  
  try {
    const snap = await getDocs(collection(db, 'restaurants'));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Add mock coords to restaurants for testing if they don't have them
    data.forEach(r => {
      if (!r.lat) r.lat = 16.69 + (Math.random() * 0.1);
      if (!r.lng) r.lng = 74.24 + (Math.random() * 0.1);
    });

    const withDistances = attachDistances(data, lat, lng)
      .filter(r => r.distance_km !== undefined)
      .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
      
    loadingDiv.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
    
    if (withDistances.length === 0) {
      resultsGrid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500">No restaurants found near your location.</div>`;
      return;
    }
    
    resultsGrid.innerHTML = withDistances.map(r => `
      <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col relative group">
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-1 z-10 shadow-sm border border-gray-100">
          <i data-lucide="navigation" class="w-3 h-3 text-orange-500"></i> ${r.distance_km} km
        </div>
        ${r.cover_image ? `<img src="${r.cover_image}" class="w-full h-48 object-cover" />` : `<div class="w-full h-48 bg-gray-200"></div>`}
        <div class="p-4 flex-1 flex flex-col">
          <h3 class="font-bold text-lg mb-1 group-hover:text-orange-500 transition-colors"><a href="/restaurant.html?id=${r.id}">${r.name}</a></h3>
          <p class="text-xs text-gray-500 mb-3 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${r.area}</p>
          
          <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <div class="flex items-center gap-1 text-sm font-bold">
              <i data-lucide="star" class="w-4 h-4 text-amber-500 fill-amber-500"></i>
              ${(r.taste_score || r.google_rating || 0).toFixed(1)}
            </div>
            <span class="text-xs text-gray-400">(${r.review_count || 0} reviews)</span>
          </div>
        </div>
      </div>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error(err);
    loadingDiv.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
    resultsGrid.innerHTML = `<p class="col-span-full text-red-500 text-center py-10">Failed to load nearby restaurants.</p>`;
  }
}
