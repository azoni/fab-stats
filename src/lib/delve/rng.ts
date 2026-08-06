/**
 * Cursor-tracked deterministic RNG for the delve engine.
 *
 * All randomness flows from one seed via mulberry32 (the canonical PRNG for
 * new games — NEVER fabdoku's frozen hash). The engine stores only
 * (seed, cursor) in the run state; resuming re-seeds and fast-forwards the
 * cursor, which keeps saves tiny and every run fully replayable from
 * {seed, actionLog} — the future server-validation hook.
 */
import { mulberry32 } from "@/lib/games/seeded-random";

export interface Rng {
  /** Uniform [0,1). Advances the cursor. */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** True with probability pct/100. */
  chance(pct: number): boolean;
  /** Weighted pick: entries with higher weight win proportionally. */
  weighted<T>(entries: { value: T; weight: number }[]): T;
  cursor(): number;
}

export function makeRng(seed: number, cursor = 0): Rng {
  const base = mulberry32(seed);
  let n = 0;
  // Fast-forward to the saved cursor.
  while (n < cursor) {
    base();
    n++;
  }
  const next = () => {
    n++;
    return base();
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (pct) => next() * 100 < pct,
    weighted: (entries) => {
      const total = entries.reduce((s, e) => s + e.weight, 0);
      let roll = next() * total;
      for (const e of entries) {
        roll -= e.weight;
        if (roll <= 0) return e.value;
      }
      return entries[entries.length - 1].value;
    },
    cursor: () => n,
  };
}
