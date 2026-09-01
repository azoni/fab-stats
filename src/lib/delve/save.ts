/**
 * Character lifecycle + local persistence.
 *
 * localStorage is the instant-paint cache and the guest save; Firestore (see
 * firestore.ts) is the cross-device source of truth. Higher saveVersion wins
 * on merge, so a lost trailing write self-heals on next load.
 */
import type { DelveCharacter, DelveStats, RunState, ClassId, ItemRoll, MaterialId, Rarity } from "./types";
import { getTodayDateStr } from "@/lib/games/date";
import { xpToNext, LEVEL_CAP_V01, DEATH_MARKS_KEPT_PCT, KEYS_PER_DAY, STASH_CAP, SALVAGE_YIELD } from "./balance";

export const LS_CHARACTER = "delve-character-v1";
export const LS_RUN = "delve-run-v1";
/** Daily-games hub integration: the Daily Delve marks this key completed. */
export const lsDailyKey = (date: string) => `delve-${date}`;

export function createCharacter(name: string, classId: ClassId): DelveCharacter {
  const now = new Date().toISOString();
  return {
    v: 1,
    saveVersion: 1,
    name: name.trim().slice(0, 24) || "Delver",
    classId,
    level: 1,
    xp: 0,
    marks: 0,
    materials: { cinder: 0, gloam: 0, aurum: 0, aether: 0 },
    keys: { n: KEYS_PER_DAY, lastRefill: getTodayDateStr() },
    equipped: {},
    daily: { date: "", done: false, score: 0 },
    cosmetics: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyStats(): DelveStats {
  return {
    totalRuns: 0,
    victories: 0,
    deaths: 0,
    withdrawals: 0,
    bossKills: 0,
    kills: 0,
    deepestFloor: 0,
    marksEarned: 0,
    mythicsFound: 0,
    dailiesDone: 0,
    bestDailyScore: 0,
  };
}

/** Field-wise max of two stats docs. Every DelveStats field is a lifetime
 *  counter or best-score, so max-merge is always correct — it heals divergent
 *  multi-device lineages and keeps writes inside the rules' monotonic guard. */
export function mergeStatsMax(a: DelveStats, b: DelveStats): DelveStats {
  const out = emptyStats();
  for (const k of Object.keys(out) as (keyof DelveStats)[]) {
    out[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  }
  return out;
}

/** Level-ups from banked XP. Returns levels gained (for the celebration). */
export function applyXp(character: DelveCharacter, xp: number): number {
  character.xp += xp;
  let gained = 0;
  while (character.level < LEVEL_CAP_V01 && character.xp >= xpToNext(character.level)) {
    character.xp -= xpToNext(character.level);
    character.level += 1;
    gained += 1;
  }
  // At cap, xp pools (spillover kept for future cap raises).
  return gained;
}

export interface RunEndSummary {
  outcome: "victory" | "dead" | "withdrawn";
  marks: number;
  xp: number;
  levelsGained: number;
  bankedItems: ItemRoll[];
  lostItems: ItemRoll[];
  materials: Record<MaterialId, number>;
  kills: number;
  dailyScore: number | null;
}

/**
 * Fold a finished run into the character (pure mutation of the passed copies —
 * the hook owns cloning + persisting). Death keeps XP/materials and 60% of
 * Marks; only banked ends keep the satchel.
 */
export function applyRunEnd(
  character: DelveCharacter,
  stats: DelveStats,
  run: RunState,
  stash: ItemRoll[],
  dailyScore: number | null,
): RunEndSummary {
  const outcome = run.phase === "victory" ? "victory" : run.phase === "withdrawn" ? "withdrawn" : "dead";
  const marks =
    outcome === "dead" ? Math.floor((run.marksFound * DEATH_MARKS_KEPT_PCT) / 100) : run.marksFound;
  const banked = outcome === "dead" ? [] : run.satchel;
  const lost = outcome === "dead" ? run.lostSatchel ?? [] : [];

  character.marks += marks;
  for (const m of Object.keys(run.materialsFound) as MaterialId[]) {
    character.materials[m] += run.materialsFound[m];
  }
  const levelsGained = applyXp(character, run.xpEarned);
  stash.push(...banked);
  // The shelf holds STASH_CAP (the Firestore doc cap) — overflow melts to
  // salvage, cheapest rarity first, so the synced inventory is never rejected.
  if (stash.length > STASH_CAP) {
    const order: Rarity[] = ["worn", "tempered", "ordained", "mythic"];
    while (stash.length > STASH_CAP) {
      let idx = 0;
      for (const r of order) {
        const i = stash.findIndex((it) => it.rarity === r);
        if (i !== -1) {
          idx = i;
          break;
        }
      }
      const [melted] = stash.splice(idx, 1);
      const yields = SALVAGE_YIELD[melted.rarity];
      for (const m of Object.keys(yields) as MaterialId[]) character.materials[m] += yields[m] ?? 0;
    }
  }

  stats.totalRuns += 1;
  stats.kills += run.kills;
  stats.marksEarned += marks;
  stats.deepestFloor = Math.max(stats.deepestFloor, run.floor);
  stats.mythicsFound += banked.filter((i) => i.rarity === "mythic").length;
  if (outcome === "victory") {
    stats.victories += 1;
    stats.bossKills += 1;
  } else if (outcome === "dead") stats.deaths += 1;
  else stats.withdrawals += 1;

  if (run.isDaily && dailyScore !== null) {
    // Credit the day whose seed was actually run — a daily started at 23:50 UTC
    // and finished after midnight belongs to the day it started, and must not
    // lock out the new day's puzzle. startedAt is ISO UTC, so slice = date.
    const seedDate = run.startedAt.slice(0, 10) || getTodayDateStr();
    character.daily = { date: seedDate, done: true, score: dailyScore };
    stats.dailiesDone += 1;
    stats.bestDailyScore = Math.max(stats.bestDailyScore, dailyScore);
    // Hub streak integration — the Daily Delve counts as that day's daily game.
    try {
      localStorage.setItem(lsDailyKey(seedDate), JSON.stringify({ completed: true, score: dailyScore }));
    } catch {
      /* storage unavailable */
    }
  }

  character.updatedAt = new Date().toISOString();
  character.saveVersion += 1;

  return {
    outcome,
    marks,
    xp: run.xpEarned,
    levelsGained,
    bankedItems: banked,
    lostItems: lost,
    materials: run.materialsFound,
    kills: run.kills,
    dailyScore,
  };
}

// ── localStorage ──────────────────────────────────────────────────────────────

export function loadLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/private mode — Firestore still has it for signed-in users */
  }
}

export function clearLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
