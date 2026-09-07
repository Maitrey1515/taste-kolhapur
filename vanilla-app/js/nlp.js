// ─── Natural Language Query Parser ───────────────────────────────────────

const CHEAP_WORDS = ['cheap', 'affordable', 'budget', 'inexpensive', 'low price', 'pocket friendly', 'swasta'];
const SPICY_WORDS = ['spicy', 'extra spicy', 'hot', 'teekha', 'tikhat', 'mirchi'];
const OPEN_WORDS  = ['open now', 'currently open', 'open today', 'abhi khula', 'open'];
const NEAR_WORDS  = ['near me', 'nearby', 'close by', 'close to me', 'around me', 'mazhi bajula'];
const FAMILY_WORDS = ['family', 'kids', 'children', 'family friendly', 'kutumb'];
const PARKING_WORDS = ['parking', 'park', 'vehicle parking'];
const DELIVERY_WORDS = ['delivery', 'home delivery', 'order online', 'ghar pohoch'];
const VEG_WORDS   = ['veg', 'vegetarian', 'pure veg', 'no non-veg'];
const AC_WORDS    = ['ac', 'air conditioned', 'cool', 'air condition'];
const TAKEAWAY_WORDS = ['takeaway', 'take away', 'parcel', 'packing'];
const FAST_WORDS  = ['fast', 'quick', 'no wait', 'fast service'];
const AREA_MAP = {
  'mahadwar road': 'Mahadwar Road', 'mahadwar': 'Mahadwar Road',
  'tarabai': 'Tarabai Park', 'tarabai park': 'Tarabai Park',
  'rankala': 'Rankala', 'rajarampuri': 'Rajarampuri',
  'kasba bawada': 'Kasba Bawada', 'bawada': 'Kasba Bawada',
  'shahu': 'Shahu Nagar', 'shahu nagar': 'Shahu Nagar',
  'laxmipuri': 'Laxmipuri', 'jaysingpur': 'Jaysingpur',
  'karvir': 'Karvir', 'new shahupuri': 'New Shahupuri',
};
const PRICE_WORDS = {
  1: ['very cheap', 'cheapest', 'under 50', '₹50'],
  2: ['cheap', 'budget', 'under 100', 'affordable'],
  3: ['moderate', 'mid range', 'mid-range', 'normal price'],
  4: ['premium', 'expensive', 'high end', 'luxury'],
};

export function parseNLQuery(query) {
  const q = query.toLowerCase().trim();
  const filters = {};
  let cleanedSearch = query;
  let isNearMe = false;

  const removeWord = (word) => {
    cleanedSearch = cleanedSearch.replace(new RegExp(word, 'gi'), '').trim();
  };

  for (const [level, words] of Object.entries(PRICE_WORDS)) {
    for (const w of words) {
      if (q.includes(w)) {
        filters.price_level = Number(level);
        removeWord(w);
        break;
      }
    }
    if (filters.price_level) break;
  }

  if (!filters.price_level && CHEAP_WORDS.some(w => q.includes(w))) {
    filters.price_level = 2;
    CHEAP_WORDS.forEach(w => removeWord(w));
  }

  if (OPEN_WORDS.some(w => q.includes(w))) { filters.open_now = true; OPEN_WORDS.forEach(removeWord); }
  if (NEAR_WORDS.some(w => q.includes(w))) { filters.max_distance = 5; isNearMe = true; NEAR_WORDS.forEach(removeWord); }
  if (FAMILY_WORDS.some(w => q.includes(w))) { filters.family_friendly = true; FAMILY_WORDS.forEach(removeWord); }
  if (PARKING_WORDS.some(w => q.includes(w))) { filters.parking = true; PARKING_WORDS.forEach(removeWord); }
  if (DELIVERY_WORDS.some(w => q.includes(w))) { filters.delivery = true; DELIVERY_WORDS.forEach(removeWord); }
  if (VEG_WORDS.some(w => q.includes(w))) { filters.veg = true; VEG_WORDS.forEach(removeWord); }
  if (AC_WORDS.some(w => q.includes(w))) { filters.ac = true; AC_WORDS.forEach(removeWord); }
  if (TAKEAWAY_WORDS.some(w => q.includes(w))) { filters.takeaway = true; TAKEAWAY_WORDS.forEach(removeWord); }
  if (FAST_WORDS.some(w => q.includes(w))) { filters.sort = 'rating'; FAST_WORDS.forEach(removeWord); }

  const ratingMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:star|stars|rating|\+)/);
  if (ratingMatch) {
    filters.min_rating = parseFloat(ratingMatch[1]);
    removeWord(ratingMatch[0]);
  }

  for (const [keyword, areaName] of Object.entries(AREA_MAP)) {
    if (q.includes(keyword)) {
      filters.area = areaName;
      removeWord(keyword);
      break;
    }
  }

  if (SPICY_WORDS.some(w => q.includes(w))) {
    SPICY_WORDS.forEach(removeWord);
    cleanedSearch = cleanedSearch || 'spicy misal';
  }

  cleanedSearch = cleanedSearch.replace(/\s+/g, ' ').trim();
  return { filters, cleanedSearch, isNearMe };
}

export function describeQuery(filters) {
  const parts = [];
  if (filters.open_now) parts.push('open now');
  if (filters.price_level === 1 || filters.price_level === 2) parts.push('budget-friendly');
  if (filters.price_level === 4) parts.push('premium');
  if (filters.family_friendly) parts.push('family-friendly');
  if (filters.delivery) parts.push('with delivery');
  if (filters.parking) parts.push('with parking');
  if (filters.ac) parts.push('air-conditioned');
  if (filters.veg) parts.push('vegetarian');
  if (filters.min_rating) parts.push(`rated ${filters.min_rating}+`);
  if (filters.area) parts.push(`in ${filters.area}`);
  if (filters.max_distance) parts.push('near you');
  return parts.length ? `Showing ${parts.join(', ')} restaurants` : '';
}
