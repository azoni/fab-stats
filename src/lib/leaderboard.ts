import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { computeOverallStats, computeEventStats, computeOpponentStats } from "./stats";
import type { LeaderboardEntry, MatchRecord, UserProfile } from "@/types";
import { MatchResult } from "@/types";

function leaderboardCollection() {
  return collection(db, "leaderboard");
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
    updatedAt: new Date().toISOString(),
  };

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry)) {
    if (v !== undefined) clean[k] = v;
  }
  if (profile.photoUrl) clean.photoUrl = profile.photoUrl;

  await setDoc(doc(leaderboardCollection(), profile.uid), clean);
}

export function subscribeLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void
): Unsubscribe {
  const q = query(leaderboardCollection());
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map((d) => d.data() as LeaderboardEntry)
      .filter((e) => e.isPublic);
    callback(entries);
  });
}
