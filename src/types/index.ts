// ─── All shared TypeScript types for TasteKolhapur ───────────────────────

export type Role = 'customer' | 'owner' | 'admin';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';
export type PriceLevel = 1 | 2 | 3 | 4;
export type EventType = 'festival' | 'special_menu' | 'competition' | 'workshop' | 'celebration';

// ─── Profile ──────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  display_name: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  role: Role;
  taste_profile: TasteProfile | null;
  created_at: string;
}

export interface TasteProfile {
  avg_taste: number;
  avg_spice: number;
  avg_value: number;
  avg_service: number;
  avg_cleanliness: number;
  avg_ambience: number;
  avg_portion: number;
  pref_price_level: number;
  favourite_areas: string[];
  favourite_dishes: string[];
  total_reviews: number;
}

// ─── Restaurant ───────────────────────────────────────────────────────────
export interface RestaurantFeatures {
  parking: boolean;
  ac: boolean;
  veg: boolean;
  delivery: boolean;
  takeaway: boolean;
  family_friendly: boolean;
  wheelchair: boolean;
}

export interface OpeningHours {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
  /** fallback: "10:00-22:00" or "closed" */
  default?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  price_level: PriceLevel | null;
  avg_cost: number | null;
  opening_hours: OpeningHours | null;
  seating_capacity: number | null;
  features: RestaurantFeatures;
  peak_hours: string | null;
  cover_image: string | null;
  logo_image: string | null;
  owner_id: string | null;
  claimed: boolean;
  taste_score: number | null;
  review_count: number;
  // Hotel_Master fields
  hotel_id: string | null;
  established_year: number | null;
  weekly_off: string | null;
  employees: number | null;
  upi: string | null;
  google_rating: number | null;
  google_reviews: number | null;
  approx_price: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  owner?: Profile;
  mps_score?: number;
  distance_km?: number;
}

// ─── Review ───────────────────────────────────────────────────────────────
export interface ReviewSubRatings {
  taste: number;
  spice: number;
  authenticity: number;
  service: number;
  cleanliness: number;
  ambience: number;
  value_for_money: number;
  portion_size: number;
  waiting_time: number;
  parking: number;
  staff_behaviour: number;
}

export interface Review {
  id: string;
  restaurant_id: string;
  user_id: string;
  sub_ratings: ReviewSubRatings;
  overall_rating: number;
  would_recommend: boolean;
  would_visit_again: boolean;
  written_review: string | null;
  favourite_dish: string | null;
  amount_spent: number | null;
  visit_date: string | null;
  tags: string[];
  media: string[];
  verified_visit: boolean;
  is_spam: boolean;
  is_fake: boolean;
  fake_score: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  reviewer?: Profile;
  restaurant?: Restaurant;
  replies?: ReviewReply[];
}

export interface ReviewReply {
  id: string;
  review_id: string;
  owner_id: string;
  content: string;
  created_at: string;
  owner?: Profile;
}

// ─── Restaurant Event ─────────────────────────────────────────────────────
export interface RestaurantEvent {
  id: string;
  restaurant_id: string;
  title: string;
  type: EventType;
  description: string | null;
  start_date: string;
  end_date: string | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
  restaurant?: Restaurant;
}

// ─── Ownership Claim ──────────────────────────────────────────────────────
export interface OwnershipClaim {
  id: string;
  restaurant_id: string;
  user_id: string;
  status: ClaimStatus;
  submitted_info: {
    business_proof: string;
    contact_email: string;
    contact_phone: string;
    document_url?: string;
    additional_notes?: string;
  };
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  claimant?: Profile;
}

// ─── Admin Audit Log ──────────────────────────────────────────────────────
export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_row_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  admin?: Profile;
}

// ─── BI / Analytics ───────────────────────────────────────────────────────
export interface MPSScore {
  restaurant_id: string;
  restaurant_name: string;
  area: string;
  mps: number;
  r_score: number;
  cs_score: number;
  v_score: number;
  rec_score: number;
  rp_score: number;
  review_count: number;
  overall_rating: number;
}

export interface ExecutiveKPIs {
  total_restaurants: number;
  avg_rating: number;
  total_reviews: number;
  avg_price: number;
  customer_satisfaction: number;
  recommendation_rate: number;
}

export interface MarketAnalysisArea {
  area: string;
  restaurant_count: number;
  avg_rating: number;
  review_volume: number;
  avg_price: number;
  avg_mps: number;
}

// ─── Recommendation ───────────────────────────────────────────────────────
export type RecommendationCategory =
  | 'for_you'
  | 'hidden_gems'
  | 'best_budget'
  | 'best_premium'
  | 'best_family'
  | 'open_now'
  | 'nearby'
  | 'fastest_service'
  | 'popular_areas';

export interface RecommendationList {
  category: RecommendationCategory;
  title: string;
  subtitle: string;
  icon: string;
  restaurants: Restaurant[];
}

// ─── Chatbot ─────────────────────────────────────────────────────────────
export type ChatIntent =
  | 'find_restaurant'
  | 'find_cheap'
  | 'find_spicy'
  | 'find_nearby'
  | 'find_open'
  | 'find_family'
  | 'find_parking'
  | 'find_delivery'
  | 'find_veg'
  | 'find_top_rated'
  | 'restaurant_detail'
  | 'help'
  | 'greeting'
  | 'fallback';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  restaurants?: Restaurant[];
  timestamp: Date;
}

// ─── Filters ─────────────────────────────────────────────────────────────
export interface DiscoveryFilters {
  search: string;
  area: string;
  price_level: PriceLevel | null;
  min_rating: number | null;
  open_now: boolean;
  parking: boolean;
  family_friendly: boolean;
  ac: boolean;
  takeaway: boolean;
  delivery: boolean;
  wheelchair: boolean;
  veg: boolean;
  max_wait: number | null;
  max_distance: number | null;
  sort: 'relevance' | 'rating' | 'distance' | 'price_asc' | 'price_desc' | 'reviews' | 'newest';
}

// ─── QR ──────────────────────────────────────────────────────────────────
export interface QRTokenPayload {
  slug: string;
  token: string;
  expires: number;
}

// ─── Form types ──────────────────────────────────────────────────────────
export interface ReviewFormData {
  sub_ratings: ReviewSubRatings;
  overall_rating: number;
  would_recommend: boolean;
  would_visit_again: boolean;
  written_review: string;
  favourite_dish: string;
  amount_spent: string;
  visit_date: string;
  tags: string[];
}

export interface RestaurantFormData {
  name: string;
  area: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  price_level: PriceLevel;
  avg_cost: string;
  seating_capacity: string;
  features: RestaurantFeatures;
  peak_hours: string;
  opening_hours: OpeningHours;
  established_year: string;
  weekly_off: string;
  employees: string;
  upi: string;
}
