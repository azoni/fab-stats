import { allCards } from "@/lib/cards";
import type { CardInfo } from "@/types";
import {
  CARD_AXIS_PAIRS,
  CARD_GROUP_MAP,
  type CardCategoryDef,
  type CardCategoryGroup,
} from "./card-categories";
import { mulberry32, dateToSeed, seededShuffle } from "./seeded-random";

export interface CardDailyPuzzle {
  date: string;
  rows: CardCategoryDef[];
  cols: CardCategoryDef[];
  validAnswers: string[][][]; // cardIdentifier strings
}

/** Offset from hero seed so card puzzles are always different. */
const SEED_OFFSET = 1_000_003;

function getValidCards(row: CardCategoryDef, col: CardCategoryDef): CardInfo[] {
  return allCards.filter((c) => row.test(c) && col.test(c));
}

function tryBuildGrid(
  rowPool: CardCategoryDef[],
  colPool: CardCategoryDef[],
  rng: () => number,
  date: string
): CardDailyPuzzle | null {
  const shuffledRows = seededShuffle(rowPool, rng);
  const shuffledCols = seededShuffle(colPool, rng);

  const maxRowCombos = Math.min(shuffledRows.length, 6);
  const maxColCombos = Math.min(shuffledCols.length, 6);

  for (let ri = 0; ri <= maxRowCombos - 3; ri++) {
    for (let ci = 0; ci <= maxColCombos - 3; ci++) {
      const rows = shuffledRows.slice(ri, ri + 3);
      const cols = shuffledCols.slice(ci, ci + 3);

      const validAnswers: string[][][] = [];
      let allValid = true;

      for (let r = 0; r < 3; r++) {
        validAnswers[r] = [];
        for (let c = 0; c < 3; c++) {
          const cards = getValidCards(rows[r], cols[c]);
          if (cards.length === 0) {
            allValid = false;
            break;
          }
          validAnswers[r][c] = cards.map((card) => card.cardIdentifier);
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

const puzzleCache = new Map<string, CardDailyPuzzle>();

function prevDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const py = prev.getUTCFullYear();
  const pm = String(prev.getUTCMonth() + 1).padStart(2, "0");
  const pd = String(prev.getUTCDate()).padStart(2, "0");
  return `${py}-${pm}-${pd}`;
}

function getAxisPairKey(dateStr: string): string | null {
  const seed = (dateToSeed(dateStr) + SEED_OFFSET) | 0;
  const rng = mulberry32(seed);
  const pairs = seededShuffle(CARD_AXIS_PAIRS, rng);
  for (const [rowGroup, colGroup] of pairs) {
    if (CARD_GROUP_MAP[rowGroup].length < 3 || CARD_GROUP_MAP[colGroup].length < 3) continue;
    return `${rowGroup}-${colGroup}`;
  }
  return null;
}

export function generateDailyCardPuzzle(dateStr: string): CardDailyPuzzle {
  const cached = puzzleCache.get(dateStr);
  if (cached) return cached;

  const seed = (dateToSeed(dateStr) + SEED_OFFSET) | 0;
  const rng = mulberry32(seed);

  const yesterdayKey = getAxisPairKey(prevDateStr(dateStr));
  const pairs = seededShuffle(CARD_AXIS_PAIRS, rng);

  // First pass: skip yesterday's axis pair
  for (const [rowGroup, colGroup] of pairs) {
    const rowPool = CARD_GROUP_MAP[rowGroup];
    const colPool = CARD_GROUP_MAP[colGroup];
    if (rowPool.length < 3 || colPool.length < 3) continue;
    if (`${rowGroup}-${colGroup}` === yesterdayKey) continue;

    const puzzle = tryBuildGrid(rowPool, colPool, rng, dateStr);
    if (puzzle) {
      puzzleCache.set(dateStr, puzzle);
      return puzzle;
    }
  }

  // Second pass: allow yesterday's axis pair
  const rng2 = mulberry32(seed + 7);
  const pairs2 = seededShuffle(CARD_AXIS_PAIRS, rng2);
  for (const [rowGroup, colGroup] of pairs2) {
    const rowPool = CARD_GROUP_MAP[rowGroup];
    const colPool = CARD_GROUP_MAP[colGroup];
    if (rowPool.length < 3 || colPool.length < 3) continue;

    const puzzle = tryBuildGrid(rowPool, colPool, rng2, dateStr);
    if (puzzle) {
      puzzleCache.set(dateStr, puzzle);
      return puzzle;
    }
  }

  // Fallback: class × type (guaranteed to work)
  const fallbackRng = mulberry32(seed + 1);
  const rows = seededShuffle(CARD_GROUP_MAP.class, fallbackRng).slice(0, 3);
  const cols = seededShuffle(
    CARD_GROUP_MAP.type.filter((t) => t.id === "type-action" || t.id === "type-equipment" || t.id === "type-instant"),
    fallbackRng
  ).slice(0, 3);

  const validAnswers: string[][][] = [];
  for (let r = 0; r < 3; r++) {
    validAnswers[r] = [];
    for (let c = 0; c < 3; c++) {
      validAnswers[r][c] = getValidCards(rows[r], cols[c]).map((card) => card.cardIdentifier);
    }
  }

  const puzzle: CardDailyPuzzle = { date: dateStr, rows, cols, validAnswers };
  puzzleCache.set(dateStr, puzzle);
  return puzzle;
}
