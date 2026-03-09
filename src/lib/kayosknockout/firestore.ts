import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logToEcosystem } from "../mcp-webhook";
import type { KnockoutResult, KnockoutStats } from "./types";

const RESULTS_COL = "kayosknockout-results";
const STATS_DOC = "kayosknockout-stats";
const STATS_PUBLIC_COL = "kayosknockoutPlayerStats";

function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultStats(): KnockoutStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: "",
    totalDamageDealt: 0,
    bestDamage: 0,
    totalCombos: 0,
    bestCombo: "",
  };
}

function sanitizeStats(raw: Record<string, unknown>): KnockoutStats {
  return {
    gamesPlayed: Number(raw.gamesPlayed) || 0,
    gamesWon: Number(raw.gamesWon) || 0,
    currentStreak: Number(raw.currentStreak) || 0,
    maxStreak: Number(raw.maxStreak) || 0,
    lastPlayedDate: (raw.lastPlayedDate as string) ?? "",
    hasShared: raw.hasShared ? true : undefined,
    totalDamageDealt: Number(raw.totalDamageDealt) || 0,
    bestDamage: Number(raw.bestDamage) || 0,
    totalCombos: Number(raw.totalCombos) || 0,
    bestCombo: (raw.bestCombo as string) ?? "",
  };
}

export async function saveResult(uid: string, result: KnockoutResult): Promise<void> {
  const resultRef = doc(db, RESULTS_COL, `${result.date}_${uid}`);
  await setDoc(resultRef, { ...result });

  const statsRef = doc(db, "users", uid, STATS_DOC, "data");
  const statsSnap = await getDoc(statsRef);
  const prev = statsSnap.exists() ? sanitizeStats(statsSnap.data()) : defaultStats();

  if (prev.lastPlayedDate === result.date) return;

  const yesterday = getDateOffset(result.date, -1);
  const streakContinues = prev.lastPlayedDate === yesterday && result.won;
  const newStreak = result.won ? (streakContinues ? prev.currentStreak + 1 : 1) : 0;

  // Count named combos in this game
  const namedCombos = result.combos.filter((c) => c !== "").length;

  // Find best combo from this game
  const COMBO_RANK: Record<string, number> = {
    "Pulping": 6,
    "Savage Feast": 5,
    "Crippling Crush": 4,
    "Wild Ride": 3,
    "Pack Hunt": 2,
    "Two Pair": 1,
    "One Pair": 0,
  };
  const PREV_RANK: Record<string, number> = { ...COMBO_RANK };
  const prevBestRank = PREV_RANK[prev.bestCombo] ?? -1;
  let bestCombo = prev.bestCombo;
  for (const c of result.combos) {
    if ((COMBO_RANK[c] ?? -1) > prevBestRank && (COMBO_RANK[c] ?? -1) > (COMBO_RANK[bestCombo] ?? -1)) {
      bestCombo = c;
    }
  }

  const updated: KnockoutStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon: prev.gamesWon + (result.won ? 1 : 0),
    currentStreak: newStreak,
    maxStreak: Math.max(prev.maxStreak, newStreak),
    lastPlayedDate: result.date,
    totalDamageDealt: prev.totalDamageDealt + result.score,
    bestDamage: Math.max(prev.bestDamage, result.score),
    totalCombos: prev.totalCombos + namedCombos,
    bestCombo,
    ...(prev.hasShared ? { hasShared: true } : {}),
  };

  await setDoc(statsRef, updated);
  await setDoc(doc(db, STATS_PUBLIC_COL, uid), updated).catch(() => {});

  logToEcosystem("minigame_completed", "Kayos Knockout completed");
}

export async function loadStats(uid: string): Promise<KnockoutStats | null> {
  let stats: KnockoutStats | null = null;

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
