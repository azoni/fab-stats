/**
 * Firestore persistence for The Understack. Conventions follow the other game
 * libs (soft-fail catches; the game never blocks on a failed write — localStorage
 * still has the save and the next successful write catches up).
 *
 * Docs (rules: owner read/write with validators):
 *   users/{uid}/delve/character
 *   users/{uid}/delve/inventory   { v, saveVersion, items: ItemRoll[] }
 *   users/{uid}/delve/run         (active run snapshot; deleted when none)
 *   users/{uid}/delve-stats/summary
 */
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DelveCharacter, DelveStats, RunState, ItemRoll } from "./types";

export interface DelveInventoryDoc {
  v: 1;
  saveVersion: number;
  items: ItemRoll[];
}

const charRef = (uid: string) => doc(db, "users", uid, "delve", "character");
const invRef = (uid: string) => doc(db, "users", uid, "delve", "inventory");
const runRef = (uid: string) => doc(db, "users", uid, "delve", "run");
const statsRef = (uid: string) => doc(db, "users", uid, "delve-stats", "summary");

export interface RemoteSave {
  /** False when ANY read rejected (offline, auth blip). A null doc is only
   *  trustworthy as "doesn't exist" when ok is true — callers must never
   *  merge, push up, or offer character creation off a failed read. */
  ok: boolean;
  character: DelveCharacter | null;
  inventory: DelveInventoryDoc | null;
  run: RunState | null;
  stats: DelveStats | null;
}

export async function loadRemote(uid: string): Promise<RemoteSave> {
  const settled = await Promise.allSettled([
    getDoc(charRef(uid)),
    getDoc(invRef(uid)),
    getDoc(runRef(uid)),
    getDoc(statsRef(uid)),
  ]);
  const [c, i, r, s] = settled.map((res) => (res.status === "fulfilled" ? res.value : null));
  return {
    ok: settled.every((res) => res.status === "fulfilled"),
    character: c?.exists() ? (c.data() as DelveCharacter) : null,
    inventory: i?.exists() ? (i.data() as DelveInventoryDoc) : null,
    run: r?.exists() ? (r.data() as RunState) : null,
    stats: s?.exists() ? (s.data() as DelveStats) : null,
  };
}

export async function saveCharacterRemote(uid: string, character: DelveCharacter): Promise<void> {
  try {
    await setDoc(charRef(uid), character);
  } catch {
    /* soft-fail: local save still holds; next write catches up */
  }
}

export async function saveInventoryRemote(uid: string, inv: DelveInventoryDoc): Promise<void> {
  try {
    await setDoc(invRef(uid), inv);
  } catch {
    /* soft-fail */
  }
}

export async function saveRunRemote(uid: string, run: RunState): Promise<void> {
  try {
    await setDoc(runRef(uid), run);
  } catch {
    /* soft-fail */
  }
}

export async function clearRunRemote(uid: string): Promise<void> {
  try {
    await deleteDoc(runRef(uid));
  } catch {
    /* soft-fail */
  }
}

export async function saveStatsRemote(uid: string, stats: DelveStats): Promise<void> {
  try {
    await setDoc(statsRef(uid), stats);
  } catch {
    /* soft-fail */
  }
}
