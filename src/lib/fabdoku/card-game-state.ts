export interface CardCellState {
  cardId: string | null;
  correct: boolean;
  locked: boolean;
}

export interface CardGameState {
  date: string;
  cells: CardCellState[][];
  guessesUsed: number;
  maxGuesses: number;
  completed: boolean;
  won: boolean;
}

const STORAGE_PREFIX = "fabdoku-card-";
const PICKS_SAVED_PREFIX = "fabdoku-card-picks-saved-";
const MAX_GUESSES = 12;

function createEmptyCell(): CardCellState {
  return { cardId: null, correct: false, locked: false };
}

export function createFreshCardGameState(dateStr: string): CardGameState {
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

export function loadCardGameState(dateStr: string): CardGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return null;
    return JSON.parse(raw) as CardGameState;
  } catch {
    return null;
  }
}

export function saveCardGameState(state: CardGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + state.date, JSON.stringify(state));
  } catch {}
}

export function hasCardPicksSaved(dateStr: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PICKS_SAVED_PREFIX + dateStr) === "1";
}

export function markCardPicksSaved(dateStr: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PICKS_SAVED_PREFIX + dateStr, "1");
  } catch {}
}

export function cleanupOldCardStates(): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX) && !key?.startsWith(PICKS_SAVED_PREFIX)) continue;
      const prefix = key.startsWith(STORAGE_PREFIX) ? STORAGE_PREFIX : PICKS_SAVED_PREFIX;
      const dateStr = key.slice(prefix.length);
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      if (now - date.getTime() > sevenDays) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
