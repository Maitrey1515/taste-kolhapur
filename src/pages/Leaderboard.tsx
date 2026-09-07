import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, Zap, Star } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { MPSScore } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatMPS, getMPSTier } from '@/lib/mps';
import clsx from 'clsx';

export default function Leaderboard() {
  const [scores, setScores] = useState<MPSScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'restaurants'))
      .then((snap) => {
        const mapped = snap.docs.map(doc => {
          const r = doc.data();
          return {
            restaurant_id: doc.id,
            restaurant_name: r.name,
            area: r.area,
            mps: r.mps_score || 0,
            // Mock sub-scores for the UI if they don't exist in the document
            r_score: r.r_score || (r.mps_score ? r.mps_score * 0.3 / 10 : 0.25),
            cs_score: r.cs_score || (r.mps_score ? r.mps_score * 0.3 / 10 : 0.25),
            v_score: r.v_score || (r.mps_score ? r.mps_score * 0.2 / 10 : 0.15),
            rec_score: r.rec_score || (r.mps_score ? r.mps_score * 0.1 / 10 : 0.08),
            rp_score: r.rp_score || (r.mps_score ? r.mps_score * 0.1 / 10 : 0.07),
            review_count: r.review_count || 0,
            overall_rating: r.taste_score || r.google_rating || 4,
          } as MPSScore;
        });
        mapped.sort((a, b) => b.mps - a.mps);
        setScores(mapped);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching leaderboard data:", error);
        setLoading(false);
      });
  }, []);

  return (
    <main className="page-container py-8 min-h-screen">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 mb-4 shadow-glow-orange">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-[var(--text-primary)] mb-3">
          Misal Performance Leaderboard
        </h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          The definitive ranking of Kolhapur's best Misal, powered by the <strong>MPS Score</strong>.
          We measure public rating, customer satisfaction across 5 dimensions, value for money, recommendation rate, and review popularity.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner label="Calculating MPS scores…" />
      ) : scores.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">No data available yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)] w-20 text-center">Rank</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)] min-w-[200px]">Restaurant</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">MPS Score</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Rating</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Reviews</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {scores.map((score, index) => {
                  const rank = index + 1;
                  const tier = getMPSTier(score.mps);
                  return (
                    <tr
                      key={score.restaurant_id}
                      className={clsx(
                        'hover:bg-[var(--surface-secondary)]/50 transition-colors group',
                        rank <= 3 && 'bg-orange-50/30 dark:bg-orange-950/10'
                      )}
                    >
                      <td className="px-6 py-4 text-center">
                        {rank === 1 ? <span className="text-2xl">🥇</span> :
                         rank === 2 ? <span className="text-2xl">🥈</span> :
                         rank === 3 ? <span className="text-2xl">🥉</span> :
                         <span className="font-bold text-[var(--text-muted)] text-lg">{rank}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/restaurant/${score.restaurant_id}`} className="block">
                          <p className="font-display font-bold text-[var(--text-primary)] group-hover:text-orange-500 transition-colors">
                            {score.restaurant_name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{score.area}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-lg text-gradient">
                            {formatMPS(score.mps)}
                          </span>
                          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', tier.color, 'border-current bg-current bg-opacity-10')}>
                            {tier.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {score.overall_rating.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)] font-medium">
                        {score.review_count}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <MiniBar label="R" value={score.r_score} max={0.3} color="bg-blue-500" tooltip="Rating (30%)" />
                          <MiniBar label="CS" value={score.cs_score} max={0.3} color="bg-green-500" tooltip="Satisfaction (30%)" />
                          <MiniBar label="V" value={score.v_score} max={0.2} color="bg-amber-500" tooltip="Value (20%)" />
                          <MiniBar label="Rec" value={score.rec_score} max={0.1} color="bg-purple-500" tooltip="Recommendation (10%)" />
                          <MiniBar label="RP" value={score.rp_score} max={0.1} color="bg-rose-500" tooltip="Popularity (10%)" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function MiniBar({ label, value, max, color, tooltip }: { label: string, value: number, max: number, color: string, tooltip: string }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="group/bar relative flex flex-col items-center gap-1 w-6">
      <div className="h-8 w-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden flex items-end">
        <div className={clsx('w-full rounded-full transition-all duration-1000', color)} style={{ height: `${percent}%` }} />
      </div>
      <span className="text-[9px] font-semibold text-[var(--text-muted)]">{label}</span>
      {/* Tooltip */}
      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
        {tooltip}: {(value * 100).toFixed(1)} pts
      </div>
    </div>
  );
}
