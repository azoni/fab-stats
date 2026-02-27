import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { computeOverallStats, computeEventStats, computeOpponentStats, computePlayoffFinishes, getEventType } from "./stats";
import type { LeaderboardEntry, MatchRecord, UserProfile } from "@/types";
import { MatchResult } from "@/types";

function isValidHeroName(name: string): boolean {
  if (!name || name.length < 2) return false;
  const lower = name.toLowerCase().trim();
  const blocked = [
    "not rated", "rated", "unrated", "competitive", "casual",
    "classic constructed", "blitz", "draft", "sealed", "clash",
    "ultimate pit fight", "other", "unknown",
  ];
  if (blocked.includes(lower)) return false;
  if (/\b(19|20)\d{2}\b/.test(name)) return false;
  return true;
}

function leaderboardCollection() {
  return collection(db, "leaderboard");
}

/** Get ISO date string (YYYY-MM-DD) for Monday of the current week */
export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday.toISOString().split("T")[0];
}

/** Get ISO date string (YYYY-MM-DD) for the 1st of the current month */
export function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

export async function updateLeaderboardEntry(
  profile: UserProfile,
  matches: MatchRecord[]
): Promise<void> {
  if (matches.length === 0) return;

  const overall = computeOverallStats(matches);
  const events = computeEventStats(matches);
  const { streaks } = overall;

  // Rated stats
  const ratedMatches = matches.filter((m) => m.rated);
  const ratedWins = ratedMatches.filter((m) => m.result === MatchResult.Win).length;
  const ratedSorted = [...ratedMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let ratedWinStreak = 0;
  let currentRatedStreak = 0;
  for (const m of ratedSorted) {
    if (m.result === MatchResult.Win) {
      currentRatedStreak++;
      ratedWinStreak = Math.max(ratedWinStreak, currentRatedStreak);
    } else if (m.result === MatchResult.Bye) {
      // Byes don't break or extend streaks
    } else {
      currentRatedStreak = 0;
    }
  }

  // Event wins (events where wins > losses)
  const eventWins = events.filter((e) => e.wins >= e.losses).length;

  // Hero diversity + breakdown
  const heroData = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (m.heroPlayed && isValidHeroName(m.heroPlayed)) {
      const cur = heroData.get(m.heroPlayed) || { matches: 0, wins: 0 };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      heroData.set(m.heroPlayed, cur);
    }
  }
  const heroEntries = [...heroData.entries()].sort((a, b) => b[1].matches - a[1].matches);
  const topHero = heroEntries[0]?.[0] || "Unknown";
  const topHeroMatches = heroEntries[0]?.[1]?.matches || 0;
  const heroBreakdown = heroEntries.slice(0, 5).map(([hero, data]) => ({
    hero,
    matches: data.matches,
    wins: data.wins,
    winRate: data.matches > 0 ? (data.wins / data.matches) * 100 : 0,
  }));

  // Hero breakdown by format + event type (for meta page filtering)
  const heroDetailedData = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (m.heroPlayed && isValidHeroName(m.heroPlayed)) {
      const et = getEventType(m);
      const key = `${m.heroPlayed}|${m.format}|${et}`;
      const cur = heroDetailedData.get(key) || { matches: 0, wins: 0 };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      heroDetailedData.set(key, cur);
    }
  }
  const heroBreakdownDetailed = [...heroDetailedData.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 30)
    .map(([key, data]) => {
      const [hero, format, eventType] = key.split("|");
      return {
        hero,
        format,
        eventType,
        matches: data.matches,
        wins: data.wins,
        winRate: data.matches > 0 ? Math.round((data.wins / data.matches) * 1000) / 10 : 0,
      };
    });

  // Nemesis — opponent with worst win rate (min 3 matches)
  const oppStats = computeOpponentStats(matches).filter(
    (o) => o.totalMatches >= 3 && o.opponentName !== "Unknown"
  );
  const nemesisOpp = oppStats.length > 0
    ? oppStats.reduce((worst, o) => (o.winRate < worst.winRate ? o : worst))
    : null;

  // Weekly stats
  const weekStart = getWeekStart();
  let weeklyMatchList = matches.filter((m) => m.date >= weekStart);
  // Guard against bulk-import pollution: if nearly all matches land in "this week"
  // the dates are almost certainly wrong (set to the import date, not the event date)
  if (weeklyMatchList.length > matches.length * 0.8 && matches.length > 30) {
    weeklyMatchList = [];
  }
  const weeklyWins = weeklyMatchList.filter((m) => m.result === MatchResult.Win).length;

  // Monthly stats
  const monthStart = getMonthStart();
  let monthlyMatchList = matches.filter((m) => m.date >= monthStart);
  if (monthlyMatchList.length > matches.length * 0.8 && matches.length > 50) {
    monthlyMatchList = [];
  }
  const monthlyWins = monthlyMatchList.filter((m) => m.result === MatchResult.Win).length;

  // Armory stats
  const armoryMatchList = matches.filter((m) => m.eventType === "Armory");
  const armoryWins = armoryMatchList.filter((m) => m.result === MatchResult.Win).length;
  const armoryEvents = events.filter((e) => e.eventType === "Armory").length;

  // Playoff finishes (top 8+)
  const playoffFinishes = computePlayoffFinishes(events);
  const totalTop8s = playoffFinishes.length;
  const top8sByEventType: Record<string, number> = {};
  for (const f of playoffFinishes) {
    top8sByEventType[f.eventType] = (top8sByEventType[f.eventType] || 0) + 1;
  }

  const entry: Omit<LeaderboardEntry, never> = {
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    totalMatches: overall.totalMatches,
    totalWins: overall.totalWins,
    totalLosses: overall.totalLosses,
    totalDraws: overall.totalDraws,
    totalByes: overall.totalByes,
    winRate: overall.overallWinRate,
    longestWinStreak: streaks.longestWinStreak,
    currentWinStreak: streaks.currentStreak?.type === MatchResult.Win ? streaks.currentStreak.count : 0,
    currentStreakType: streaks.currentStreak?.type === MatchResult.Win ? "win" : streaks.currentStreak?.type === MatchResult.Loss ? "loss" : null,
    currentStreakCount: streaks.currentStreak?.count || 0,
    ratedMatches: ratedMatches.length,
    ratedWins,
    ratedWinRate: ratedMatches.length > 0 ? (ratedWins / ratedMatches.length) * 100 : 0,
    ratedWinStreak,
    eventsPlayed: events.length,
    eventWins,
    uniqueHeroes: heroData.size,
    topHero,
    topHeroMatches,
    nemesis: nemesisOpp?.opponentName,
    nemesisWinRate: nemesisOpp?.winRate,
    nemesisMatches: nemesisOpp?.totalMatches,
    weeklyMatches: weeklyMatchList.length,
    weeklyWins,
    weekStart,
    monthlyMatches: monthlyMatchList.length,
    monthlyWins,
    monthlyWinRate: monthlyMatchList.length > 0 ? (monthlyWins / monthlyMatchList.length) * 100 : 0,
    monthStart,
    earnings: profile.earnings,
    armoryMatches: armoryMatchList.length,
    armoryWins,
    armoryWinRate: armoryMatchList.length > 0 ? (armoryWins / armoryMatchList.length) * 100 : 0,
    armoryEvents,
    showNameOnProfiles: profile.showNameOnProfiles ?? false,
    hideFromSpotlight: profile.hideFromSpotlight ?? false,
    heroBreakdown,
    heroBreakdownDetailed,
    totalTop8s,
    top8sByEventType,
    createdAt: profile.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;

  await setDoc(doc(leaderboardCollection(), profile.uid), clean);
  invalidateLeaderboardCache();
}

