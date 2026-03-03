import type { GameState, CellState } from "./types";

const STORAGE_PREFIX = "fabdoku-";
const MAX_GUESSES = 9;

function createEmptyCell(): CellState {
  return { heroName: null, correct: false, locked: false };
}

export function createFreshGameState(dateStr: string): GameState {
  return {
    date: dateStr,
    cells: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, createEmptyCell)
    ),
    guessesUsed: 0,
    maxGuesses: MAX_GUESSES,
    completed: false,
    won: false,
  };
}

export function loadGameState(dateStr: string): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + state.date, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Remove game states older than 7 days. */
export function cleanupOldStates(): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const dateStr = key.slice(STORAGE_PREFIX.length);
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      if (now - date.getTime() > sevenDays) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently fail
  }
}
