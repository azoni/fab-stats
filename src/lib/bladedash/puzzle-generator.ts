import { dateToSeed, mulberry32, seededPick, seededShuffle } from "@/lib/games/seeded-random";
import { WORD_BANK, type BladeDashWord } from "./word-bank";

export const WORDS_PER_GAME = 8;
export const MAX_HINTS = 3;

export interface DailyWords {
  words: BladeDashWord[];
  scrambled: string[];
}

/** Scramble a word using seeded RNG, ensuring the result differs from the original. */
function scrambleWord(word: string, rng: () => number): string {
  const letters = word.split("");
  if (letters.length <= 1) return word;
  let scrambled: string;
  let attempts = 0;
  do {
    scrambled = seededShuffle(letters, rng).join("");
    attempts++;
  } while (scrambled === word && attempts < 10);
  return scrambled;
}

export function generateDailyWords(dateStr: string): DailyWords {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);

  const easy = WORD_BANK.filter((w) => w.difficulty === 1);
  const medium = WORD_BANK.filter((w) => w.difficulty === 2);
  const hard = WORD_BANK.filter((w) => w.difficulty === 3);

  const pickedEasy = seededPick(easy, 2, rng);
  const pickedMedium = seededPick(medium, 3, rng);
  const pickedHard = seededPick(hard, 3, rng);

  const all = [...pickedEasy, ...pickedMedium, ...pickedHard];
  const words = seededShuffle(all, rng);
  const scrambled = words.map((w) => scrambleWord(w.word, rng));

  return { words, scrambled };
}
