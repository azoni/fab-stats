import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logToEcosystem } from "../mcp-webhook";
import type { ShadowStrikeResult, ShadowStrikeStats } from "./types";

const RESULTS_COL = "shadowstrike-results";
const STATS_DOC = "shadowstrike-stats";
const STATS_PUBLIC_COL = "shadowstrikePlayerStats";

function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultStats(): ShadowStrikeStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: "",
    bestFlips: 0,
    bestTimeMs: 0,
    totalPairsFound: 0,
  };
}

function sanitizeStats(raw: Record<string, unknown>): ShadowStrikeStats {
  return {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    hasShared: raw.hasShared ? true : undefined,
    bestFlips: Number(raw.bestFlips) || 0,
    bestTimeMs: Number(raw.bestTimeMs) || 0,
    totalPairsFound: Number(raw.totalPairsFound) || 0,
  };
}

export async function saveResult(uid: string, result: ShadowStrikeResult): Promise<void> {
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  await setDoc(resultRef, { ...result });

  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const prev = statsSnap.exists() ? sanitizeStats(statsSnap.data()) : defaultStats();

  if (prev.lastPlayedDate === result.date) return;

  const yesterday = getDateOffset(result.date, -1);
  const streakContinues = prev.lastPlayedDate === yesterday && result.won;
  const newStreak = result.won ? (streakContinues ? prev.currentStreak + 1 : 1) : 0;

  const updated: ShadowStrikeStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon: prev.gamesWon + (result.won ? 1 : 0),
    currentStreak: newStreak,
    maxStreak: Math.max(prev.maxStreak, newStreak),
    lastPlayedDate: result.date,
    bestFlips: result.won && (prev.bestFlips === 0 || result.flips < prev.bestFlips) ? result.flips : prev.bestFlips,
    bestTimeMs: result.won && (prev.bestTimeMs === 0 || result.elapsedMs < prev.bestTimeMs) ? result.elapsedMs : prev.bestTimeMs,
    totalPairsFound: prev.totalPairsFound + result.pairsFound,
    ...(prev.hasShared ? { hasShared: true } : {}),
  };

  await setDoc(statsRef, updated);
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), updated).catch(() => {});

  logToEcosystem("minigame_completed", "Shadow Strike completed");
}

export async function loadStats(uid: string): Promise<ShadowStrikeStats | null> {
  let stats: ShadowStrikeStats | null = null;

  try {
    const pubSnap = await getDoc(doc(db, STATS_PUBLIC_COL, uid));
    if (pubSnap.exists()) stats = sanitizeStats(pubSnap.data());
  } catch {}

  if (!stats || !stats.gamesPlayed) {
    try {
      const snap = await getDoc(doc(db, "users", uid, STATS_DOC, "data"));
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
  await setDoc(statsRef, { hasShared: true }, { merge: true }).catch(() => {});
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), { hasShared: true }, { merge: true }).catch(() => {});
}
