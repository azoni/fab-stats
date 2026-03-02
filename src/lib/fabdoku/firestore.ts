import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FaBdokuResult, FaBdokuStats, GameState } from "./types";

const RESULTS_COL = "fabdoku-results";
const STATS_DOC = "fabdoku-stats";

/** Build a FaBdokuResult from completed game state. */
export function buildResult(gameState: GameState): FaBdokuResult {
  const correctCount = gameState.cells.flat().filter((c) => c.correct).length;
  return {
    date: gameState.date,
    won: gameState.won,
    guessesUsed: gameState.guessesUsed,
    cells: gameState.cells.map((row) =>
      row.map((c) => ({ hero: c.heroName, correct: c.correct }))
    ),
    score: correctCount,
    timestamp: Date.now(),
  };
}

/** Save a completed game result + update streak stats. */
export async function saveResult(
  uid: string,
  result: FaBdokuResult
): Promise<void> {
  // Save result
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  await setDoc(resultRef, { uid, ...result });

  // Update stats
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const prev: FaBdokuStats = statsSnap.exists()
    ? (statsSnap.data() as FaBdokuStats)
    : {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastPlayedDate: "",
      };

  // Calculate streak
  const yesterday = getDateOffset(result.date, -1);
  const streakContinues = prev.lastPlayedDate === yesterday && result.won;
  const newStreak = result.won
    ? streakContinues
      ? prev.currentStreak + 1
      : 1
    : 0;

  const updated: FaBdokuStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon: prev.gamesWon + (result.won ? 1 : 0),
    currentStreak: newStreak,
    maxStreak: Math.max(prev.maxStreak, newStreak),
    lastPlayedDate: result.date,
  };

  await setDoc(statsRef, updated);
}

/** Load stats for a user. */
export async function loadStats(
  uid: string
): Promise<FaBdokuStats | null> {
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const snap = await getDoc(statsRef);
  return snap.exists() ? (snap.data() as FaBdokuStats) : null;
}

/** Load all results for a given date (for uniqueness scoring). */
export async function loadTodayResults(
  dateStr: string
): Promise<FaBdokuResult[]> {
  const q = query(
    collection(db, RESULTS_COL),
    where("date", "==", dateStr)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FaBdokuResult);
}

/** Helper: offset a YYYY-MM-DD date string by N days. */
function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
