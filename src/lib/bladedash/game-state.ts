import type { BladeDashGameState } from "./types";

const PREFIX = "bladedash-";

export function createFreshGameState(dateStr: string, scrambled: string[], wordIds: number[]): BladeDashGameState {
  return {
    date: dateStr,
    words: wordIds.map((wordId, i) => ({
      wordId,
      scrambled: scrambled[i],
      solved: false,
      hintsUsed: 0,
      revealedIndices: [],
    })),
    currentWord: 0,
    completed: false,
    won: false,
    totalHintsUsed: 0,
    elapsedMs: 0,
    startedAt: null,
  };
}

export function loadGameState(dateStr: string): BladeDashGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: BladeDashGameState): void {
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
