import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CrosswordResult, CrosswordStats } from "./types";

const RESULTS_COL = "crossword-results";
const STATS_DOC = "crossword-stats";
const STATS_PUBLIC_COL = "crosswordPlayerStats";

export async function saveResult(uid: string, result: CrosswordResult): Promise<void> {
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  const existing = await getDoc(resultRef);
  await setDoc(resultRef, { uid, ...result });

  // Skip stats update if already counted (cross-device)
  if (existing.exists()) return;

  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const prev: CrosswordStats = statsSnap.exists()
    ? (statsSnap.data() as CrosswordStats)
    : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, lastPlayedDate: "" };

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

export async function loadStats(uid: string): Promise<CrosswordStats | null> {
  let stats: CrosswordStats | null = null;

  try {
    const pubSnap = await getDoc(doc(db, STATS_PUBLIC_COL, uid));
    if (pubSnap.exists()) stats = pubSnap.data() as CrosswordStats;
  } catch {}

  // Fallback to subcollection if public doc is missing or incomplete (e.g. only hasShared)
  if (!stats || !stats.gamesPlayed) {
    try {
      const statsRef = doc(db, "users", uid, STATS_DOC, "data");
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        stats = snap.data() as CrosswordStats;
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
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
