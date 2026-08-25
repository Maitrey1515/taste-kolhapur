import { Calendar, MapPin, Tag } from 'lucide-react';
import type { RestaurantEvent } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';

const EVENT_COLORS: Record<string, string> = {
  festival:     'badge-orange',
  special_menu: 'badge-amber',
  competition:  'badge-red',
  workshop:     'badge-blue',
  celebration:  'badge-green',
};

const EVENT_EMOJIS: Record<string, string> = {
  festival: '🎉', special_menu: '🍽️', competition: '🏆', workshop: '📚', celebration: '🎊',
};

interface Props {
  event: RestaurantEvent;
  className?: string;
}

export default function EventCard({ event, className }: Props) {
  const start = new Date(event.start_date);
  const isPast = start < new Date();

  return (
    <div className={clsx('card overflow-hidden group', isPast && 'opacity-60', className)}>
      {event.image && (
        <div className="h-36 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] line-clamp-2">
            {EVENT_EMOJIS[event.type] ?? '📅'} {event.title}
          </h3>
          <span className={clsx('badge flex-shrink-0', EVENT_COLORS[event.type] ?? 'badge-gray')}>
            <Tag className="w-2.5 h-2.5" />
            {event.type.replace('_', ' ')}
          </span>
        </div>

        {event.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{event.description}</p>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Calendar className="w-3 h-3" />
            <span>
              {format(start, 'dd MMM yyyy')}
              {event.end_date && ` – ${format(new Date(event.end_date), 'dd MMM yyyy')}`}
            </span>
          </div>
          {event.restaurant && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" />
              <span>{event.restaurant.name}, {event.restaurant.area}</span>
            </div>
          )}
        </div>

        {isPast && (
          <div className="mt-2">
            <span className="badge badge-gray text-[10px]">Past Event</span>
          </div>
        )}
      </div>
    </div>
  );
}
