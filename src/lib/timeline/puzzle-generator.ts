import { TIMELINE_ITEMS } from "./item-bank";
import { dateToSeed, mulberry32, seededPick } from "@/lib/games/seeded-random";
import type { TimelineItem } from "./types";

export const ITEMS_PER_GAME = 5;
export const STARTING_LIVES = 3;

export function generateDailyTimeline(dateStr: string): TimelineItem[] {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  // Pick 5 items with good date spread
  const items = seededPick(TIMELINE_ITEMS, ITEMS_PER_GAME, rng);
  return items;
}
