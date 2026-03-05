// Re-export most utils from shared location
export { mulberry32, seededShuffle, seededPick } from "@/lib/games/seeded-random";

/**
 * FaBdoku-specific dateToSeed — uses the original hash that was in place
 * when players first started submitting results. Changing this would
 * invalidate all historical puzzle data (scores, picks, uniqueness).
 */
export function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}