// ── Cached one-time fetch (replaces real-time subscription) ──

let cachedEntries: LeaderboardEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60_000; // 5 minutes

export async function getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (cachedEntries && now - cacheTimestamp < CACHE_TTL) {
    return cachedEntries;
  }
  const q = query(leaderboardCollection(), where("isPublic", "==", true));
  const snapshot = await getDocs(q);

  // Fix stale weekly/monthly stats — zero out if the stored period doesn't match current
  const currentWeekStart = getWeekStart();
  const currentMonthStart = getMonthStart();

  cachedEntries = snapshot.docs.map((d) => {
    const entry = d.data() as LeaderboardEntry;

    if (entry.weekStart !== currentWeekStart) {
      entry.weeklyMatches = 0;
      entry.weeklyWins = 0;
      entry.weekStart = currentWeekStart;
    }

    if (entry.monthStart !== currentMonthStart) {
      entry.monthlyMatches = 0;
      entry.monthlyWins = 0;
      entry.monthlyWinRate = 0;
      entry.monthStart = currentMonthStart;
    }

    // Sanitize bulk-import pollution: if weekly/monthly matches are suspiciously
    // close to total matches, the dates are almost certainly wrong
    if (entry.weeklyMatches > entry.totalMatches * 0.8 && entry.totalMatches > 30) {
      entry.weeklyMatches = 0;
      entry.weeklyWins = 0;
    }
    if (entry.monthlyMatches > entry.totalMatches * 0.8 && entry.totalMatches > 50) {
      entry.monthlyMatches = 0;
      entry.monthlyWins = 0;
      entry.monthlyWinRate = 0;
    }

    return entry;
  });

  cacheTimestamp = now;
  return cachedEntries;
}

export function invalidateLeaderboardCache() {
  cachedEntries = null;
  cacheTimestamp = 0;
}
