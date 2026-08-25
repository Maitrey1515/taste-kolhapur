import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Users, Wifi, Car, Leaf, Truck, ShieldCheck, Zap } from 'lucide-react';
import type { Restaurant } from '@/types';
import { formatMPS, getMPSTier } from '@/lib/mps';
import { isRestaurantOpenNow } from '@/lib/chatbot';
import clsx from 'clsx';

interface Props {
  restaurant: Restaurant;
  showMPS?: boolean;
  showDistance?: boolean;
  className?: string;
}

const PRICE_SYMBOLS = { 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' } as const;

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80',
  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80',
];

export default function RestaurantCard({ restaurant, showMPS = true, showDistance = false, className }: Props) {
  const isOpen = isRestaurantOpenNow(restaurant);
  const mps = restaurant.mps_score;
  const mpsTier = mps ? getMPSTier(mps) : null;
  const imageSrc = restaurant.cover_image ||
    PLACEHOLDER_IMAGES[restaurant.name.charCodeAt(0) % PLACEHOLDER_IMAGES.length];

  return (
    <Link
      to={`/restaurant/${restaurant.slug}`}
      className={clsx('card block overflow-hidden group cursor-pointer', className)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-[var(--surface-tertiary)]">
        <img
          src={imageSrc}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGES[0]; }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {/* Open/Closed */}
          <span className={clsx(
            'badge text-[10px] font-bold',
            isOpen
              ? 'bg-green-500 text-white'
              : 'bg-gray-800/80 text-gray-300'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full mr-0.5', isOpen ? 'bg-green-200' : 'bg-gray-500')} />
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {restaurant.claimed && (
            <span className="badge bg-orange-500/90 text-white text-[10px]">
              <ShieldCheck className="w-2.5 h-2.5" />
              Claimed
            </span>
          )}
        </div>

        {/* MPS score */}
        {showMPS && mps !== undefined && mps !== null && (
          <div className="absolute top-3 right-3">
            <div className="mps-chip text-[11px]">
              <Zap className="w-3 h-3" />
              MPS {formatMPS(mps)}
            </div>
          </div>
        )}

        {/* Bottom: name + rating */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-white font-display font-bold text-base leading-tight line-clamp-1">
                {restaurant.name}
              </p>
              <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {restaurant.area}
              </p>
            </div>
            {/* Rating */}
            <div className="flex-shrink-0 flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-white text-xs font-bold">
                {restaurant.taste_score?.toFixed(1) ?? restaurant.google_rating?.toFixed(1) ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Price + MPS tier + distance */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {restaurant.price_level && (
              <span className="price-level">{PRICE_SYMBOLS[restaurant.price_level]}</span>
            )}
            {restaurant.approx_price && (
              <span className="text-xs text-[var(--text-muted)]">~₹{restaurant.approx_price}</span>
            )}
            {mpsTier && (
              <span className={clsx('text-xs font-semibold', mpsTier.color)}>{mpsTier.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {showDistance && restaurant.distance_km !== undefined && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {restaurant.distance_km} km
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {restaurant.review_count} reviews
            </span>
          </div>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-1.5">
          {restaurant.features?.parking && (
            <span className="feature-chip"><Car className="w-3 h-3" />Parking</span>
          )}
          {restaurant.features?.ac && (
            <span className="feature-chip"><Wifi className="w-3 h-3" />AC</span>
          )}
          {restaurant.features?.veg && (
            <span className="feature-chip"><Leaf className="w-3 h-3" />Pure Veg</span>
          )}
          {restaurant.features?.delivery && (
            <span className="feature-chip"><Truck className="w-3 h-3" />Delivery</span>
          )}
          {restaurant.features?.family_friendly && (
            <span className="feature-chip"><Users className="w-3 h-3" />Family</span>
          )}
          {restaurant.seating_capacity && (
            <span className="feature-chip"><Clock className="w-3 h-3" />{restaurant.seating_capacity} seats</span>
          )}
        </div>
      </div>
    </Link>
  );
}
