import type { MPSScore } from '@/types';

// ─── MPS Weight Constants (configurable) ─────────────────────────────────
export const MPS_WEIGHTS = {
  R: 0.30,   // Normalized public rating
  CS: 0.30,  // Customer satisfaction (avg of taste/service/cleanliness/ambience/staff)
  V: 0.20,   // Value for money
  Rec: 0.10, // Recommendation rate
  RP: 0.10,  // Review popularity (normalized review count)
} as const;

// ─── Compute single restaurant MPS (client-side) ─────────────────────────
export function computeMPS(
  overallRating: number,   // 0–5
  avgTaste: number,        // 0–5
  avgService: number,      // 0–5
  avgCleanliness: number,  // 0–5
  avgAmbience: number,     // 0–5
  avgStaff: number,        // 0–5
  avgValue: number,        // 0–5
  recommendRate: number,   // 0–1 (fraction of reviews with would_recommend=true)
  reviewCount: number,
  maxReviewCount: number,
): number {
  const R = overallRating / 5;
  const CS = ((avgTaste + avgService + avgCleanliness + avgAmbience + avgStaff) / 5) / 5;
  const V = avgValue / 5;
  const Rec = recommendRate;
  const RP = maxReviewCount > 0 ? reviewCount / maxReviewCount : 0;

  const mps =
    MPS_WEIGHTS.R * R +
    MPS_WEIGHTS.CS * CS +
    MPS_WEIGHTS.V * V +
    MPS_WEIGHTS.Rec * Rec +
    MPS_WEIGHTS.RP * RP;

  return Math.round(mps * 1000) / 1000; // 3 decimal places
}

// ─── Rank a list of scores ────────────────────────────────────────────────
export function rankMPS(scores: MPSScore[]): MPSScore[] {
  return [...scores].sort((a, b) => b.mps - a.mps);
}

// ─── Format MPS for display ───────────────────────────────────────────────
export function formatMPS(score: number): string {
  return (score * 10).toFixed(1); // Display as 0–10 scale
}

// ─── Get MPS tier label ──────────────────────────────────────────────────
export function getMPSTier(score: number): { label: string; color: string } {
  if (score >= 0.85) return { label: 'Legendary', color: 'text-amber-500' };
  if (score >= 0.75) return { label: 'Excellent',  color: 'text-orange-500' };
  if (score >= 0.65) return { label: 'Great',      color: 'text-orange-400' };
  if (score >= 0.55) return { label: 'Good',       color: 'text-yellow-500' };
  if (score >= 0.45) return { label: 'Average',    color: 'text-gray-500'   };
  return                       { label: 'Below Avg', color: 'text-red-400'   };
}
