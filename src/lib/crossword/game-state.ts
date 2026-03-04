import type { CrosswordGameState, CellState, CrosswordPuzzle } from "./types";

const STORAGE_PREFIX = "crossword-";

export function createFreshGameState(dateStr: string, puzzle: CrosswordPuzzle): CrosswordGameState {
  return {
    date: dateStr,
    cells: Array.from({ length: puzzle.height }, () =>
      Array.from({ length: puzzle.width }, (): CellState => ({
        letter: null,
        revealed: false,
      }))
    ),
    completed: false,
    won: false,
    solvedWords: [],
    elapsedSeconds: 0,
    checksUsed: 0,
    revealsUsed: 0,
  };
}

export function loadGameState(dateStr: string): CrosswordGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return null;
    return JSON.parse(raw) as CrosswordGameState;
  } catch {
    return null;
  }
}

export function saveGameState(state: CrosswordGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + state.date, JSON.stringify(state));
  } catch {}
}

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
      if (now - date.getTime() > sevenDays) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
