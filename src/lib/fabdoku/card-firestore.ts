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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FaBdokuResult, FaBdokuStats, PickData, UniquenessData } from "./types";
import type { CardGameState } from "./card-game-state";

const RESULTS_COL = "fabdoku-card-results";
const STATS_DOC = "fabdoku-card-stats";
const STATS_PUBLIC_COL = "fabdokuCardPlayerStats";
const PICKS_COL = "fabdoku-card-picks";

/** Build a result from completed card game state. */
export function buildCardResult(gameState: CardGameState): FaBdokuResult {
  const correctCount = gameState.cells.flat().filter((c) => c.correct).length;
  return {
    date: gameState.date,
    won: gameState.won,
    guessesUsed: gameState.guessesUsed,
    cells: gameState.cells.flat().map((c) => ({ hero: c.cardId, correct: c.correct })),
    score: correctCount,
    timestamp: Date.now(),
  };
}

/** Save a completed card game result + update streak stats. */
export async function saveCardResult(
  uid: string,
  result: FaBdokuResult
): Promise<void> {
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  await setDoc(resultRef, { uid, ...result });

  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const raw = statsSnap.exists() ? statsSnap.data() : {};
  const prev: FaBdokuStats = {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    ...(raw.hasShared ? { hasShared: true } : {}),
  };

  if (prev.lastPlayedDate === result.date) return;

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
    ...(prev.hasShared ? { hasShared: true } : {}),
  };

  await setDoc(statsRef, updated);
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), updated).catch(() => {});
}

function sanitizeStats(raw: Record<string, unknown>): FaBdokuStats {
  return {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    ...(raw.hasShared ? { hasShared: true } : {}),
  };
}

export async function loadCardStats(uid: string): Promise<FaBdokuStats | null> {
  let stats: FaBdokuStats | null = null;

  try {
    const pubSnap = await getDoc(doc(db, STATS_PUBLIC_COL, uid));
    if (pubSnap.exists()) stats = sanitizeStats(pubSnap.data());
  } catch {}

  if (!stats || !stats.gamesPlayed) {
    try {
      const statsRef = doc(db, "users", uid, STATS_DOC, "data");
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        stats = sanitizeStats(snap.data());
        setDoc(doc(db, STATS_PUBLIC_COL, uid), stats).catch(() => {});
      }
    } catch {}
  }

  return stats;
}

export async function markCardShared(uid: string): Promise<void> {
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  await setDoc(statsRef, { hasShared: true }, { merge: true }).catch(() => {});
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), { hasShared: true }, { merge: true }).catch(() => {});
}

export async function loadCardUserResult(
  uid: string,
  dateStr: string
): Promise<FaBdokuResult | null> {
  const ref = doc(db, RESULTS_COL, `${dateStr}_${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as FaBdokuResult) : null;
}

export async function loadCardTodayResults(
  dateStr: string
): Promise<FaBdokuResult[]> {
  const q = query(
    collection(db, RESULTS_COL),
    where("date", "==", dateStr)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FaBdokuResult);
}

export async function saveCardPicks(gameState: CardGameState): Promise<void> {
  const ref = doc(db, PICKS_COL, gameState.date);
  const snap = await getDoc(ref);

  const updates: Record<string, ReturnType<typeof increment>> = {
    totalPlayers: increment(1),
  };

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = gameState.cells[r][c];
      if (cell.cardId && cell.locked) {
        updates[`cells.${r}-${c}.${cell.cardId}`] = increment(1);
      }
    }
  }

  if (snap.exists()) {
    await updateDoc(ref, updates);
  } else {
    const initial: Record<string, unknown> = { totalPlayers: 1, cells: {} };
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = gameState.cells[r][c];
        const key = `${r}-${c}`;
        (initial.cells as Record<string, Record<string, number>>)[key] = {};
        if (cell.cardId && cell.locked) {
          (initial.cells as Record<string, Record<string, number>>)[key][cell.cardId] = 1;
        }
      }
    }
    await setDoc(ref, initial);
  }
}

export async function loadCardPicks(dateStr: string): Promise<PickData | null> {
  const ref = doc(db, PICKS_COL, dateStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PickData;
}

export function computeCardUniqueness(
  gameState: CardGameState,
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

      let pct = 100;
      if (cell.cardId && cell.locked && total > 0) {
        const count = cellPicks[cell.cardId] ?? 0;
        pct = Math.round((count / total) * 100);
      }
      row.push(pct);
      score += pct;

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

export function buildLocalCardPicks(state: CardGameState): PickData {
  const cells: Record<string, Record<string, number>> = {};
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.cells[r][c];
      const key = `${r}-${c}`;
      cells[key] = {};
      if (cell.cardId && cell.locked) {
        cells[key][cell.cardId] = 1;
      }
    }
  }
  return { totalPlayers: 1, cells };
}

function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
