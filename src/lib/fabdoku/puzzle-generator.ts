import { allHeroes } from "@/lib/heroes";
import type { HeroInfo } from "@/types";
import {
  CLASS_CATEGORIES,
  TALENT_CATEGORIES,
  AGE_CATEGORIES,
  STAT_CATEGORIES,
  FORMAT_CATEGORIES,
  type CategoryGroup,
} from "./categories";
import type { CategoryDef, DailyPuzzle } from "./types";
import { mulberry32, dateToSeed, seededShuffle } from "./seeded-random";

/**
 * Valid axis pair configurations: [rowGroup, colGroup].
 * Rows and columns must use different category groups so that
 * hero intersections make sense (a hero can satisfy one class
 * AND one talent, but not two different classes simultaneously).
 */
const AXIS_PAIRS: [CategoryGroup, CategoryGroup][] = [
  ["class", "talent"],
  ["class", "age"],
  ["class", "stat"],
  ["class", "format"],
  ["talent", "age"],
  ["talent", "stat"],
  ["talent", "format"],
  ["age", "class"],
  ["age", "talent"],
  ["stat", "class"],
  ["stat", "talent"],
  ["format", "class"],
  ["format", "talent"],
];

const GROUP_MAP: Record<CategoryGroup, CategoryDef[]> = {
  class: CLASS_CATEGORIES,
  talent: TALENT_CATEGORIES,
  age: AGE_CATEGORIES,
  stat: STAT_CATEGORIES,
  format: FORMAT_CATEGORIES,
};

/** Return heroes matching both row and column category predicates. */
function getValidHeroes(
  row: CategoryDef,
  col: CategoryDef
): HeroInfo[] {
  return allHeroes.filter((h) => row.test(h) && col.test(h));
}

/**
 * Try to build a valid 3×3 grid from the given category pools.
 * Returns the puzzle if every cell has ≥1 valid hero, or null.
 */
function tryBuildGrid(
  rowPool: CategoryDef[],
  colPool: CategoryDef[],
  rng: () => number,
  date: string
): DailyPuzzle | null {
  const shuffledRows = seededShuffle(rowPool, rng);
  const shuffledCols = seededShuffle(colPool, rng);

  // Try all combinations of 3 rows from shuffledRows and 3 cols from shuffledCols
  const maxRowCombos = Math.min(shuffledRows.length, 6);
  const maxColCombos = Math.min(shuffledCols.length, 6);

  for (let ri = 0; ri <= maxRowCombos - 3; ri++) {
    for (let ci = 0; ci <= maxColCombos - 3; ci++) {
      const rows = shuffledRows.slice(ri, ri + 3);
      const cols = shuffledCols.slice(ci, ci + 3);

      // Validate all 9 cells
      const validAnswers: string[][][] = [];
      let allValid = true;

      for (let r = 0; r < 3; r++) {
        validAnswers[r] = [];
        for (let c = 0; c < 3; c++) {
          const heroes = getValidHeroes(rows[r], cols[c]);
          if (heroes.length === 0) {
            allValid = false;
            break;
          }
          validAnswers[r][c] = heroes.map((h) => h.name);
        }
        if (!allValid) break;
      }

      if (allValid) {
        return { date, rows, cols, validAnswers };
      }
    }
  }

  return null;
}

/** Cache: one puzzle per date string. */
const puzzleCache = new Map<string, DailyPuzzle>();

/**
 * Generate the daily puzzle for a given date.
 * Deterministic: same date always produces the same puzzle.
 */
export function generateDailyPuzzle(dateStr: string): DailyPuzzle {
  const cached = puzzleCache.get(dateStr);
  if (cached) return cached;

  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);

  // Shuffle axis pairs and try each until we find a valid grid
  const pairs = seededShuffle(AXIS_PAIRS, rng);

  for (const [rowGroup, colGroup] of pairs) {
    const rowPool = GROUP_MAP[rowGroup];
    const colPool = GROUP_MAP[colGroup];

    // Need at least 3 categories in each pool
    if (rowPool.length < 3 || colPool.length < 3) continue;

    const puzzle = tryBuildGrid(rowPool, colPool, rng, dateStr);
    if (puzzle) {
      puzzleCache.set(dateStr, puzzle);
      return puzzle;
    }
  }

  // Fallback: should never happen with our category data, but just in case
  // use class x age which is guaranteed to work (all classes have young+adult)
  const fallbackRng = mulberry32(seed + 1);
  const rows = seededShuffle(CLASS_CATEGORIES, fallbackRng).slice(0, 3);
  const cols = [
    AGE_CATEGORIES[0],
    AGE_CATEGORIES[1],
    STAT_CATEGORIES[0], // Life ≤ 20
  ];

  const validAnswers: string[][][] = [];
  for (let r = 0; r < 3; r++) {
    validAnswers[r] = [];
    for (let c = 0; c < 3; c++) {
      validAnswers[r][c] = getValidHeroes(rows[r], cols[c]).map((h) => h.name);
    }
  }

  const puzzle: DailyPuzzle = { date: dateStr, rows, cols, validAnswers };
  puzzleCache.set(dateStr, puzzle);
  return puzzle;
}

/** Get today's date string in YYYY-MM-DD format (local timezone). */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
