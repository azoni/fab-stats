import { frozenHeroesFor } from "@/lib/games/frozen-pool";
import { getTodayDateStr } from "@/lib/fabdoku/puzzle-generator";
import type { HeroInfo } from "@/types";
import { mulberry32, dateToSeed } from "@/lib/games/seeded-random";
import type { HeroGuessClues, ClueResult, NumericClueResult } from "./types";

// Pull from the FROZEN pool for the puzzle's date, not the live hero list — the daily
// answer is chosen by indexing into this pool, so its size/order must not shift when the
// card package adds heroes (that would silently rewrite every past day's answer). The pool
// is date-gated: new heroes only appear from the cutover onward. See lib/games/frozen-pool.ts.
// Filter to heroes with life + intellect defined (needed for meaningful clues).
const poolCache = new Map<HeroInfo[], { pool: HeroInfo[]; byName: Map<string, HeroInfo> }>();
function heroPoolFor(dateStr: string) {
  const frozen = frozenHeroesFor(dateStr);
  let entry = poolCache.get(frozen);
  if (!entry) {
    const pool = frozen.filter((h) => h.life != null && h.intellect != null);
    entry = { pool, byName: new Map(pool.map((h) => [h.name, h])) };
    poolCache.set(frozen, entry);
  }
  return entry;
}

const cache = new Map<string, HeroInfo>();

export function generateDailyHero(dateStr: string): HeroInfo {
  const cached = cache.get(dateStr);
  if (cached) return cached;

  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  const pool = heroPoolFor(dateStr).pool;
  const index = Math.floor(rng() * pool.length);
  const hero = pool[index];
  cache.set(dateStr, hero);
  return hero;
}

function compareArrays(a: string[], b: string[]): ClueResult {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  // Check exact match (same elements)
  if (setA.size === setB.size && [...setA].every((x) => setB.has(x))) return "correct";
  // Check partial overlap
  if ([...setA].some((x) => setB.has(x))) return "partial";
  return "wrong";
}

function compareNumeric(guess: number, answer: number, threshold: number): NumericClueResult {
  if (guess === answer) return "correct";
  if (Math.abs(guess - answer) <= threshold) return "close";
  return "wrong";
}

// Only compare the main constructed formats that are displayed to the user
const MAIN_FORMATS = new Set(["classic constructed", "blitz", "living legend"]);
function mainFormats(formats: string[]): string[] {
  const f = formats.map((s) => s.toLowerCase()).filter((s) => MAIN_FORMATS.has(s));
  return f.length > 0 ? f : ["none"];
}

export function compareHeroes(guess: HeroInfo, answer: HeroInfo): HeroGuessClues {
  return {
    class: compareArrays(guess.classes, answer.classes),
    talent: compareArrays(
      guess.talents.length > 0 ? guess.talents : ["None"],
      answer.talents.length > 0 ? answer.talents : ["None"]
    ),
    age: guess.young === answer.young ? "correct" : "wrong",
    life: compareNumeric(guess.life ?? 0, answer.life ?? 0, 5),
    intellect: compareNumeric(guess.intellect ?? 0, answer.intellect ?? 0, 1),
    formats: compareArrays(mainFormats(guess.legalFormats), mainFormats(answer.legalFormats)),
  };
}

/** The guessable pool for a puzzle date (defaults to today's puzzle). */
export function getHeroPool(dateStr: string = getTodayDateStr()): HeroInfo[] {
  return heroPoolFor(dateStr).pool;
}

/** Resolve a guessed hero name against the FROZEN pool so a guess is compared with the
 *  same (frozen) attributes as the answer — otherwise a hero whose legal formats the card
 *  package later changed would score its format clue inconsistently. */
export function getPoolHero(name: string, dateStr: string = getTodayDateStr()): HeroInfo | undefined {
  return heroPoolFor(dateStr).byName.get(name);
}
