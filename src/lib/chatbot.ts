// ─── Rule-Based Chatbot Intent Engine ────────────────────────────────────
import type { ChatIntent, ChatMessage, Restaurant } from '@/types';

// ─── Intent detection patterns ────────────────────────────────────────────
const INTENT_PATTERNS: Array<{ intent: ChatIntent; patterns: string[] }> = [
  {
    intent: 'greeting',
    patterns: ['hi', 'hello', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'jai shivaji'],
  },
  {
    intent: 'help',
    patterns: ['help', 'what can you do', 'how to use', 'commands', 'options', 'features', 'guide'],
  },
  {
    intent: 'find_cheap',
    patterns: ['cheap', 'affordable', 'budget', 'pocket friendly', 'inexpensive', 'swasta', 'kam paisa'],
  },
  {
    intent: 'find_spicy',
    patterns: ['spicy', 'extra spicy', 'hot', 'teekha', 'tikhat', 'mirchi', 'spiciest'],
  },
  {
    intent: 'find_nearby',
    patterns: ['near me', 'nearby', 'close by', 'around me', 'closest', 'walking distance'],
  },
  {
    intent: 'find_open',
    patterns: ['open now', 'currently open', 'open today', 'open right now', 'which is open'],
  },
  {
    intent: 'find_family',
    patterns: ['family', 'kids', 'children', 'family friendly', 'kutumb', 'with family'],
  },
  {
    intent: 'find_parking',
    patterns: ['parking', 'park my vehicle', 'bike parking', 'car parking'],
  },
  {
    intent: 'find_delivery',
    patterns: ['delivery', 'home delivery', 'order online', 'deliver to', 'ghar pohoch'],
  },
  {
    intent: 'find_veg',
    patterns: ['veg', 'vegetarian', 'pure veg', 'no non veg', 'veg only'],
  },
  {
    intent: 'find_top_rated',
    patterns: ['best', 'top', 'highest rated', 'most popular', 'famous', 'number one', 'no 1', 'recommended'],
  },
  {
    intent: 'find_restaurant',
    patterns: ['restaurant', 'show me', 'list', 'find', 'misal', 'hotels', 'places', 'where to eat'],
  },
];

// ─── Detect intent from message ──────────────────────────────────────────
export function detectIntent(message: string): ChatIntent {
  const q = message.toLowerCase().trim();

  // Check for restaurant name mention
  const restaurantNamePattern = /tell me about|info about|details of|about (.+)/i;
  if (restaurantNamePattern.test(q)) return 'restaurant_detail';

  // Match intents in order of specificity
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => q.includes(p))) {
      return intent;
    }
  }

  return 'fallback';
}

