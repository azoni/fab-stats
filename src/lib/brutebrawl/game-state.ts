import type { BrawlGameState } from "./types";
import type { DailyBrawl } from "./puzzle-generator";

const PREFIX = "brutebrawl-";

export function createFreshGameState(dateStr: string, puzzle: DailyBrawl): BrawlGameState {
  return {
    date: dateStr,
    currentRound: 0,
    totalRounds: 8,
    totalDamage: 0,
    targetDamage: 20,
    roundHistory: [],
    diceIndex: 0,
    completed: false,
    won: false,
    defenderName: puzzle.defenderName,
    defenderClass: puzzle.defenderClass,
    defenderImageUrl: puzzle.defenderImageUrl,
    difficulty: puzzle.difficulty,
    difficultyBonus: puzzle.difficultyBonus,
    bloodrushAvailable: false,
    bloodrushUsed: false,
    barragingAvailable: false,
    barragingUsed: false,
    phase: "ready",
    currentAttackDice: [],
    currentDefenseDice: [],
  };
}

export function loadGameState(dateStr: string): BrawlGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: BrawlGameState): void {
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
