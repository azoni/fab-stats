import type { MatchRecord } from "@/types";
import { MatchResult } from "@/types";
import { getEventType } from "./stats";
import { isMajorEventType } from "./event-types";

const DEFAULT_RATING = 1200;

/**
 * Get the K-factor based on total matches played so far.
 * More matches → lower K → more stable rating.
 */
function getKFactor(matchCount: number): number {
  if (matchCount < 30) return 40;
  if (matchCount < 100) return 20;
  return 10;
}

/**
 * Get event weight multiplier based on event type and rated status.
 * Major rated events weight more heavily.
 */
function getEventWeight(match: MatchRecord): number {
  const isMajor = isMajorEventType(getEventType(match));
  if (isMajor && match.rated) return 1.5;
  if (match.rated) return 1.2;
  return 1.0;
}

/**
 * Compute ELO rating from match history.
 * Uses standard ELO formula: Rn = Ro + K * weight * (S - E)
 * where E = 1 / (1 + 10^((Ro - Rp) / 400))
 *
 * Opponent rating defaults to 1200 since we don't have cross-player data
 * available during client-side computation.
 */
export function computeEloRating(matches: MatchRecord[]): number {
  // Sort chronologically
  const sorted = [...matches]
    .filter((m) => m.result !== MatchResult.Bye)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) return DEFAULT_RATING;

  let rating = DEFAULT_RATING;

  for (let i = 0; i < sorted.length; i++) {
    const match = sorted[i];
    const K = getKFactor(i);
    const weight = getEventWeight(match);
    const opponentRating = DEFAULT_RATING;

    // Score: 1 = win, 0.5 = draw, 0 = loss
    let S: number;
    if (match.result === MatchResult.Win) S = 1;
    else if (match.result === MatchResult.Draw) S = 0.5;
    else S = 0;

    // Expected score
    const E = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));

    // Update rating
    rating = rating + K * weight * (S - E);
  }

  return Math.round(rating);
}

export interface EloTierDef {
  label: string;
  color: string;
  min: number;
}

export const ELO_TIERS: EloTierDef[] = [
  { label: "Master", color: "#a78bfa", min: 1600 },
  { label: "Diamond", color: "#38bdf8", min: 1500 },
  { label: "Platinum", color: "#22d3ee", min: 1400 },
  { label: "Gold", color: "#c9a84c", min: 1300 },
  { label: "Silver", color: "#94a3b8", min: 1200 },
  { label: "Bronze", color: "#cd7f32", min: 1100 },
  { label: "Iron", color: "#64748b", min: 0 },
];

/**
 * Get ELO tier label and color based on rating.
 */
export function getEloTier(rating: number): { label: string; color: string } {
  for (const tier of ELO_TIERS) {
    if (rating >= tier.min) return { label: tier.label, color: tier.color };
  }
  return { label: "Iron", color: "#64748b" };
}
