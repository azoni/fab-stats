import { dateToSeed, mulberry32, seededShuffle } from "@/lib/games/seeded-random";
import type { CommunityMatchupCell } from "@/lib/hero-matchups";
import type { MatchupRound } from "./types";

const ROUNDS = 10;
const MIN_GAMES = 20;
const MIN_DIFF = 3; // minimum win rate difference (%)

// Non-hero names that can appear in matchup data
const EXCLUDED_NAMES = new Set(["not rated", "rated", "unrated", "competitive", "casual"]);
function isRealHero(name: string): boolean {
  return !EXCLUDED_NAMES.has(name.toLowerCase());
}

export function generateDailyMatchups(dateStr: string, matchupData: CommunityMatchupCell[]): MatchupRound[] {
  // Filter to pairs with enough games and meaningful difference
  const eligible = matchupData.filter((m) => {
    if (!isRealHero(m.hero1) || !isRealHero(m.hero2)) return false;
    if (m.total < MIN_GAMES) return false;
    const h1WR = (m.hero1Wins / m.total) * 100;
    const h2WR = (m.hero2Wins / m.total) * 100;
    return Math.abs(h1WR - h2WR) >= MIN_DIFF;
  });

  if (eligible.length < ROUNDS) {
    // Fallback: use whatever we have, lower threshold
    const fallback = matchupData.filter((m) => m.total >= 5 && isRealHero(m.hero1) && isRealHero(m.hero2));
    const cleaned = matchupData.filter((m) => isRealHero(m.hero1) && isRealHero(m.hero2));
    return buildRounds(dateStr, fallback.length >= ROUNDS ? fallback : cleaned);
  }

  return buildRounds(dateStr, eligible);
}

function buildRounds(dateStr: string, pool: CommunityMatchupCell[]): MatchupRound[] {
  const seed = dateToSeed(dateStr);
  const rng = mulberry32(seed);
  const shuffled = seededShuffle(pool, rng);

  // Pick ROUNDS unique pairs, avoiding hero repetition when possible
  const usedHeroes = new Set<string>();
  const picked: CommunityMatchupCell[] = [];

  for (const cell of shuffled) {
    if (picked.length >= ROUNDS) break;
    // Try to avoid repeating heroes in different rounds
    if (picked.length < ROUNDS - 2 && (usedHeroes.has(cell.hero1) || usedHeroes.has(cell.hero2))) continue;
    picked.push(cell);
    usedHeroes.add(cell.hero1);
    usedHeroes.add(cell.hero2);
  }

  // If we couldn't fill enough with unique heroes, just take more
  if (picked.length < ROUNDS) {
    for (const cell of shuffled) {
      if (picked.length >= ROUNDS) break;
      if (picked.includes(cell)) continue;
      picked.push(cell);
    }
  }

  // Deterministically swap hero1/hero2 display order per round
  return picked.slice(0, ROUNDS).map((cell, i) => {
    const swap = rng() > 0.5;
    const h1WR = (cell.hero1Wins / cell.total) * 100;
    const h2WR = (cell.hero2Wins / cell.total) * 100;

    if (swap) {
      return {
        hero1: cell.hero2,
        hero2: cell.hero1,
        hero1WinRate: Math.round(h2WR * 10) / 10,
        hero2WinRate: Math.round(h1WR * 10) / 10,
        totalGames: cell.total,
      };
    }

    return {
      hero1: cell.hero1,
      hero2: cell.hero1 === cell.hero2 ? cell.hero2 : cell.hero2,
      hero1WinRate: Math.round(h1WR * 10) / 10,
      hero2WinRate: Math.round(h2WR * 10) / 10,
      totalGames: cell.total,
    };
  });
}

export const TOTAL_ROUNDS = ROUNDS;
export const WIN_THRESHOLD = 7;
