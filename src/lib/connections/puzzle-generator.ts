import { CONNECTIONS_PUZZLES } from "./puzzle-bank";
import { dateToSeed, mulberry32, seededShuffle } from "@/lib/games/seeded-random";
import type { ConnectionsPuzzle } from "./types";

export const MAX_MISTAKES = 4;

export function generateDailyPuzzle(dateStr: string): ConnectionsPuzzle {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  // Pick a puzzle based on date (cycle through bank)
  const index = Math.floor(rng() * CONNECTIONS_PUZZLES.length);
  return CONNECTIONS_PUZZLES[index];
}

/** Get all 16 words shuffled for display */
export function getShuffledWords(puzzle: ConnectionsPuzzle, dateStr: string): string[] {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  // Burn the first random (used for puzzle selection)
  rng();
  const allWords = puzzle.groups.flatMap((g) => [...g.words]);
  return seededShuffle(allWords, rng);
}
