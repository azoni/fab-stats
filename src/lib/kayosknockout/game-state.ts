import type { KnockoutGameState } from "./types";
import { generateDailyKnockout } from "./puzzle-generator";

const PREFIX = "kayosknockout-";

export function createFreshGameState(dateStr: string): KnockoutGameState {
  const puzzle = generateDailyKnockout(dateStr);
  return {
    date: dateStr,
    currentRound: 1,
    maxRounds: puzzle.maxRounds,
    targetHP: puzzle.targetHP,
    totalDamage: 0,
    currentDice: [],
    selectedIndices: [],
    rerollsUsed: 0,
    maxRerolls: puzzle.maxRerolls,
    roundHistory: [],
    diceSequence: puzzle.diceSequence,
    diceIndex: 0,
    completed: false,
    won: false,
    score: 0,
  };
}

export function loadGameState(dateStr: string): KnockoutGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: KnockoutGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + state.date, JSON.stringify(state));
  } catch {}
}

export function cleanupOldStates(): void {
  if (typeof window === "undefined") return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const dateStr = key.slice(PREFIX.length);
      const d = new Date(dateStr + "T12:00:00");
      if (d.getTime() < cutoff) localStorage.removeItem(key);
    }
  } catch {}
}
