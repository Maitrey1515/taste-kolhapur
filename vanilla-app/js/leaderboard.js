import { initAuth } from './auth.js';
import { initNavbar } from './navbar.js';
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getMPSTier, formatMPS } from './mps.js';

initAuth();
initNavbar();

document.addEventListener('DOMContentLoaded', async () => {
  await fetchLeaderboard();
  if (window.lucide) window.lucide.createIcons();
});

function renderMiniBar(label, value, max, colorClass, tooltip) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return `
    <div class="group/bar relative flex flex-col items-center gap-1 w-6">
      <div class="h-8 w-2 bg-gray-100 rounded-full overflow-hidden flex items-end">
        <div class="w-full rounded-full transition-all duration-1000 ${colorClass}" style="height: ${percent}%"></div>
      </div>
      <span class="text-[9px] font-semibold text-gray-400">${label}</span>
      <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
        ${tooltip}: ${(value * 100).toFixed(1)} pts
      </div>
    </div>
  `;
}

async function fetchLeaderboard() {
  try {
    const snap = await getDocs(collection(db, 'restaurants'));
    const scores = snap.docs.map(doc => {
      const r = doc.data();
      return {
        restaurant_id: doc.id,
        restaurant_name: r.name,
        area: r.area,
        mps: r.mps_score || 0,
        r_score: r.r_score || (r.mps_score ? r.mps_score * 0.3 / 10 : 0.25),
        cs_score: r.cs_score || (r.mps_score ? r.mps_score * 0.3 / 10 : 0.25),
        v_score: r.v_score || (r.mps_score ? r.mps_score * 0.2 / 10 : 0.15),
        rec_score: r.rec_score || (r.mps_score ? r.mps_score * 0.1 / 10 : 0.08),
        rp_score: r.rp_score || (r.mps_score ? r.mps_score * 0.1 / 10 : 0.07),
        review_count: r.review_count || 0,
        overall_rating: r.taste_score || r.google_rating || 4,
      };
    });

    scores.sort((a, b) => b.mps - a.mps);
    
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('leaderboard-container').classList.remove('hidden');
    
    const tbody = document.getElementById('leaderboard-body');
    
    if (scores.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-500">No data available yet.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = scores.map((score, index) => {
      const rank = index + 1;
      const tier = getMPSTier(score.mps);
      const rowClass = rank <= 3 ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-gray-50';
      
      let rankDisplay = `<span class="font-bold text-gray-400 text-lg">${rank}</span>`;
      if (rank === 1) rankDisplay = `<span class="text-2xl">🥇</span>`;
      if (rank === 2) rankDisplay = `<span class="text-2xl">🥈</span>`;
      if (rank === 3) rankDisplay = `<span class="text-2xl">🥉</span>`;

      return `
        <tr class="${rowClass} transition-colors group">
          <td class="px-6 py-4 text-center">${rankDisplay}</td>
          <td class="px-6 py-4">
            <a href="/restaurant.html?id=${score.restaurant_id}" class="block">
              <p class="font-display font-bold text-gray-900 group-hover:text-orange-500 transition-colors">${score.restaurant_name}</p>
              <p class="text-xs text-gray-500">${score.area}</p>
            </a>
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <span class="font-display font-black text-lg text-gradient">${formatMPS(score.mps)}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border border-current bg-current bg-opacity-10 ${tier.color}">${tier.label}</span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center gap-1.5 font-bold text-gray-900">
              <i data-lucide="star" class="w-3.5 h-3.5 text-amber-500 fill-amber-500"></i>
              ${score.overall_rating.toFixed(1)}
            </div>
          </td>
          <td class="px-6 py-4 text-gray-500 font-medium">${score.review_count}</td>
          <td class="px-6 py-4">
            <div class="flex gap-2">
              ${renderMiniBar('R', score.r_score, 0.3, 'bg-blue-500', 'Rating (30%)')}
              ${renderMiniBar('CS', score.cs_score, 0.3, 'bg-green-500', 'Satisfaction (30%)')}
              ${renderMiniBar('V', score.v_score, 0.2, 'bg-amber-500', 'Value (20%)')}
              ${renderMiniBar('Rec', score.rec_score, 0.1, 'bg-purple-500', 'Recommendation (10%)')}
              ${renderMiniBar('RP', score.rp_score, 0.1, 'bg-rose-500', 'Popularity (10%)')}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error(err);
    document.getElementById('loading-state').innerHTML = `<p class="text-red-500">Failed to load leaderboard.</p>`;
  }
}
