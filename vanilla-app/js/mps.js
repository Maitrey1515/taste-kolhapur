export const MPS_WEIGHTS = {
  R: 0.30,   // Normalized public rating
  CS: 0.30,  // Customer satisfaction
  V: 0.20,   // Value for money
  Rec: 0.10, // Recommendation rate
  RP: 0.10,  // Review popularity
};

export function computeMPS(overallRating, avgTaste, avgService, avgCleanliness, avgAmbience, avgStaff, avgValue, recommendRate, reviewCount, maxReviewCount) {
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

  return Math.round(mps * 1000) / 1000;
}

export function rankMPS(scores) {
  return [...scores].sort((a, b) => b.mps - a.mps);
}

export function formatMPS(score) {
  return (score * 10).toFixed(1);
}

export function getMPSTier(score) {
  if (score >= 0.85) return { label: 'Legendary', color: 'text-amber-500', bg: 'bg-amber-500' };
  if (score >= 0.75) return { label: 'Excellent',  color: 'text-orange-500', bg: 'bg-orange-500' };
  if (score >= 0.65) return { label: 'Great',      color: 'text-orange-400', bg: 'bg-orange-400' };
  if (score >= 0.55) return { label: 'Good',       color: 'text-yellow-500', bg: 'bg-yellow-500' };
  if (score >= 0.45) return { label: 'Average',    color: 'text-gray-500', bg: 'bg-gray-500' };
  return { label: 'Below Avg', color: 'text-red-400', bg: 'bg-red-400' };
}
