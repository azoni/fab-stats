import { allHeroes } from "@/lib/heroes";
import type { HeroInfo } from "@/types";
import { mulberry32, dateToSeed } from "@/lib/games/seeded-random";
import type { HeroGuessClues, ClueResult, NumericClueResult } from "./types";

// Filter to heroes with life + intellect defined (needed for meaningful clues)
const HERO_POOL = allHeroes.filter((h) => h.life != null && h.intellect != null);

const cache = new Map<string, HeroInfo>();

export function generateDailyHero(dateStr: string): HeroInfo {
  const cached = cache.get(dateStr);
  if (cached) return cached;

  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  const index = Math.floor(rng() * HERO_POOL.length);
  const hero = HERO_POOL[index];
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
    formats: compareArrays(guess.legalFormats, answer.legalFormats),
  };
}

export function getHeroPool(): HeroInfo[] {
  return HERO_POOL;
}
