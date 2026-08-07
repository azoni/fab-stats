"use client";
/**
 * The Understack state owner. Wraps the pure engine with persistence:
 * localStorage paints instantly and holds guest saves; Firestore is the
 * cross-device source of truth for signed-in players (higher saveVersion wins).
 * Autosave: character/inventory/stats on every commit point; the active run on
 * floor transitions + a 15s debounce + tab-hide.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGameFx } from "@/components/games/fx";
import { getTodayDateStr } from "@/lib/fabdoku/puzzle-generator";
import { dateToSeed } from "@/lib/games/seeded-random";
import type {
  DelveCharacter,
  DelveStats,
  RunState,
  DelveAction,
  ItemRoll,
  ClassId,
  Slot,
  MaterialId,
} from "@/lib/delve/types";
import { applyAction } from "@/lib/delve/engine";
import { newRun } from "@/lib/delve/generate";
import { effectiveStats, slotOf, ENHANCE_CAP_V01, enhanceMarksCost, ENHANCE_MATERIALS, SALVAGE_YIELD, STASH_CAP, dailyScore, FLOORS_PER_RUN } from "@/lib/delve/balance";
import { CLASS_BY_ID, AFFIX_BY_ID, DEFAULT_ZONE_ID } from "@/lib/delve/content";
import {
  createCharacter,
  emptyStats,
  mergeStatsMax,
  applyRunEnd,
  type RunEndSummary,
  LS_CHARACTER,
  LS_RUN,
  loadLocal,
  saveLocal,
  clearLocal,
} from "@/lib/delve/save";
import { refillKeys, dailyAvailable } from "@/lib/delve/keys";
import {
  loadRemote,
  saveCharacterRemote,
  saveInventoryRemote,
  saveRunRemote,
  clearRunRemote,
  saveStatsRemote,
  type DelveInventoryDoc,
} from "@/lib/delve/firestore";

const LS_STASH = "delve-stash-v1";
const LS_STATS = "delve-stats-v1";
/** Who wrote the local save: a uid, or "guest". A different account's save is
 *  cleared on load, never painted or absorbed (shared-browser protection). */
const LS_OWNER = "delve-owner-v1";

/** Daily Delve seed offset (game-isolation convention: each game gets its own). */
const DAILY_SEED_OFFSET = 7_000_003;

interface StashDoc {
  saveVersion: number;
  items: ItemRoll[];
}

const statsDiffer = (a: DelveStats, b: DelveStats) =>
  (Object.keys(a) as (keyof DelveStats)[]).some((k) => a[k] !== b[k]);

export type DelveView = "loading" | "create" | "camp" | "run" | "summary" | "unreachable";

