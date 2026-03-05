import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CrosswordResult, CrosswordStats } from "./types";

const RESULTS_COL = "crossword-results";
const STATS_DOC = "crossword-stats";
const STATS_PUBLIC_COL = "crosswordPlayerStats";

export async function saveResult(uid: string, result: CrosswordResult): Promise<void> {
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  await setDoc(resultRef, { uid, ...result });

  // Update stats — check lastPlayedDate to avoid double-counting
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const raw = statsSnap.exists() ? statsSnap.data() : {};
  const prev: CrosswordStats = {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    ...(raw.bestSolveTime != null && !isNaN(Number(raw.bestSolveTime)) ? { bestSolveTime: Number(raw.bestSolveTime) } : {}),
    ...(raw.hasShared ? { hasShared: true } : {}),
  };

  // Skip stats update if this date was already counted
  if (prev.lastPlayedDate === result.date) return;

  const yesterday = getDateOffset(result.date, -1);
  const streakContinues = prev.lastPlayedDate === yesterday && result.won;
  const newStreak = result.won ? (streakContinues ? prev.currentStreak + 1 : 1) : 0;

  const updated: CrosswordStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon: prev.gamesWon + (result.won ? 1 : 0),
    currentStreak: newStreak,
    maxStreak: Math.max(prev.maxStreak, newStreak),
    lastPlayedDate: result.date,
    bestSolveTime: result.won
      ? Math.min(prev.bestSolveTime ?? Infinity, result.elapsedSeconds) || result.elapsedSeconds
      : prev.bestSolveTime,
    ...(prev.hasShared ? { hasShared: true } : {}),
  };

  await setDoc(statsRef, updated);
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), updated).catch(() => {});
}

/** Sanitize stats to fix NaN values from corrupted docs. */
function sanitizeStats(raw: Record<string, unknown>): CrosswordStats {
  return {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    ...(raw.bestSolveTime != null && !isNaN(Number(raw.bestSolveTime)) ? { bestSolveTime: Number(raw.bestSolveTime) } : {}),
    ...(raw.hasShared ? { hasShared: true } : {}),
  };
}

export async function loadStats(uid: string): Promise<CrosswordStats | null> {
  let stats: CrosswordStats | null = null;

  try {
    const pubSnap = await getDoc(doc(db, STATS_PUBLIC_COL, uid));
    if (pubSnap.exists()) stats = sanitizeStats(pubSnap.data());
  } catch {}

  // Fallback to subcollection if public doc is missing or incomplete (e.g. only hasShared)
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

export async function markShared(uid: string): Promise<void> {
  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  await setDoc(statsRef, { hasShared: true }, { merge: true }).catch((e) => console.error("markShared subcol:", e));
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), { hasShared: true }, { merge: true }).catch((e) => console.error("markShared public:", e));
}

function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
