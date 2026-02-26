import type { MatchRecord, HeroMastery } from "@/types";
import { MatchResult } from "@/types";
import { computeHeroStats, computeOverallStats, computeStreaks } from "./stats";
import { computeHeroMastery } from "./mastery";

export interface SessionRecap {
  /** Matches imported this session */
  sessionMatches: MatchRecord[];
  /** Session record */
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  /** Best streak within the session */
  bestStreak: number;
  /** Hero insights: win rate changes, tier ups */
  heroInsights: HeroInsight[];
  /** Overall stats after import */
  newOverallWinRate: number;
  newTotalMatches: number;
  /** Streak info after import */
  currentStreak: { type: "win" | "loss"; count: number } | null;
}

export interface HeroInsight {
  heroName: string;
  sessionMatches: number;
  sessionWins: number;
  sessionWinRate: number;
  /** null if hero is new */
  previousWinRate: number | null;
  newWinRate: number;
  newTotalMatches: number;
  /** Mastery tier change */
  previousTier: HeroMastery | null;
  newTier: HeroMastery;
  tierUp: boolean;
}

export function computeSessionRecap(
  beforeMatches: MatchRecord[],
  afterMatches: MatchRecord[],
  sessionMatches: MatchRecord[]
): SessionRecap {
  const wins = sessionMatches.filter((m) => m.result === MatchResult.Win).length;
  const losses = sessionMatches.filter((m) => m.result === MatchResult.Loss).length;
  const draws = sessionMatches.filter((m) => m.result === MatchResult.Draw).length;
  const total = sessionMatches.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  // Best win streak within session
  let bestStreak = 0;
  let current = 0;
  for (const m of sessionMatches) {
    if (m.result === MatchResult.Win) {
      current++;
      bestStreak = Math.max(bestStreak, current);
    } else {
      current = 0;
    }
  }

  // Hero insights
  const beforeHeroStats = computeHeroStats(beforeMatches);
  const afterHeroStats = computeHeroStats(afterMatches);
  const beforeMastery = computeHeroMastery(beforeHeroStats);
  const afterMastery = computeHeroMastery(afterHeroStats);

  // Heroes played in session
  const sessionHeroes = new Set(
    sessionMatches
      .map((m) => m.heroPlayed)
      .filter((h) => h && h !== "Unknown")
  );

  const heroInsights: HeroInsight[] = [];
  for (const heroName of sessionHeroes) {
    const sessionHeroMatches = sessionMatches.filter((m) => m.heroPlayed === heroName);
    const sWins = sessionHeroMatches.filter((m) => m.result === MatchResult.Win).length;
    const sTotal = sessionHeroMatches.length;

    const beforeHero = beforeHeroStats.find((h) => h.heroName === heroName);
    const afterHero = afterHeroStats.find((h) => h.heroName === heroName);
    const beforeTier = beforeMastery.find((m) => m.heroName === heroName) ?? null;
    const afterTier = afterMastery.find((m) => m.heroName === heroName);

    if (!afterHero || !afterTier) continue;

    heroInsights.push({
      heroName,
      sessionMatches: sTotal,
      sessionWins: sWins,
      sessionWinRate: sTotal > 0 ? (sWins / sTotal) * 100 : 0,
      previousWinRate: beforeHero ? beforeHero.winRate : null,
      newWinRate: afterHero.winRate,
      newTotalMatches: afterHero.totalMatches,
      previousTier: beforeTier,
      newTier: afterTier,
      tierUp: beforeTier ? afterTier.tier !== beforeTier.tier : false,
    });
  }

  // Sort: tier ups first, then by session matches
  heroInsights.sort((a, b) => {
    if (a.tierUp !== b.tierUp) return a.tierUp ? -1 : 1;
    return b.sessionMatches - a.sessionMatches;
  });

  // Overall stats after
  const afterOverall = computeOverallStats(afterMatches);
  const afterStreaks = computeStreaks(
    [...afterMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  );

  return {
    sessionMatches,
    wins,
    losses,
    draws,
    winRate,
    bestStreak,
    heroInsights,
    newOverallWinRate: afterOverall.overallWinRate,
    newTotalMatches: afterOverall.totalMatches,
    currentStreak: afterStreaks.currentStreak
      ? { type: afterStreaks.currentStreak.type === MatchResult.Win ? "win" : "loss", count: afterStreaks.currentStreak.count }
      : null,
  };
}
