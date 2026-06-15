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
  /** Opponents faced this session never seen before the import */
  newOpponents: NewOpponent[];
  /** Your hero-vs-hero record from this session (known heroes only) */
  sessionMatchups: SessionMatchup[];
  /** Session matches missing an opponent hero — drives the "fill to unlock" nudge */
  missingOpponentHeroCount: number;
  /** Distinct events imported this session (drives full-vs-compact recap) */
  eventCount: number;
  /** Overall stats after import */
  newOverallWinRate: number;
  newTotalMatches: number;
  /** Streak info after import */
  currentStreak: { type: "win" | "loss"; count: number } | null;
}

export interface NewOpponent {
  name: string;
  hero?: string;
}

export interface SessionMatchup {
  heroPlayed: string;
  opponentHero: string;
  wins: number;
  losses: number;
  draws: number;
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
  const total = wins + losses + draws;
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

  // New opponents — opponents in the session never seen before this import.
  const normalizeName = (n?: string) => (n || "").trim().toLowerCase();
  const beforeOpponents = new Set(
    beforeMatches.map((m) => normalizeName(m.opponentName)).filter(Boolean),
  );
  const newOpponentsMap = new Map<string, NewOpponent>();
  for (const m of sessionMatches) {
    const key = normalizeName(m.opponentName);
    if (!key || beforeOpponents.has(key) || newOpponentsMap.has(key)) continue;
    newOpponentsMap.set(key, {
      name: m.opponentName!.trim(),
      hero: m.opponentHero && m.opponentHero !== "Unknown" ? m.opponentHero : undefined,
    });
  }
  const newOpponents = [...newOpponentsMap.values()];

  // Session hero-vs-hero matchups (both heroes known).
  const matchupMap = new Map<string, SessionMatchup>();
  for (const m of sessionMatches) {
    if (!m.heroPlayed || m.heroPlayed === "Unknown") continue;
    if (!m.opponentHero || m.opponentHero === "Unknown") continue;
    const key = `${m.heroPlayed}|${m.opponentHero}`;
    const cur = matchupMap.get(key) ?? { heroPlayed: m.heroPlayed, opponentHero: m.opponentHero, wins: 0, losses: 0, draws: 0 };
    if (m.result === MatchResult.Win) cur.wins++;
    else if (m.result === MatchResult.Loss) cur.losses++;
    else if (m.result === MatchResult.Draw) cur.draws++;
    matchupMap.set(key, cur);
  }
  const sessionMatchups = [...matchupMap.values()].sort(
    (a, b) => (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws),
  );

  // Matches missing an opponent hero (non-bye) — the data-driving nudge.
  const missingOpponentHeroCount = sessionMatches.filter(
    (m) => m.result !== MatchResult.Bye && (!m.opponentHero || m.opponentHero === "Unknown"),
  ).length;

  // Distinct events imported (eventName|date), drives full-vs-compact recap.
  const eventCount = new Set(
    sessionMatches.map((m) => {
      const eventName = m.notes?.split(" | ")[0]?.trim() || `${m.date}-${m.format}`;
      return `${eventName}|${m.date}`;
    }),
  ).size;

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
    newOpponents,
    sessionMatchups,
    missingOpponentHeroCount,
    eventCount,
    newOverallWinRate: afterOverall.overallWinRate,
    newTotalMatches: afterOverall.totalMatches,
    currentStreak: afterStreaks.currentStreak
      ? { type: afterStreaks.currentStreak.type === MatchResult.Win ? "win" : "loss", count: afterStreaks.currentStreak.count }
      : null,
  };
}