export function useDelveGame() {
  const { user } = useAuth();
  const { play, haptic } = useGameFx();
  const [character, setCharacter] = useState<DelveCharacter | null>(null);
  const [stash, setStash] = useState<ItemRoll[]>([]);
  const [stats, setStats] = useState<DelveStats>(emptyStats());
  const [run, setRun] = useState<RunState | null>(null);
  const [view, setView] = useState<DelveView>("loading");
  const [summary, setSummary] = useState<RunEndSummary | null>(null);
  const [keysGainedToast, setKeysGainedToast] = useState(0);

  const uidRef = useRef<string | null>(null);
  uidRef.current = user?.uid ?? null;
  const runRef = useRef<RunState | null>(null);
  runRef.current = run;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True once the player has acted this session — the merge must then never
   *  swap the run or stash out from under them. */
  const interactedRef = useRef(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Latest-value refs, declared BEFORE the load effect so its post-await
  // continuation reads current state (e.g. a run that finished during the
  // fetch already bumped saveVersion), not mount-time closures.
  const characterRef = useRef(character);
  characterRef.current = character;
  const stashRef = useRef(stash);
  stashRef.current = stash;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const characterRefValue = () => characterRef.current!;
  const stashRefValue = () => stashRef.current;
  const statsRefValue = () => statsRef.current;

  // ── Load + merge protocol ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 0) Ownership check. A save written by a DIFFERENT signed-in account
      //    (shared browser) is cleared, never painted, absorbed, or pushed up —
      //    that account's copy still lives in its own Firestore docs.
      const currentOwner = user?.uid ?? "guest";
      const localOwner = loadLocal<string>(LS_OWNER) ?? "guest";
      let localChar = loadLocal<DelveCharacter>(LS_CHARACTER);
      let localStash = loadLocal<StashDoc>(LS_STASH);
      let localStats = loadLocal<DelveStats>(LS_STATS);
      let localRun = loadLocal<RunState>(LS_RUN);
      if (localChar && localOwner !== "guest" && localOwner !== currentOwner) {
        for (const key of [LS_CHARACTER, LS_STASH, LS_STATS, LS_RUN, LS_OWNER]) clearLocal(key);
        localChar = null;
        localStash = null;
        localStats = null;
        localRun = null;
        setCharacter(null);
        setStash([]);
        setStats(emptyStats());
        setRun(null);
      }

      // 1) Paint from localStorage instantly.
      if (localChar) {
        const gained = refillKeys(localChar);
        if (gained > 0) setKeysGainedToast(gained);
        setCharacter(localChar);
        setStash(localStash?.items ?? []);
        if (localStats) setStats(localStats);
        if (localRun && !["victory", "dead", "withdrawn"].includes(localRun.phase)) {
          setRun(localRun);
          setView("run");
        } else {
          setView("camp");
        }
      } else {
        setView(user ? "loading" : "create");
      }

      // 2) Signed in → fetch Firestore; higher saveVersion wins.
      if (!user) {
        if (!localChar) setView("create");
        return;
      }
      const remote = await loadRemote(user.uid);
      if (cancelled) return;
      if (!remote.ok) {
        // A failed read is NOT absence. Merging here could clobber a newer
        // remote save, and offering creation would overwrite an existing
        // character on reconnect. Play on local if we have it; else retry.
        if (!localChar) setView("unreachable");
        return;
      }
      // Live state may have moved during the fetch (a run can finish and bump
      // saveVersion) — compare against the refs, falling back to the paint.
      const localVersion = characterRef.current?.saveVersion ?? localChar?.saveVersion ?? 0;
      const remoteVersion = remote.character?.saveVersion ?? 0;
      // Stats are lifetime counters: field-wise max of every copy is always
      // correct, heals divergent multi-device lineages, and keeps our writes
      // inside the rules' forward-only guard.
      const localBase = mergeStatsMax(localStats ?? emptyStats(), statsRef.current);
      const mergedStats = remote.stats ? mergeStatsMax(localBase, remote.stats) : localBase;

      if (remote.character && remoteVersion > localVersion) {
        const merged = remote.character;
        const gained = refillKeys(merged);
        if (gained > 0) setKeysGainedToast(gained);
        setCharacter(merged);
        setStash(remote.inventory?.items ?? []);
        setStats(mergedStats);
        saveLocal(LS_OWNER, user.uid);
        saveLocal(LS_CHARACTER, merged);
        saveLocal(LS_STASH, { saveVersion: merged.saveVersion, items: remote.inventory?.items ?? [] });
        saveLocal(LS_STATS, mergedStats);
        // Never swap the run out from under a player who already acted.
        if (!interactedRef.current) {
          const remoteRun = remote.run;
          if (remoteRun && !["victory", "dead", "withdrawn"].includes(remoteRun.phase)) {
            setRun(remoteRun);
            saveLocal(LS_RUN, remoteRun);
            setView("run");
          } else {
            setView("camp");
          }
        }
      } else if (localChar && remoteVersion < localVersion) {
        // Local is ahead (e.g. guest progress before sign-in) — push up.
        setStats(mergedStats);
        const pushStash = stashRef.current.length > 0 ? stashRef.current : localStash?.items ?? [];
        persistAll(user.uid, characterRef.current ?? localChar, pushStash, mergedStats);
        const activeRun =
          runRef.current ??
          (localRun && !["victory", "dead", "withdrawn"].includes(localRun.phase) ? localRun : null);
        if (activeRun) saveRunRemote(user.uid, activeRun);
      } else if (localChar && remote.character) {
        // Versions equal — reconcile the satellite docs anyway: adopt the
        // max-merged stats, and prefer the remote inventory when a torn local
        // write left the stash stale (its stamp trails the character's).
        setStats(mergedStats);
        saveLocal(LS_STATS, mergedStats);
        saveLocal(LS_OWNER, user.uid);
        if (remote.stats && statsDiffer(mergedStats, remote.stats)) saveStatsRemote(user.uid, mergedStats);
        if (remote.inventory && localStash?.saveVersion !== localChar.saveVersion && !interactedRef.current) {
          setStash(remote.inventory.items ?? []);
          saveLocal(LS_STASH, { saveVersion: localChar.saveVersion, items: remote.inventory.items ?? [] });
        }
      } else if (!localChar && !remote.character) {
        setView("create");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, reloadNonce]);

  // ── Persistence helpers ────────────────────────────────────────────────────
  const persistAll = (uid: string | null, c: DelveCharacter, items: ItemRoll[], s: DelveStats) => {
    saveLocal(LS_OWNER, uid ?? "guest");
    saveLocal(LS_CHARACTER, c);
    saveLocal(LS_STASH, { saveVersion: c.saveVersion, items });
    saveLocal(LS_STATS, s);
    if (uid) {
      saveCharacterRemote(uid, c);
      const inv: DelveInventoryDoc = { v: 1, saveVersion: c.saveVersion, items };
      saveInventoryRemote(uid, inv);
      saveStatsRemote(uid, s);
    }
  };

  const commitCharacter = useCallback((c: DelveCharacter, items: ItemRoll[], s: DelveStats) => {
    interactedRef.current = true;
    c.saveVersion += 1;
    c.updatedAt = new Date().toISOString();
    setCharacter({ ...c });
    setStash([...items]);
    setStats({ ...s });
    persistAll(uidRef.current, c, items, s);
  }, []);

  const persistRun = useCallback((r: RunState | null, immediate = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!r) {
      clearLocal(LS_RUN);
      if (uidRef.current) clearRunRemote(uidRef.current);
      return;
    }
    saveLocal(LS_RUN, r); // localStorage every time — free
    const flush = () => {
      if (uidRef.current && runRef.current) saveRunRemote(uidRef.current, runRef.current);
    };
    if (immediate) flush();
    else debounceRef.current = setTimeout(flush, 15_000);
  }, []);

  // Flush the run on tab hide.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && runRef.current) {
        saveLocal(LS_RUN, runRef.current);
        if (uidRef.current) saveRunRemote(uidRef.current, runRef.current);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const eff = useMemo(() => {
    if (!character) return null;
    return effectiveStats(character, CLASS_BY_ID.get(character.classId)!, AFFIX_BY_ID);
  }, [character]);

  const dailyOpen = character ? dailyAvailable(character) : false;

  // ── Actions ────────────────────────────────────────────────────────────────
  const create = useCallback(
    (name: string, classId: ClassId) => {
      const c = createCharacter(name, classId);
      const s = emptyStats();
      setCharacter(c);
      setStash([]);
      setStats(s);
      persistAll(uidRef.current, c, [], s);
      setView("camp");
    },
    [],
  );

  const startRun = useCallback(
    (opts: { daily: boolean }) => {
      if (!character || !eff) return;
      const c = { ...character, keys: { ...character.keys } };
      let seed: number;
      if (opts.daily) {
        if (!dailyAvailable(c)) return;
        seed = dateToSeed(getTodayDateStr()) + DAILY_SEED_OFFSET;
      } else {
        if (c.keys.n <= 0) return;
        c.keys.n -= 1;
        // Non-daily seed: derived from save state so it stays deterministic-ish
        // but varies per run. (Not security-relevant — solo run.)
        seed = (Math.imul(c.saveVersion * 2654435761 + c.level * 97, 1103515245) ^ Date.now()) | 0;
      }
      const r = newRun(c, eff, DEFAULT_ZONE_ID, seed, opts.daily);
      commitCharacter(c, stash, stats);
      setRun(r);
      persistRun(r, true);
      setSummary(null);
      setView("run");
    },
    [character, eff, stash, stats, commitCharacter, persistRun],
  );

  const dispatch = useCallback(
    (action: DelveAction) => {
      // Compute OUTSIDE the state updater (the engine is pure; side effects in an
      // updater would double-fire under StrictMode). runRef is synced immediately
      // so a same-tick second dispatch chains off the new state.
      const prev = runRef.current;
      if (!prev) return;
      interactedRef.current = true;
      const next = applyAction(prev, action);

      const terminal = ["victory", "dead", "withdrawn"].includes(next.phase);
      if (!terminal) {
        runRef.current = next;
        setRun(next);
        const floorTransition = next.floor !== prev.floor || next.phase !== prev.phase;
        persistRun(next, floorTransition);
        return;
      }

      // Terminal: the run never re-enters state (the summary screen renders from
      // `summary`), so the render-time runRef sync can't resurrect it and the
      // tab-hide flusher has nothing stale to write.
      runRef.current = null;
      setRun(null);

      // Fold the run into the character.
      const c = JSON.parse(JSON.stringify(characterRefValue())) as DelveCharacter;
      const s = { ...statsRefValue() };
      const items = [...stashRefValue()];
      const score = next.isDaily
        ? dailyScore({
            floorsCleared: next.phase === "victory" ? FLOORS_PER_RUN : next.floor - 1,
            kills: next.kills,
            marks: next.marksFound,
            hpRemaining: Math.max(0, next.hp),
            turns: next.turnsTaken,
          })
        : null;
      const sum = applyRunEnd(c, s, next, items, score);
      // The finishing action owns the win/lose sound (FX-layer invariant).
      if (next.phase === "victory") {
        play("win");
        haptic("success");
      } else if (next.phase === "dead") {
        play("lose");
        haptic("error");
      }
      setSummary(sum);
      setCharacter(c);
      setStash(items);
      setStats(s);
      persistAll(uidRef.current, c, items, s);
      persistRun(null);
      setView("summary");
    },
    [persistRun, play, haptic],
  );

  const backToCamp = useCallback(() => {
    setSummary(null);
    setRun(null);
    setView("camp");
  }, []);

  // ── Forge / gear ───────────────────────────────────────────────────────────
  const equip = useCallback(
    (stashIndex: number) => {
      if (!character) return;
      const item = stash[stashIndex];
      if (!item) return;
      const slot = slotOf(item);
      const c = { ...character, equipped: { ...character.equipped } };
      const items = [...stash];
      items.splice(stashIndex, 1);
      const prev = c.equipped[slot];
      if (prev) items.push(prev);
      c.equipped[slot] = item;
      commitCharacter(c, items, stats);
    },
    [character, stash, stats, commitCharacter],
  );

  const unequip = useCallback(
    (slot: Slot) => {
      if (!character) return;
      // A full shelf can't take the item back (STASH_CAP mirrors the rules cap).
      if (stash.length >= STASH_CAP) return;
      const item = character.equipped[slot];
      if (!item) return;
      const c = { ...character, equipped: { ...character.equipped } };
      delete c.equipped[slot];
      commitCharacter(c, [...stash, item], stats);
    },
    [character, stash, stats, commitCharacter],
  );

  const salvage = useCallback(
    (stashIndex: number) => {
      if (!character) return;
      const item = stash[stashIndex];
      if (!item) return;
      const c = { ...character, materials: { ...character.materials } };
      const yields = SALVAGE_YIELD[item.rarity];
      for (const m of Object.keys(yields) as MaterialId[]) c.materials[m] += yields[m] ?? 0;
      const items = [...stash];
      items.splice(stashIndex, 1);
      commitCharacter(c, items, stats);
    },
    [character, stash, stats, commitCharacter],
  );

  const enhance = useCallback(
    (target: { kind: "equipped"; slot: Slot } | { kind: "stash"; index: number }) => {
      if (!character) return;
      const item = target.kind === "equipped" ? character.equipped[target.slot] : stash[target.index];
      if (!item || item.enhance >= ENHANCE_CAP_V01) return;
      const toTier = item.enhance + 1;
      const marks = enhanceMarksCost(toTier);
      const mats = ENHANCE_MATERIALS[toTier] || {};
      if (character.marks < marks) return;
      for (const m of Object.keys(mats) as MaterialId[]) {
        if (character.materials[m] < (mats[m] ?? 0)) return;
      }
      const c = { ...character, materials: { ...character.materials }, equipped: { ...character.equipped } };
      c.marks -= marks;
      for (const m of Object.keys(mats) as MaterialId[]) c.materials[m] -= mats[m] ?? 0;
      const upgraded = { ...item, enhance: toTier };
      let items = stash;
      if (target.kind === "equipped") {
        c.equipped[target.slot] = upgraded;
      } else {
        items = [...stash];
        items[target.index] = upgraded;
      }
      commitCharacter(c, items, stats);
    },
    [character, stash, stats, commitCharacter],
  );

  return {
    view,
    character,
    eff,
    stash,
    stats,
    run,
    summary,
    dailyOpen,
    keysGainedToast,
    clearKeysToast: () => setKeysGainedToast(0),
    retry: () => setReloadNonce((n) => n + 1),
    create,
    startRun,
    dispatch,
    backToCamp,
    equip,
    unequip,
    salvage,
    enhance,
  };
}
