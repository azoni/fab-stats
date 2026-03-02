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

/** Local YYYY-MM-DD string for N days ago */
function localDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get ISO date string (YYYY-MM-DD) for 7 days ago (rolling week) */
export function getWeekStart(): string {
  return localDateStr(7);
}

/** Get ISO date string (YYYY-MM-DD) for 30 days ago (rolling month) */
export function getMonthStart(): string {
  return localDateStr(30);
}

export async function updateLeaderboardEntry(
  profile: UserProfile,
  matches: MatchRecord[]
): Promise<void> {
  if (matches.length === 0) return;

  const overall = computeOverallStats(matches);
  const events = computeEventStats(matches);
  const { streaks } = overall;

  // Rated stats (exclude byes)
  const ratedMatches = matches.filter((m) => m.rated && m.result !== MatchResult.Bye);
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
    if (m.heroPlayed && isValidHeroName(m.heroPlayed) && m.result !== MatchResult.Bye) {
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
  const heroDetailedData = new Map<string, { matches: number; wins: number; dates: Set<string> }>();
  for (const m of matches) {
    if (m.heroPlayed && isValidHeroName(m.heroPlayed) && m.result !== MatchResult.Bye) {
      const et = getEventType(m);
      const key = `${m.heroPlayed}|${m.format}|${et}`;
      const cur = heroDetailedData.get(key) || { matches: 0, wins: 0, dates: new Set<string>() };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      if (m.date) cur.dates.add(m.date);
      heroDetailedData.set(key, cur);
    }
  }
  const heroBreakdownDetailed = [...heroDetailedData.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 15)
    .map(([key, data]) => {
      const [hero, format, eventType] = key.split("|");
      return {
        hero,
        format,
        eventType,
        matches: data.matches,
        wins: data.wins,
        winRate: data.matches > 0 ? Math.round((data.wins / data.matches) * 1000) / 10 : 0,
        dates: [...data.dates].sort(),
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
  let weeklyMatchList = matches.filter((m) => m.date >= weekStart && m.result !== MatchResult.Bye);
  // Guard against bulk-import pollution: if nearly all matches land in "this week"
  // the dates are almost certainly wrong (set to the import date, not the event date)
  if (weeklyMatchList.length > matches.length * 0.8 && matches.length > 30) {
    weeklyMatchList = [];
  }
  const weeklyWins = weeklyMatchList.filter((m) => m.result === MatchResult.Win).length;

  // Weekly hero breakdown (for meta filtering by week)
  const weeklyHeroData = new Map<string, { matches: number; wins: number }>();
  for (const m of weeklyMatchList) {
    if (m.heroPlayed && isValidHeroName(m.heroPlayed)) {
      const et = getEventType(m);
      const key = `${m.heroPlayed}|${m.format}|${et}`;
      const cur = weeklyHeroData.get(key) || { matches: 0, wins: 0 };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      weeklyHeroData.set(key, cur);
    }
  }
  const weeklyHeroBreakdown = [...weeklyHeroData.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 15)
    .map(([key, data]) => {
      const [hero, format, eventType] = key.split("|");
      return { hero, format, eventType, matches: data.matches, wins: data.wins };
    });

  // Monthly stats
  const monthStart = getMonthStart();
  let monthlyMatchList = matches.filter((m) => m.date >= monthStart && m.result !== MatchResult.Bye);
  if (monthlyMatchList.length > matches.length * 0.8 && matches.length > 50) {
    monthlyMatchList = [];
  }
  const monthlyWins = monthlyMatchList.filter((m) => m.result === MatchResult.Win).length;

  // Monthly hero breakdown (for meta filtering by month)
  const monthlyHeroData = new Map<string, { matches: number; wins: number }>();
  for (const m of monthlyMatchList) {
    if (m.heroPlayed && isValidHeroName(m.heroPlayed)) {
      const et = getEventType(m);
      const key = `${m.heroPlayed}|${m.format}|${et}`;
      const cur = monthlyHeroData.get(key) || { matches: 0, wins: 0 };
      cur.matches++;
      if (m.result === MatchResult.Win) cur.wins++;
      monthlyHeroData.set(key, cur);
    }
  }
  const monthlyHeroBreakdown = [...monthlyHeroData.entries()]
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 15)
    .map(([key, data]) => {
      const [hero, format, eventType] = key.split("|");
      return { hero, format, eventType, matches: data.matches, wins: data.wins };
    });

  // Armory stats
  const armoryMatchList = matches.filter((m) => m.eventType === "Armory" && m.result !== MatchResult.Bye);
  const armoryWins = armoryMatchList.filter((m) => m.result === MatchResult.Win).length;
  const armoryEvents = events.filter((e) => e.eventType === "Armory").length;

  // Playoff finishes (top 8+)
  const playoffFinishes = computePlayoffFinishes(events);
  const totalTop8s = playoffFinishes.length;
  const top8sByEventType: Record<string, number> = {};
  for (const f of playoffFinishes) {
    top8sByEventType[f.eventType] = (top8sByEventType[f.eventType] || 0) + 1;
  }
  const totalFinalists = playoffFinishes.filter((f) => f.type === "finalist").length;

  // Top 8 heroes — which hero was played at each playoff finish
  const top8Heroes = playoffFinishes
    .filter((f) => f.hero && isValidHeroName(f.hero))
    .map((f) => ({
      hero: f.hero!,
      eventType: f.eventType,
      placementType: f.type,
      eventDate: f.eventDate,
      format: f.format,
      eventName: f.eventName,
    }));

  // Unique opponents (exclude byes and "Unknown")
  const opponentNames = new Set<string>();
  for (const m of matches) {
    if (m.result === MatchResult.Bye) continue;
    const name = m.opponentName?.trim();
    if (name && name.toLowerCase() !== "unknown" && !/^bye$/i.test(name)) {
      opponentNames.add(name.toLowerCase());
    }
  }

  // Longest loss streak
  const sortedForStreaks = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let longestLossStreak = 0;
  let currentLossStreak = 0;
  for (const m of sortedForStreaks) {
    if (m.result === MatchResult.Bye) continue;
    if (m.result === MatchResult.Loss) {
      currentLossStreak++;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  }

  // Unique venues
  const venueNames = new Set<string>();
  for (const m of matches) {
    const v = m.venue?.trim();
    if (v && v.toLowerCase() !== "unknown") venueNames.add(v.toLowerCase());
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
    hideFromGuests: profile.hideFromGuests ?? false,
    heroBreakdown,
    heroBreakdownDetailed,
    weeklyHeroBreakdown,
    monthlyHeroBreakdown,
    totalTop8s,
    top8sByEventType,
    top8Heroes,
    totalFinalists,
    uniqueOpponents: opponentNames.size,
    longestLossStreak,
    uniqueVenues: venueNames.size,
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
let cachedEntriesAll: LeaderboardEntry[] | null = null;
let cacheTimestampAll = 0;
const CACHE_TTL = 15 * 60_000; // 15 minutes

function sanitizeEntries(docs: LeaderboardEntry[]): LeaderboardEntry[] {
  // Rolling windows: data is stale when the stored window has no overlap
  // with the current window. Weekly covers 7 days, monthly covers 30 days.
  // Stored window: [entry.start, entry.start + period]. No overlap when
  // entry.start + period < currentStart, i.e. entry.start < currentStart - period.
  const weeklyCutoff = localDateStr(14);  // 7-day window written >7 days before current start → no overlap
  const monthlyCutoff = localDateStr(60); // 30-day window written >30 days before current start → no overlap

  return docs.map((entry) => {
    if (!entry.weekStart || entry.weekStart < weeklyCutoff) {
      entry.weeklyMatches = 0;
      entry.weeklyWins = 0;
      entry.weekStart = getWeekStart();
      entry.weeklyHeroBreakdown = [];
    }

    if (!entry.monthStart || entry.monthStart < monthlyCutoff) {
      entry.monthlyMatches = 0;
      entry.monthlyWins = 0;
      entry.monthlyWinRate = 0;
      entry.monthStart = getMonthStart();
      entry.monthlyHeroBreakdown = [];
    }

    // Sanitize bulk-import pollution
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
}

export async function getLeaderboardEntries(includePrivate = false): Promise<LeaderboardEntry[]> {
  const now = Date.now();

  if (includePrivate) {
    if (cachedEntriesAll && now - cacheTimestampAll < CACHE_TTL) {
      return cachedEntriesAll;
    }
    const snapshot = await getDocs(leaderboardCollection());
    cachedEntriesAll = sanitizeEntries(snapshot.docs.map((d) => d.data() as LeaderboardEntry));
    cacheTimestampAll = now;
    return cachedEntriesAll;
  }

  if (cachedEntries && now - cacheTimestamp < CACHE_TTL) {
    return cachedEntries;
  }
  const q = query(leaderboardCollection(), where("isPublic", "==", true));
  const snapshot = await getDocs(q);
  cachedEntries = sanitizeEntries(snapshot.docs.map((d) => d.data() as LeaderboardEntry));
  cacheTimestamp = now;
  return cachedEntries;
}

export function invalidateLeaderboardCache() {
  cachedEntries = null;
  cacheTimestamp = 0;
  cachedEntriesAll = null;
  cacheTimestampAll = 0;
}
