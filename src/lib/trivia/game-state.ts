import type { TriviaGameState } from "./types";

const PREFIX = "trivia-";

export function createFreshGameState(dateStr: string): TriviaGameState {
  return {
    date: dateStr,
    answers: [],
    currentQuestion: 0,
    completed: false,
    won: false,
    score: 0,
  };
}

export function loadGameState(dateStr: string): TriviaGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: TriviaGameState): void {
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
