import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { evaluateAchievements } from "./achievements";
import { loadStats as loadFabdokuStats } from "./fabdoku/firestore";
import { loadCardStats as loadFabdokuCardStats } from "./fabdoku/card-firestore";
import { loadStats as loadCrosswordStats } from "./crossword/firestore";
import { loadStats as loadHeroGuesserStats } from "./heroguesser/firestore";
import { loadStats as loadMatchupManiaStats } from "./matchupmania/firestore";
import { loadStats as loadTriviaStats } from "./trivia/firestore";
import { loadStats as loadTimelineStats } from "./timeline/firestore";
import { loadStats as loadConnectionsStats } from "./connections/firestore";
import { loadStats as loadRampageStats } from "./rhinarsrampage/firestore";
import { loadStats as loadKnockoutStats } from "./kayosknockout/firestore";
import { loadStats as loadBrawlStats } from "./brutebrawl/firestore";
import { loadStats as loadNinjaComboStats } from "./ninjacombo/firestore";
import type { Achievement, OverallStats } from "@/types";

/**
 * Detect newly earned achievements by comparing against stored IDs.
 * First run bootstraps (stores all current IDs, returns []) to prevent flood.
 */
export async function detectNewAchievements(
  userId: string,
  currentAchievements: Achievement[],
): Promise<Achievement[]> {
  const ref = doc(db, "users", userId, "earnedAchievements", "main");
  const snap = await getDoc(ref);

  const currentIds = currentAchievements.map((a) => a.id);

  if (!snap.exists()) {
    // Bootstrap: store all current IDs, return nothing (no flood)
    await setDoc(ref, { ids: currentIds });
    return [];
  }

  const storedIds = new Set<string>((snap.data().ids as string[]) || []);
  const newAchievements = currentAchievements.filter((a) => !storedIds.has(a.id));

  if (newAchievements.length > 0) {
    // Update stored set with new IDs
    const merged = [...storedIds, ...newAchievements.map((a) => a.id)];
    await setDoc(ref, { ids: merged });
  }

  return newAchievements;
}

const EMPTY_OVERALL: OverallStats = {
  totalMatches: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, totalByes: 0, overallWinRate: 0,
  streaks: { currentStreak: null, longestWinStreak: 0, longestLossStreak: 0 },
};

/**
 * Load all game stats and sync earned achievements to Firestore.
 * Called after game completion so game-related achievements are persisted.
 * Only merges new IDs — never removes existing ones.
 */
export async function syncAchievementsAfterGame(userId: string): Promise<void> {
  const ref = doc(db, "users", userId, "earnedAchievements", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) return; // Not bootstrapped yet — import page handles that

  const [fabdoku, fabdokuCard, crossword, heroGuesser, matchupMania, trivia, timeline, connections, rampage, knockout, brawl, ninjaCombo] = await Promise.all([
    loadFabdokuStats(userId).catch(() => null),
    loadFabdokuCardStats(userId).catch(() => null),
    loadCrosswordStats(userId).catch(() => null),
    loadHeroGuesserStats(userId).catch(() => null),
    loadMatchupManiaStats(userId).catch(() => null),
    loadTriviaStats(userId).catch(() => null),
    loadTimelineStats(userId).catch(() => null),
    loadConnectionsStats(userId).catch(() => null),
    loadRampageStats(userId).catch(() => null),
    loadKnockoutStats(userId).catch(() => null),
    loadBrawlStats(userId).catch(() => null),
    loadNinjaComboStats(userId).catch(() => null),
  ]);

  const earned = evaluateAchievements(
    [], EMPTY_OVERALL, [], [],
    undefined,
    fabdoku ?? undefined, heroGuesser ?? undefined, matchupMania ?? undefined,
    trivia ?? undefined, timeline ?? undefined, connections ?? undefined,
    fabdokuCard ?? undefined, rampage ?? undefined, knockout ?? undefined,
    brawl ?? undefined, ninjaCombo ?? undefined, crossword ?? undefined,
  );

  const storedIds = new Set<string>((snap.data().ids as string[]) || []);
  const newIds = earned.map((a) => a.id).filter((id) => !storedIds.has(id));
  if (newIds.length > 0) {
    await setDoc(ref, { ids: [...storedIds, ...newIds] });
  }
}