// ─── Generate bot response ────────────────────────────────────────────────
export function generateBotResponse(
  intent: ChatIntent,
  userMessage: string,
  restaurants: Restaurant[],
): { content: string; restaurants?: Restaurant[] } {
  switch (intent) {
    case 'greeting':
      return {
        content: "🙏 Namaskar! Welcome to TasteKolhapur! I'm your Misal guide. I can help you find the best Misal in Kolhapur — by budget, spice level, location, and more. What are you looking for today?",
      };

    case 'help':
      return {
        content: `Here's what I can help you with:

🍽️ **"Best misal"** — Top-rated restaurants
💰 **"Cheap misal"** — Budget-friendly options  
🌶️ **"Spicy misal"** — Highest spice levels
📍 **"Near me"** — Restaurants closest to you
🕐 **"Open now"** — Currently serving
👨‍👩‍👧 **"Family friendly"** — Great for families
🛵 **"Home delivery"** — Delivery available
🅿️ **"With parking"** — Parking available
🌿 **"Veg only"** — Pure vegetarian

Just type naturally and I'll find the right match!`,
      };

    case 'find_top_rated':
    case 'find_restaurant': {
      const top = restaurants
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: `Here are the **top-rated Misal restaurants** in Kolhapur right now:`,
        restaurants: top,
      };
    }

    case 'find_cheap': {
      const cheap = restaurants
        .filter(r => r.price_level !== null && r.price_level <= 2)
        .sort((a, b) => (a.avg_cost ?? 999) - (b.avg_cost ?? 999))
        .slice(0, 3);
      return {
        content: cheap.length
          ? `💰 Here are the most **budget-friendly restaurants**:`
          : `I couldn't find any budget restaurants right now. Try browsing all restaurants!`,
        restaurants: cheap.length ? cheap : undefined,
      };
    }

    case 'find_spicy': {
      const spicy = restaurants
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: `🌶️ These places are known for their **extra spicy food**:`,
        restaurants: spicy,
      };
    }

    case 'find_nearby': {
      const nearby = restaurants
        .filter(r => r.distance_km !== undefined)
        .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
        .slice(0, 3);
      if (nearby.length > 0) {
        return {
          content: `📍 **Closest restaurants** to your location:`,
          restaurants: nearby,
        };
      }
      return {
        content: `📍 Enable location access so I can find restaurants near you! You can also check the **Nearby** page for distance-sorted results.`,
      };
    }

    case 'find_open': {
      const open = restaurants
        .filter(r => isRestaurantOpenNow(r))
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: open.length
          ? `🕐 These places are **open right now**:`
          : `It seems no restaurants match your search right now. Try again later or browse all restaurants.`,
        restaurants: open.length ? open : undefined,
      };
    }

    case 'find_family': {
      const family = restaurants
        .filter(r => r.features?.family_friendly)
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: family.length
          ? `👨‍👩‍👧 **Family-friendly restaurants**:`
          : `I couldn't find specific family-friendly results. Most places welcome families!`,
        restaurants: family.length ? family : undefined,
      };
    }

    case 'find_parking': {
      const parking = restaurants
        .filter(r => r.features?.parking)
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: parking.length
          ? `🅿️ Restaurants with **parking available**:`
          : `No specific parking info available — it's best to call ahead!`,
        restaurants: parking.length ? parking : undefined,
      };
    }

    case 'find_delivery': {
      const delivery = restaurants
        .filter(r => r.features?.delivery)
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: delivery.length
          ? `🛵 Restaurants that offer **home delivery**:`
          : `Home delivery options are limited right now. Check individual restaurant pages for contact details.`,
        restaurants: delivery.length ? delivery : undefined,
      };
    }

    case 'find_veg': {
      const veg = restaurants
        .filter(r => r.features?.veg)
        .sort((a, b) => (b.taste_score ?? 0) - (a.taste_score ?? 0))
        .slice(0, 3);
      return {
        content: veg.length
          ? `🌿 **Pure Veg restaurants**:`
          : `Most places serve veg options, but these are our top pure veg picks.`,
        restaurants: veg.length ? veg : undefined,
      };
    }

    case 'restaurant_detail': {
      // Try to extract restaurant name from message
      const match = userMessage.match(/about (.+?)(?:\?|$)/i);
      if (match) {
        const name = match[1].toLowerCase();
        const found = restaurants.find(r => r.name.toLowerCase().includes(name));
        if (found) {
          return {
            content: `Here's what I know about **${found.name}**:`,
            restaurants: [found],
          };
        }
      }
      return {
        content: `I couldn't find that specific restaurant. Try searching by name on the Discover page, or ask me to show all restaurants.`,
      };
    }

    case 'fallback':
    default:
      return {
        content: `I didn't quite get that! 😊 You can ask me things like:
- "Show me cheap food"
- "Restaurants open now"  
- "Family friendly places"
- "Best rated places"

Or type **"help"** to see all options.`,
      };
  }
}

// ─── Helper: is restaurant open now ──────────────────────────────────────
export function isRestaurantOpenNow(restaurant: Restaurant): boolean {
  if (!restaurant.opening_hours) return true; // assume open if no data

  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const today = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check weekly off
  if (restaurant.weekly_off) {
    const offDay = restaurant.weekly_off.toLowerCase().slice(0, 3);
    if (offDay === today) return false;
  }

  const hours =
    restaurant.opening_hours[today] ||
    restaurant.opening_hours.default;

  if (!hours || hours === 'closed') return false;

  // Parse "10:00-22:00" or "10:00 AM - 10:00 PM"
  const match = hours.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
  if (!match) return true; // can't parse, assume open

  let openH = parseInt(match[1]);
  const openM = parseInt(match[2] || '0');
  let closeH = parseInt(match[4]);
  const closeM = parseInt(match[5] || '0');

  const openAmPm = match[3] ? match[3].toLowerCase() : null;
  const closeAmPm = match[6] ? match[6].toLowerCase() : null;

  if (openAmPm === 'pm' && openH < 12) openH += 12;
  if (openAmPm === 'am' && openH === 12) openH = 0;

  if (closeAmPm === 'pm' && closeH < 12) closeH += 12;
  if (closeAmPm === 'am' && closeH === 12) closeH = 0;

  const openMinutes  = openH  * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle overnight (close < open means past midnight)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

// ─── Create chat message ──────────────────────────────────────────────────
let msgCounter = 0;
export function createMessage(
  role: 'user' | 'bot',
  content: string,
  restaurants?: Restaurant[],
): ChatMessage {
  return {
    id: `msg-${++msgCounter}-${Date.now()}`,
    role,
    content,
    restaurants,
    timestamp: new Date(),
  };
}
