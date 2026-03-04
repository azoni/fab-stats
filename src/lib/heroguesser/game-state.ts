import type { HeroGuesserGameState } from "./types";

const PREFIX = "heroguesser-";

export function createFreshGameState(dateStr: string): HeroGuesserGameState {
  return {
    date: dateStr,
    guesses: [],
    maxGuesses: 6,
    completed: false,
    won: false,
  };
}

export function loadGameState(dateStr: string): HeroGuesserGameState | null {
  try {
    const raw = localStorage.getItem(PREFIX + dateStr);
    if (!raw) return null;
    return JSON.parse(raw) as HeroGuesserGameState;
  } catch {
    return null;
  }
}

export function saveGameState(state: HeroGuesserGameState): void {
  try {
    localStorage.setItem(PREFIX + state.date, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function cleanupOldStates(): void {
  try {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const dateStr = key.slice(PREFIX.length);
      const date = new Date(dateStr).getTime();
      if (now - date > sevenDays) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
