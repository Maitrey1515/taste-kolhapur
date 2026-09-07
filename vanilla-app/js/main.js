import { initAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs, where, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Initialize core services
initAuth();
initNavbar();

document.addEventListener('DOMContentLoaded', async () => {
  renderCategories();
  
  // Attach search bar listener
  const searchForm = document.getElementById('hero-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('hero-search').value.trim();
      if (val) {
        window.location.href = `/discover.html?q=${encodeURIComponent(val)}`;
      } else {
        window.location.href = `/discover.html`;
      }
    });
  }

  try {
    await fetchTopRestaurants();
  } catch(e) {
    console.error(e);
  }
  
  try {
    await fetchEvents();
  } catch(e) {
    console.error(e);
  }
  
  if (window.lucide) window.lucide.createIcons();
});

const categories = [
  { label: 'Top Rated',    icon: '⭐', filter: 'sort=rating',            color: 'from-amber-400 to-orange-500' },
  { label: 'Open Now',     icon: '🟢', filter: 'open_now=true',          color: 'from-green-400 to-emerald-500' },
  { label: 'Budget Picks', icon: '💰', filter: 'price_level=2',          color: 'from-blue-400 to-indigo-500' },
  { label: 'With Parking', icon: '🅿️', filter: 'parking=true',           color: 'from-purple-400 to-violet-500' },
  { label: 'Family Spots', icon: '👨‍👩‍👧', filter: 'family_friendly=true',  color: 'from-pink-400 to-rose-500' },
  { label: 'AC Places',    icon: '❄️', filter: 'ac=true',                color: 'from-cyan-400 to-blue-500' },
  { label: 'Delivery',     icon: '🛵', filter: 'delivery=true',           color: 'from-orange-400 to-red-500' },
  { label: 'Pure Veg',     icon: '🌿', filter: 'veg=true',               color: 'from-emerald-400 to-green-500' },
];

function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;
  
  container.innerHTML = categories.map(cat => `
    <a href="/discover.html?${cat.filter}" class="flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group min-w-[80px]">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
        ${cat.icon}
      </div>
      <span class="text-xs font-medium text-gray-500 whitespace-nowrap text-center">${cat.label}</span>
    </a>
  `).join('');
}

async function fetchTopRestaurants() {
  const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
  const allRestaurants = restaurantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Calculate stats dynamically
  const totalRests = allRestaurants.length;
  let totalReviews = 0;
  let sumRatings = 0;
  let ratedCount = 0;
  
  allRestaurants.forEach(r => {
    totalReviews += (r.review_count || 0);
    if (r.taste_score) {
      sumRatings += r.taste_score;
      ratedCount++;
    }
  });
  
  const avgRating = ratedCount > 0 ? (sumRatings / ratedCount).toFixed(1) : '0.0';
  
  const statRests = document.getElementById('stat-rests');
  const statRating = document.getElementById('stat-rating');
  const statReviews = document.getElementById('stat-reviews');
  
  if(statRests) statRests.textContent = totalRests + '+';
  if(statRating) statRating.textContent = avgRating + '★';
  if(statReviews) statReviews.textContent = totalReviews;

  const restaurants = allRestaurants
    .filter(r => r.taste_score !== undefined && r.taste_score !== null)
    .sort((a, b) => (b.taste_score || 0) - (a.taste_score || 0))
    .slice(0, 6);
    
  const grid = document.getElementById('top-restaurants-grid');
  if (!grid) return;
  
  if (restaurants.length === 0) {
    grid.innerHTML = `<div class="col-span-3 text-center py-10 text-gray-500 text-lg">No restaurants available right now.</div>`;
    return;
  }
  
  grid.innerHTML = restaurants.map((r, i) => `
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full animate-fade-in" style="animation-delay: ${i * 0.07}s">
      <div class="h-48 relative overflow-hidden group block">
        <a href="/restaurant.html?id=${r.id}">
          <img src="${r.cover_image || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${r.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </a>
      </div>
      <div class="p-5 flex-1 flex flex-col">
        <div class="flex justify-between items-start mb-2">
          <a href="/restaurant.html?id=${r.id}" class="font-bold text-lg hover:text-orange-500 transition-colors line-clamp-1">${r.name}</a>
          <div class="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
            <span class="text-sm font-bold">${(r.taste_score || 0).toFixed(1)}</span>
            <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
          </div>
        </div>
        <p class="text-gray-500 text-sm line-clamp-2 mb-4">${r.description || 'No description available.'}</p>
        <div class="mt-auto space-y-2 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <i data-lucide="map-pin" class="w-4 h-4 text-gray-400"></i> ${r.area || 'Unknown Area'}
          </div>
          ${r.price_level ? `
          <div class="flex items-center gap-2">
            <i data-lucide="indian-rupee" class="w-4 h-4 text-gray-400"></i> ${'₹'.repeat(r.price_level)}
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
  
  if (window.lucide) window.lucide.createIcons();
}

async function fetchEvents() {
  const eventsSnap = await getDocs(query(
    collection(db, 'restaurant_events'), 
    where('start_date', '>=', new Date().toISOString().split('T')[0]), 
    orderBy('start_date', 'asc'), 
    limit(4)
  ));
  
  const evsData = await Promise.all(eventsSnap.docs.map(async (d) => {
    const ev = { id: d.id, ...d.data() };
    if (ev.restaurant_id) {
      const rDoc = await getDoc(doc(db, 'restaurants', ev.restaurant_id));
      if (rDoc.exists()) ev.restaurant = { name: rDoc.data().name, area: rDoc.data().area };
    }
    return ev;
  }));
  
  if (evsData.length > 0) {
    document.getElementById('events-section')?.classList.remove('hidden');
    const grid = document.getElementById('events-grid');
    if(grid) {
      grid.innerHTML = evsData.map(ev => `
        <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
          ${ev.image ? `<img src="${ev.image}" class="w-full h-36 object-cover" />` : ''}
          <div class="p-4">
            <h3 class="font-bold text-sm mb-2">${ev.title}</h3>
            <div class="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(ev.start_date).toLocaleDateString()}
            </div>
            ${ev.restaurant ? `
            <div class="flex items-center gap-1.5 text-xs text-gray-500">
              <i data-lucide="map-pin" class="w-3 h-3"></i> ${ev.restaurant.name}
            </div>` : ''}
          </div>
        </div>
      `).join('');
      if (window.lucide) window.lucide.createIcons();
    }
  }
}
