import { initAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { parseNLQuery, describeQuery } from './nlp.js';

initAuth();
initNavbar();

let allRestaurants = [];
let filteredRestaurants = [];
let filters = {
  search: '', area: '', price_level: null, min_rating: null,
  open_now: false, parking: false, family_friendly: false, ac: false,
  takeaway: false, delivery: false, wheelchair: false, veg: false,
  sort: 'relevance'
};

const PAGE_SIZE = 12;
let currentPage = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Parse initial URL params
  const params = new URLSearchParams(window.location.search);
  filters.search = params.get('q') || '';
  filters.area = params.get('area') || '';
  if (params.has('price_level')) filters.price_level = Number(params.get('price_level'));
  if (params.has('min_rating')) filters.min_rating = Number(params.get('min_rating'));
  filters.open_now = params.get('open_now') === 'true';
  filters.parking = params.get('parking') === 'true';
  filters.veg = params.get('veg') === 'true';
  filters.ac = params.get('ac') === 'true';
  filters.family_friendly = params.get('family_friendly') === 'true';
  filters.sort = params.get('sort') || 'relevance';

  document.getElementById('search-input').value = filters.search;
  syncFormToFilters();

  await fetchAllRestaurants();
  applyFiltersAndRender();
  
  if (window.lucide) window.lucide.createIcons();
});

async function fetchAllRestaurants() {
  document.getElementById('results-count').textContent = 'Loading...';
  try {
    const snap = await getDocs(collection(db, 'restaurants'));
    allRestaurants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    console.error(e);
    document.getElementById('results-count').textContent = 'Error loading restaurants.';
  }
}

function applyFiltersAndRender() {
  let data = [...allRestaurants];
  
  if (filters.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(r => 
      r.name?.toLowerCase().includes(q) || 
      r.area?.toLowerCase().includes(q) || 
      r.address?.toLowerCase().includes(q)
    );
  }
  
  if (filters.area) data = data.filter(r => r.area?.toLowerCase().includes(filters.area.toLowerCase()));
  if (filters.price_level) data = data.filter(r => r.price_level === filters.price_level);
  if (filters.min_rating) data = data.filter(r => (r.taste_score || 0) >= filters.min_rating);
  
  if (filters.parking) data = data.filter(r => r.features?.parking);
  if (filters.family_friendly) data = data.filter(r => r.features?.family_friendly);
  if (filters.ac) data = data.filter(r => r.features?.ac);
  if (filters.veg) data = data.filter(r => r.features?.veg);
  if (filters.open_now) data = data.filter(r => true /* mocking open_now logic for simplicity */);

  switch (filters.sort) {
    case 'rating':     data.sort((a,b) => (b.taste_score || 0) - (a.taste_score || 0)); break;
    case 'price_asc':  data.sort((a,b) => (a.avg_cost || 0) - (b.avg_cost || 0)); break;
    case 'price_desc': data.sort((a,b) => (b.avg_cost || 0) - (a.avg_cost || 0)); break;
    case 'reviews':    data.sort((a,b) => (b.review_count || 0) - (a.review_count || 0)); break;
    default:           data.sort((a,b) => (b.taste_score || 0) - (a.taste_score || 0)); break;
  }

  filteredRestaurants = data;
  document.getElementById('results-count').textContent = `${data.length} restaurant${data.length !== 1 ? 's' : ''} found`;
  
  currentPage = 0;
  renderGrid(true);
}

function renderGrid(replace = false) {
  const grid = document.getElementById('results-grid');
  const paged = filteredRestaurants.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  
  const html = paged.map((r, i) => `
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full animate-slide-up" style="animation-delay: ${Math.min(i, 8) * 0.05}s">
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

  if (replace) grid.innerHTML = html;
  else grid.innerHTML += html;

  if (window.lucide) window.lucide.createIcons();

  const loadMoreBtn = document.getElementById('load-more-container');
  if (filteredRestaurants.length > (currentPage + 1) * PAGE_SIZE) {
    loadMoreBtn.classList.remove('hidden');
  } else {
    loadMoreBtn.classList.add('hidden');
  }
}

document.getElementById('load-more-btn')?.addEventListener('click', () => {
  currentPage++;
  renderGrid(false);
});

// Sync form UI to internal filters state
function syncFormToFilters() {
  const form = document.getElementById('filter-form');
  form.sort.value = filters.sort;
  form.area.value = filters.area;
  form.open_now.checked = filters.open_now;
  form.veg.checked = filters.veg;
  form.family_friendly.checked = filters.family_friendly;
  form.parking.checked = filters.parking;
  form.ac.checked = filters.ac;
}

// Search form submit
document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const rawInput = document.getElementById('search-input').value;
  if (!rawInput.trim()) {
    filters.search = '';
    document.getElementById('nlp-hint-container').classList.add('hidden');
  } else {
    const { filters: nlpFilters, cleanedSearch } = parseNLQuery(rawInput);
    Object.assign(filters, nlpFilters);
    filters.search = cleanedSearch;
    
    const hint = describeQuery(nlpFilters);
    if (hint) {
      document.getElementById('nlp-hint-container').classList.remove('hidden');
      document.getElementById('nlp-hint-text').textContent = hint;
    }
  }
  
  syncFormToFilters();
  applyFiltersAndRender();
});

document.getElementById('clear-search-btn')?.addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  filters.search = '';
  document.getElementById('nlp-hint-container').classList.add('hidden');
  applyFiltersAndRender();
});

document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
  filters = {
    search: '', area: '', price_level: null, min_rating: null,
    open_now: false, parking: false, family_friendly: false, ac: false,
    takeaway: false, delivery: false, wheelchair: false, veg: false,
    sort: 'relevance'
  };
  syncFormToFilters();
  document.getElementById('search-input').value = '';
  document.getElementById('nlp-hint-container').classList.add('hidden');
  applyFiltersAndRender();
});

// Sidebar filter changes
document.getElementById('filter-form').addEventListener('change', (e) => {
  const form = e.currentTarget;
  filters.sort = form.sort.value;
  filters.area = form.area.value;
  filters.open_now = form.open_now.checked;
  filters.veg = form.veg.checked;
  filters.family_friendly = form.family_friendly.checked;
  filters.parking = form.parking.checked;
  filters.ac = form.ac.checked;
  
  applyFiltersAndRender();
});
