import { mulberry32, dateToSeed } from "@/lib/games/seeded-random";
import { TAUNTS, type TauntEvent } from "./taunts";

const SEED_OFFSET = 3_000_001;
const DICE_COUNT = 60;

export interface DailyRampage {
  targetHP: number;
  diceSequence: number[];
  taunts: Record<TauntEvent, string>;
}

export function generateDailyRampage(dateStr: string): DailyRampage {
  const seed = dateToSeed(dateStr) + SEED_OFFSET;
  const rng = mulberry32(seed);

  const targetHP = 35 + Math.floor(rng() * 16); // 35-50
  const diceSequence = Array.from({ length: DICE_COUNT }, () => Math.floor(rng() * 6) + 1);

  const taunts = {} as Record<TauntEvent, string>;
  for (const [event, pool] of Object.entries(TAUNTS)) {
    taunts[event as TauntEvent] = pool[Math.floor(rng() * pool.length)];
  }

  return { targetHP, diceSequence, taunts };
}
