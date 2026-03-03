import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  increment,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  FaBdokuResult,
  FaBdokuStats,
  GameState,
  PickData,
  UniquenessData,
} from "./types";

const RESULTS_COL = "fabdoku-results";
const STATS_DOC = "fabdoku-stats";
const STATS_PUBLIC_COL = "fabdokuPlayerStats"; // top-level for public reads
const PICKS_COL = "fabdoku-picks";

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

  // Also write to top-level public collection for cross-user reads
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), updated).catch(() => {});
}

/** Load stats for a user (tries public collection first, falls back to subcollection). */
export async function loadStats(
  uid: string
): Promise<FaBdokuStats | null> {
  let stats: FaBdokuStats | null = null;

  // Try top-level public collection first (works for any viewer)
  try {
    const pubSnap = await getDoc(doc(db, STATS_PUBLIC_COL, uid));
    if (pubSnap.exists()) stats = pubSnap.data() as FaBdokuStats;
  } catch {}

  // Fallback to subcollection (works for owner / admin)
  if (!stats) {
    try {
      const statsRef = doc(db, "users", uid, STATS_DOC, "data");
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        stats = snap.data() as FaBdokuStats;
        // Backfill public collection so other viewers can see stats
        setDoc(doc(db, STATS_PUBLIC_COL, uid), stats).catch(() => {});
      }
    } catch {}
  }

  // Self-heal hasShared: check feed events for existing shares
  if (stats && !stats.hasShared) {
    try {
      const q = query(
        collection(db, "feedEvents"),
        where("userId", "==", uid),
        where("type", "==", "fabdoku"),
        where("subtype", "==", "shared"),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        stats.hasShared = true;
        markShared(uid).catch(() => {});
      }
    } catch {}
  }

  return stats;
}

/** Mark that a user has shared their FaBdoku result. Idempotent. */
export async function markShared(uid: string): Promise<void> {
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  await updateDoc(statsRef, { hasShared: true }).catch(() => {});
  await updateDoc(doc(db, STATS_PUBLIC_COL, uid), { hasShared: true }).catch(() => {});
}

/** Load a specific user's result for a given date. */
export async function loadUserResult(
  uid: string,
  dateStr: string
): Promise<FaBdokuResult | null> {
  const ref = doc(db, RESULTS_COL, `${dateStr}_${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as FaBdokuResult) : null;
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

/** Save per-cell hero picks for uniqueness scoring (atomic increments). */
export async function savePicks(gameState: GameState): Promise<void> {
  const ref = doc(db, PICKS_COL, gameState.date);
  const snap = await getDoc(ref);

  // Build the increment update
  const updates: Record<string, ReturnType<typeof increment>> = {
    totalPlayers: increment(1),
  };

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = gameState.cells[r][c];
      if (cell.heroName && cell.locked) {
        // Firestore dot-notation for nested map fields
        updates[`cells.${r}-${c}.${cell.heroName}`] = increment(1);
      }
    }
  }

  if (snap.exists()) {
    await updateDoc(ref, updates);
  } else {
    // First player: create the doc with initial values
    const initial: Record<string, unknown> = { totalPlayers: 1, cells: {} };
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = gameState.cells[r][c];
        const key = `${r}-${c}`;
        (initial.cells as Record<string, Record<string, number>>)[key] = {};
        if (cell.heroName && cell.locked) {
          (initial.cells as Record<string, Record<string, number>>)[key][
            cell.heroName
          ] = 1;
        }
      }
    }
    await setDoc(ref, initial);
  }
}

/** Load pick data for a given date. */
export async function loadPicks(dateStr: string): Promise<PickData | null> {
  const ref = doc(db, PICKS_COL, dateStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PickData;
}

/** Compute uniqueness data from pick data and a completed game state. */
export function computeUniqueness(
  gameState: GameState,
  pickData: PickData
): UniquenessData {
  const cellPcts: number[][] = [];
  let score = 0;
  let bestPossible = 0;
  const total = pickData.totalPlayers;

  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      const cell = gameState.cells[r][c];
      const key = `${r}-${c}`;
      const cellPicks = pickData.cells[key] ?? {};

      // This player's pick percentage
      let pct = 100; // default for wrong/empty cells
      if (cell.heroName && cell.locked && total > 0) {
        const count = cellPicks[cell.heroName] ?? 0;
        pct = Math.round((count / total) * 100);
      }
      row.push(pct);
      score += pct;

      // Best possible: the minimum % in this cell
      const counts = Object.values(cellPicks);
      if (counts.length > 0 && total > 0) {
        const minCount = Math.min(...counts);
        bestPossible += Math.round((minCount / total) * 100);
      }
    }
    cellPcts.push(row);
  }

  return { cellPcts, score, bestPossible, totalPlayers: total };
}

/** Build a single-player PickData from a completed game state (local fallback). */
export function buildLocalPicks(state: GameState): PickData {
  const cells: Record<string, Record<string, number>> = {};
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.cells[r][c];
      const key = `${r}-${c}`;
      cells[key] = {};
      if (cell.heroName && cell.locked) {
        cells[key][cell.heroName] = 1;
      }
    }
  }
  return { totalPlayers: 1, cells };
}

/** Build PickData from all results for a date (deduped, no auth required). */
export function buildPicksFromResults(results: FaBdokuResult[]): PickData {
  const cells: Record<string, Record<string, number>> = {};
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells[`${r}-${c}`] = {};
    }
  }
  for (const result of results) {
    for (let r = 0; r < result.cells.length; r++) {
      for (let c = 0; c < result.cells[r].length; c++) {
        const cell = result.cells[r][c];
        if (cell.hero) {
          const key = `${r}-${c}`;
          cells[key][cell.hero] = (cells[key][cell.hero] ?? 0) + 1;
        }
      }
    }
  }
  return { totalPlayers: results.length, cells };
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
