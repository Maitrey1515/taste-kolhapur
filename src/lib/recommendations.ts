// ─── Recommendation Engine ────────────────────────────────────────────────
import type { Restaurant, TasteProfile, RecommendationList } from '@/types';
import { isRestaurantOpenNow } from './chatbot';

// ─── Haversine distance (km) ──────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Attach distances to restaurants ─────────────────────────────────────
export function attachDistances(
  restaurants: Restaurant[],
  userLat: number,
  userLng: number,
): Restaurant[] {
  return restaurants.map(r => ({
    ...r,
    distance_km:
      r.lat && r.lng
        ? Math.round(haversineDistance(userLat, userLng, r.lat, r.lng) * 10) / 10
        : undefined,
  }));
}

// ─── Build taste profile vector from user's reviews ───────────────────────
export function buildTasteVector(profile: TasteProfile): number[] {
  return [
    profile.avg_taste        / 5,
    profile.avg_spice        / 5,
    profile.avg_value        / 5,
    profile.avg_service      / 5,
    profile.avg_cleanliness  / 5,
    profile.avg_ambience     / 5,
    profile.avg_portion      / 5,
    profile.pref_price_level / 4,
  ];
}

// ─── Build restaurant feature vector ─────────────────────────────────────
function buildRestaurantVector(r: Restaurant): number[] {
  return [
    (r.taste_score ?? 3.5) / 5,
    0.5,                               // spice — default mid (no per-restaurant spice avg in base table)
    0.6,                               // value — default
    0.6,                               // service
    0.6,                               // cleanliness
    0.5,                               // ambience
    0.6,                               // portion
    (r.price_level ?? 2) / 4,
  ];
}

// ─── Cosine similarity ────────────────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ─── All recommendation lists ─────────────────────────────────────────────
export function buildRecommendationLists(
  restaurants: Restaurant[],
  tasteProfile: TasteProfile | null,
  userLat?: number,
  userLng?: number,
): RecommendationList[] {
  const lists: RecommendationList[] = [];

  // 1. For You (cosine similarity)
  if (tasteProfile) {
    const userVec = buildTasteVector(tasteProfile);
    const forYou = [...restaurants]
      .map(r => ({ ...r, _sim: cosineSimilarity(userVec, buildRestaurantVector(r)) }))
      .sort((a, b) => b._sim - a._sim)
      .slice(0, 10);
    lists.push({
      category: 'for_you',
      title: 'For You',
      subtitle: 'Matched to your taste profile',
      icon: '✨',
      restaurants: forYou,
    });
  }

  // 2. Hidden Gems (low review count, high score)
  const hiddenGems = restaurants
    .filter(r => (r.review_count < 20) && (r.taste_score ?? 0) >= 3.8)
    .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
    .slice(0, 8);
  if (hiddenGems.length > 0) {
    lists.push({
      category: 'hidden_gems',
      title: 'Hidden Gems',
      subtitle: 'Lesser-known spots worth discovering',
      icon: '💎',
      restaurants: hiddenGems,
    });
  }

  // 3. Best Budget
  const bestBudget = restaurants
    .filter(r => r.price_level !== null && r.price_level <= 2 && (r.taste_score ?? 0) >= 3.5)
    .sort((a, b) => (a.avg_cost ?? 999) - (b.avg_cost ?? 999))
    .slice(0, 8);
  if (bestBudget.length > 0) {
    lists.push({
      category: 'best_budget',
      title: 'Best Budget',
      subtitle: 'Great taste, easy on the wallet',
      icon: '💰',
      restaurants: bestBudget,
    });
  }

  // 4. Best Premium
  const bestPremium = restaurants
    .filter(r => r.price_level !== null && r.price_level >= 3 && (r.taste_score ?? 0) >= 4.0)
    .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
    .slice(0, 8);
  if (bestPremium.length > 0) {
    lists.push({
      category: 'best_premium',
      title: 'Premium Experience',
      subtitle: 'Top-tier restaurants worth the splurge',
      icon: '👑',
      restaurants: bestPremium,
    });
  }

  // 5. Best Family
  const bestFamily = restaurants
    .filter(r => r.features?.family_friendly)
    .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
    .slice(0, 8);
  if (bestFamily.length > 0) {
    lists.push({
      category: 'best_family',
      title: 'Family Favorites',
      subtitle: 'Perfect for dining with family',
      icon: '👨‍👩‍👧',
      restaurants: bestFamily,
    });
  }

  // 6. Open Now
  const openNow = restaurants
    .filter(r => isRestaurantOpenNow(r))
    .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
    .slice(0, 8);
  if (openNow.length > 0) {
    lists.push({
      category: 'open_now',
      title: 'Open Now',
      subtitle: 'Currently serving delicious Misal',
      icon: '🟢',
      restaurants: openNow,
    });
  }

  // 7. Nearby (requires location)
  if (userLat !== undefined && userLng !== undefined) {
    const nearby = restaurants
      .filter(r => r.lat && r.lng)
      .map(r => ({
        ...r,
        distance_km: haversineDistance(userLat, userLng, r.lat!, r.lng!),
      }))
      .filter(r => r.distance_km <= 10)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 8);
    if (nearby.length > 0) {
      lists.push({
        category: 'nearby',
        title: 'Near You',
        subtitle: 'Restaurants within 10 km',
        icon: '📍',
        restaurants: nearby,
      });
    }
  }

  // 8. Top Rated overall
  const topRated = [...restaurants]
    .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
    .slice(0, 8);
  lists.push({
    category: 'popular_areas',
    title: 'Top Rated',
    subtitle: 'Highest rated by our community',
    icon: '⭐',
    restaurants: topRated,
  });

  return lists;
}

// ─── Auto-build taste profile from reviews ────────────────────────────────
import type { Review } from '@/types';

export function buildTasteProfileFromReviews(reviews: Review[]): TasteProfile {
  if (reviews.length === 0) {
    return {
      avg_taste: 0, avg_spice: 0, avg_value: 0,
      avg_service: 0, avg_cleanliness: 0, avg_ambience: 0,
      avg_portion: 0, pref_price_level: 2,
      favourite_areas: [], favourite_dishes: [], total_reviews: 0,
    };
  }

  const avg = (key: keyof Review['sub_ratings']) =>
    Math.round((reviews.reduce((s, r) => s + r.sub_ratings[key], 0) / reviews.length) * 10) / 10;

  // Count areas from restaurants
  const areaCounts: Record<string, number> = {};
  reviews.forEach(r => {
    const area = r.restaurant?.area;
    if (area) areaCounts[area] = (areaCounts[area] ?? 0) + 1;
  });
  const favourite_areas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area]) => area);

  // Count dishes
  const dishCounts: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.favourite_dish) dishCounts[r.favourite_dish] = (dishCounts[r.favourite_dish] ?? 0) + 1;
  });
  const favourite_dishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dish]) => dish);

  // Preferred price level
  const priceLevelCounts: Record<number, number> = {};
  reviews.forEach(r => {
    const pl = r.restaurant?.price_level;
    if (pl) priceLevelCounts[pl] = (priceLevelCounts[pl] ?? 0) + 1;
  });
  const pref_price_level = parseInt(
    Object.entries(priceLevelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '2'
  );

  return {
    avg_taste:       avg('taste'),
    avg_spice:       avg('spice'),
    avg_value:       avg('value_for_money'),
    avg_service:     avg('service'),
    avg_cleanliness: avg('cleanliness'),
    avg_ambience:    avg('ambience'),
    avg_portion:     avg('portion_size'),
    pref_price_level,
    favourite_areas,
    favourite_dishes,
    total_reviews: reviews.length,
  };
}
