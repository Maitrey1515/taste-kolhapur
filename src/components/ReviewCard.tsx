import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp, Shield, CheckCircle } from 'lucide-react';
import type { Review } from '@/types';
import StarRating from './StarRating';
import SubRatingSlider from './SubRatingSlider';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const SUB_RATING_LABELS: Record<string, string> = {
  taste: 'Taste', spice: 'Spice Level', authenticity: 'Authenticity',
  service: 'Service', cleanliness: 'Cleanliness', ambience: 'Ambience',
  value_for_money: 'Value for Money', portion_size: 'Portion Size',
  waiting_time: 'Wait Time', parking: 'Parking', staff_behaviour: 'Staff',
};

interface Props {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  isOwner?: boolean;
  onReply?: (reviewId: string, content: string) => void;
  showRestaurant?: boolean;
}

export default function ReviewCard({ review, onHelpful, isOwner, onReply, showRestaurant }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const reviewer = review.reviewer;
  const replies = review.replies ?? [];

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(review.id, replyText.trim());
      setReplyText('');
      setReplyOpen(false);
    }
  };

  const subEntries = Object.entries(review.sub_ratings);

  return (
    <div className={clsx('card p-5', review.is_spam && 'opacity-50', review.is_fake && 'border-red-300')}>
      {/* Spam/Fake badges */}
      {(review.is_spam || review.is_fake) && (
        <div className="flex gap-2 mb-3">
          {review.is_spam && <span className="badge badge-amber">⚠️ Spam</span>}
          {review.is_fake && <span className="badge badge-red">🚩 Flagged</span>}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center flex-shrink-0">
            {reviewer?.avatar ? (
              <img src={reviewer.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">
                {reviewer?.display_name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[var(--text-primary)]">
                {reviewer?.display_name ?? 'Anonymous'}
              </span>
              {review.verified_visit && (
                <span className="badge badge-green text-[10px]">
                  <CheckCircle className="w-2.5 h-2.5" /> Verified Visit
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.overall_rating} size="sm" />
              <span className="text-xs text-[var(--text-muted)]">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {review.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {review.tags.slice(0, 3).map(tag => (
              <span key={tag} className="badge badge-orange text-[10px]">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Review text */}
      {review.written_review && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
          {review.written_review}
        </p>
      )}

      {/* Quick info */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-[var(--text-muted)]">
        {review.favourite_dish && (
          <span>🍽️ <strong>{review.favourite_dish}</strong></span>
        )}
        {review.amount_spent && (
          <span>💰 Spent ~₹{review.amount_spent}</span>
        )}
        {review.would_recommend && (
          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" /> Recommends
          </span>
        )}
        {review.would_visit_again && (
          <span className="text-blue-600 dark:text-blue-400">🔄 Will visit again</span>
        )}
      </div>

      {/* Sub ratings (expandable) */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium mb-2"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide' : 'View'} detailed ratings
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-[var(--surface-secondary)] rounded-xl animate-fade-in">
          {subEntries.map(([key, val]) => (
            <SubRatingSlider
              key={key}
              label={SUB_RATING_LABELS[key] ?? key}
              value={val}
            />
          ))}
        </div>
      )}

      {/* Media */}
      {review.media.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
          {review.media.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Review photo ${i + 1}`}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
        {onHelpful && (
          <button
            onClick={() => onHelpful(review.id)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-orange-500 transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Helpful ({review.helpful_count})
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => setReplyOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-orange-500 transition-colors ml-auto"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply
          </button>
        )}
      </div>

      {/* Owner reply form */}
      {isOwner && replyOpen && (
        <div className="mt-3 p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Owner Reply</span>
          </div>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            className="input text-xs resize-none"
            rows={3}
            placeholder="Write a thoughtful reply to this review…"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setReplyOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleReply} className="btn btn-primary btn-sm">Post Reply</button>
          </div>
        </div>
      )}

      {/* Existing replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {replies.map(reply => (
            <div key={reply.id} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Owner Reply</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
