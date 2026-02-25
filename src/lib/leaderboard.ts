import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { computeOverallStats, computeEventStats, computeOpponentStats } from "./stats";
import type { LeaderboardEntry, MatchRecord, UserProfile } from "@/types";
import { MatchResult } from "@/types";

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
    } else {
      currentRatedStreak = 0;
    }
  }

  // Event wins (events where wins > losses)
  const eventWins = events.filter((e) => e.wins > e.losses).length;

  // Hero diversity
  const heroCount = new Map<string, number>();
  for (const m of matches) {
    if (m.heroPlayed && m.heroPlayed !== "Unknown") {
      heroCount.set(m.heroPlayed, (heroCount.get(m.heroPlayed) || 0) + 1);
    }
  }
  const heroEntries = [...heroCount.entries()].sort((a, b) => b[1] - a[1]);
  const topHero = heroEntries[0]?.[0] || "Unknown";
  const topHeroMatches = heroEntries[0]?.[1] || 0;

  // Nemesis — opponent with worst win rate (min 3 matches)
  const oppStats = computeOpponentStats(matches).filter(
    (o) => o.totalMatches >= 3 && o.opponentName !== "Unknown"
  );
  const nemesisOpp = oppStats.length > 0
    ? oppStats.reduce((worst, o) => (o.winRate < worst.winRate ? o : worst))
    : null;

  // Weekly stats
  const weekStart = getWeekStart();
  const weeklyMatches = matches.filter((m) => m.date >= weekStart);
  const weeklyWins = weeklyMatches.filter((m) => m.result === MatchResult.Win).length;

  // Armory stats
  const armoryMatchList = matches.filter((m) => m.eventType === "Armory");
  const armoryWins = armoryMatchList.filter((m) => m.result === MatchResult.Win).length;
  const armoryEvents = events.filter((e) => e.eventType === "Armory").length;

  const entry: Omit<LeaderboardEntry, never> = {
    userId: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    isPublic: profile.isPublic,
    totalMatches: overall.totalMatches,
    totalWins: overall.totalWins,
    totalLosses: overall.totalLosses,
    totalDraws: overall.totalDraws,
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
    uniqueHeroes: heroCount.size,
    topHero,
    topHeroMatches,
    nemesis: nemesisOpp?.opponentName,
    nemesisWinRate: nemesisOpp?.winRate,
    nemesisMatches: nemesisOpp?.totalMatches,
    weeklyMatches: weeklyMatches.length,
    weeklyWins,
    weekStart,
    earnings: profile.earnings,
    armoryMatches: armoryMatchList.length,
    armoryWins,
    armoryWinRate: armoryMatchList.length > 0 ? (armoryWins / armoryMatchList.length) * 100 : 0,
    armoryEvents,
    showNameOnProfiles: profile.showNameOnProfiles ?? false,
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
const CACHE_TTL = 60_000; // 60 seconds

export async function getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (cachedEntries && now - cacheTimestamp < CACHE_TTL) {
    return cachedEntries;
  }
  const q = query(leaderboardCollection(), where("isPublic", "==", true));
  const snapshot = await getDocs(q);
  cachedEntries = snapshot.docs.map((d) => d.data() as LeaderboardEntry);
  cacheTimestamp = now;
  return cachedEntries;
}

export function invalidateLeaderboardCache() {
  cachedEntries = null;
  cacheTimestamp = 0;
}
