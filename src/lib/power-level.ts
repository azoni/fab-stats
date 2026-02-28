import type { LeaderboardEntry } from "@/types";

export function computePowerLevel(e: LeaderboardEntry): number {
  let score = 0;
  const totalMatches = e.totalMatches + e.totalByes;

  // Win rate: max 30pts, scaled by match count (need 20+ for full weight)
  const wrWeight = Math.min(totalMatches / 20, 1);
  score += (e.winRate / 100) * 30 * wrWeight;

  // Volume: max 15pts, log scale capping at 500 matches
  if (totalMatches > 0) {
    score += Math.min(Math.log(totalMatches + 1) / Math.log(501), 1) * 15;
  }

  // Event success: max 20pts (event wins 10, top 8s 6, events played 4)
  score += Math.min(e.eventWins / 10, 1) * 10;
  score += Math.min((e.totalTop8s ?? 0) / 8, 1) * 6;
  score += Math.min(e.eventsPlayed / 20, 1) * 4;

  // Streaks: max 10pts
  score += Math.min(e.longestWinStreak / 15, 1) * 7;
  score += Math.min(e.currentStreakType === "win" ? e.currentStreakCount / 10 : 0, 1) * 3;

  // Hero mastery: max 10pts (unique heroes 5, top hero depth 5)
  score += Math.min(e.uniqueHeroes / 8, 1) * 5;
  score += Math.min(e.topHeroMatches / 100, 1) * 5;

  // Rated performance: max 10pts (requires 5+ rated matches)
  if (e.ratedMatches >= 5) {
    score += (e.ratedWinRate / 100) * 10;
  }

  // Earnings bonus: max 5pts
  const earnings = e.earnings ?? 0;
  if (earnings > 0) {
    score += Math.min(Math.log(earnings + 1) / Math.log(10001), 1) * 5;
  }

  return Math.min(Math.round(score), 99);
}

export type PowerTier = { label: string; color: string; glow: string; textColor: string };

export function getPowerTier(level: number): PowerTier {
  if (level >= 80) return { label: "Grandmaster", color: "from-fuchsia-500 to-pink-500", glow: "shadow-fuchsia-500/30", textColor: "text-fuchsia-400" };
  if (level >= 65) return { label: "Diamond", color: "from-sky-400 to-blue-500", glow: "shadow-sky-400/30", textColor: "text-sky-400" };
  if (level >= 50) return { label: "Gold", color: "from-yellow-400 to-amber-500", glow: "shadow-yellow-400/30", textColor: "text-yellow-400" };
  if (level >= 35) return { label: "Silver", color: "from-gray-300 to-gray-400", glow: "shadow-gray-400/20", textColor: "text-gray-400" };
  return { label: "Bronze", color: "from-amber-600 to-orange-700", glow: "shadow-amber-600/20", textColor: "text-amber-500" };
}
