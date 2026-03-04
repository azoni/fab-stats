import { dateToSeed, mulberry32, seededPick } from "@/lib/games/seeded-random";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "./question-bank";

export const QUESTIONS_PER_GAME = 5;
export const WIN_THRESHOLD = 4;

/** Pick 5 daily questions with category diversity using seeded RNG. */
export function generateDailyQuestions(dateStr: string): TriviaQuestion[] {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);

  // Group by category
  const byCategory = new Map<string, TriviaQuestion[]>();
  for (const q of TRIVIA_QUESTIONS) {
    const arr = byCategory.get(q.category) || [];
    arr.push(q);
    byCategory.set(q.category, arr);
  }

  const categories = [...byCategory.keys()];
  const picked: TriviaQuestion[] = [];
  const usedIds = new Set<number>();

  // Pick one from each category first (up to 5)
  for (const cat of categories) {
    if (picked.length >= QUESTIONS_PER_GAME) break;
    const pool = (byCategory.get(cat) || []).filter((q) => !usedIds.has(q.id));
    if (pool.length > 0) {
      const [q] = seededPick(pool, 1, rng);
      picked.push(q);
      usedIds.add(q.id);
    }
  }

  // Fill remaining from any category
  if (picked.length < QUESTIONS_PER_GAME) {
    const remaining = TRIVIA_QUESTIONS.filter((q) => !usedIds.has(q.id));
    const extra = seededPick(remaining, QUESTIONS_PER_GAME - picked.length, rng);
    picked.push(...extra);
  }

  // Shuffle the final order
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return picked.slice(0, QUESTIONS_PER_GAME);
}
