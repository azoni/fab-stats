import type { GameState, CellState } from "./types";

const STORAGE_PREFIX = "fabdoku-";
const MAX_GUESSES = 12;

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

/** Check if picks have already been saved for this date (prevents double-counting). */
export function hasPicksSaved(dateStr: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`fabdoku-picks-saved-${dateStr}`) === "1";
}

/** Mark picks as saved for this date. */
export function markPicksSaved(dateStr: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`fabdoku-picks-saved-${dateStr}`, "1");
  } catch {
    // Storage full — non-critical
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
      if (!key?.startsWith(STORAGE_PREFIX) && !key?.startsWith("fabdoku-picks-saved-")) continue;
      const prefix = key.startsWith(STORAGE_PREFIX) ? STORAGE_PREFIX : "fabdoku-picks-saved-";
      const dateStr = key.slice(prefix.length);
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
