/** Mulberry32 — a fast, simple 32-bit seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a date string like "2026-03-02" to a numeric seed.
 * Uses Fibonacci hashing to spread consecutive dates far apart,
 * so back-to-back days produce very different puzzles.
 */
export function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Combine date parts with primes so sequential days are far apart
  const raw = y * 367 + m * 31 + d;
  // Fibonacci hashing (Knuth multiplicative) spreads sequential inputs
  return Math.imul(raw, 2654435761) | 0;
}

/** Fisher-Yates shuffle using a seeded RNG. Returns a new array. */
export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pick n random items from an array using a seeded RNG. */
export function seededPick<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  return seededShuffle(arr, rng).slice(0, n);
}
