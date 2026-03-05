import { mulberry32, dateToSeed, seededShuffle } from "@/lib/fabdoku/seeded-random";
import { WORD_BANK } from "./word-bank";
import { generateGrid, buildPuzzle } from "./grid-generator";
import type { CrosswordPuzzle } from "./types";

const puzzleCache = new Map<string, CrosswordPuzzle>();

export function generateDailyPuzzle(dateStr: string): CrosswordPuzzle {
  const cached = puzzleCache.get(dateStr);
  if (cached) return cached;

  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);

  // Filter to crossword-friendly lengths (3-7 for a compact grid)
  const eligible = WORD_BANK.filter((w) => w.word.length >= 3 && w.word.length <= 7);

  // Ensure category diversity: pick words from each category
  const categories = [...new Set(eligible.map((w) => w.category))];
  const diversePool: typeof eligible = [];
  for (const cat of categories) {
    const catWords = eligible.filter((w) => w.category === cat);
    const picked = seededShuffle(catWords, rng).slice(0, Math.max(4, Math.ceil(catWords.length * 0.5)));
    diversePool.push(...picked);
  }

  // Deduplicate by word
  const seen = new Set<string>();
  const deduped = diversePool.filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });

  const gridState = generateGrid(deduped, rng, 8, 12, 80);

  if (gridState && gridState.placements.length >= 5) {
    const puzzle = buildPuzzle(gridState, dateStr);
    puzzleCache.set(dateStr, puzzle);
    return puzzle;
  }

  // Fallback: try with full pool and larger grid
  const fallbackRng = mulberry32(seed + 1);
  const fallbackGrid = generateGrid(eligible, fallbackRng, 9, 10, 100);

  if (fallbackGrid && fallbackGrid.placements.length >= 4) {
    const puzzle = buildPuzzle(fallbackGrid, dateStr);
    puzzleCache.set(dateStr, puzzle);
    return puzzle;
  }

  // Ultimate fallback: just use first few words in a simple layout
  const ufRng = mulberry32(seed + 2);
  const simpleGrid = generateGrid(eligible, ufRng, 10, 8, 200);
  const puzzle = buildPuzzle(simpleGrid!, dateStr);
  puzzleCache.set(dateStr, puzzle);
  return puzzle;
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
