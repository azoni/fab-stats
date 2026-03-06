import { dateToSeed, mulberry32, seededPick, seededShuffle } from "@/lib/games/seeded-random";
import { CARD_BANK, type ShadowStrikeCard } from "./card-bank";

export const GRID_SIZE = 4;
export const TOTAL_PAIRS = 8;

export interface DailyPuzzle {
  cards: ShadowStrikeCard[];
  grid: number[]; // 16-element array of card ids (each appears exactly twice)
}

export function generateDailyPuzzle(dateStr: string): DailyPuzzle {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);

  // Group cards by category
  const byCategory = new Map<string, ShadowStrikeCard[]>();
  for (const card of CARD_BANK) {
    const arr = byCategory.get(card.category) || [];
    arr.push(card);
    byCategory.set(card.category, arr);
  }

  const picked: ShadowStrikeCard[] = [];
  const usedIds = new Set<number>();
  const categories = [...byCategory.keys()];

  // Pick at least 1 from each category for diversity
  for (const cat of categories) {
    if (picked.length >= TOTAL_PAIRS) break;
    const pool = (byCategory.get(cat) || []).filter((c) => !usedIds.has(c.id));
    if (pool.length > 0) {
      const [c] = seededPick(pool, 1, rng);
      picked.push(c);
      usedIds.add(c.id);
    }
  }

  // Fill remaining from any category
  if (picked.length < TOTAL_PAIRS) {
    const remaining = CARD_BANK.filter((c) => !usedIds.has(c.id));
    const extra = seededPick(remaining, TOTAL_PAIRS - picked.length, rng);
    picked.push(...extra);
  }

  // Create pairs (each card ID appears twice)
  const pairIds = picked.flatMap((c) => [c.id, c.id]);

  // Shuffle into grid layout
  const grid = seededShuffle(pairIds, rng);

  return { cards: picked, grid };
}
