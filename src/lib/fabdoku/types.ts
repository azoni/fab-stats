import type { HeroInfo } from "@/types";

export interface CategoryDef {
  id: string;
  label: string;
  group: "class" | "talent" | "age" | "stat" | "format";
  test: (hero: HeroInfo) => boolean;
  icon?: string;
}

export interface DailyPuzzle {
  date: string;
  rows: CategoryDef[];
  cols: CategoryDef[];
  validAnswers: string[][][]; // 3x3 array of valid hero name arrays
}

export interface CellState {
  heroName: string | null;
  correct: boolean;
  locked: boolean;
}

export interface GameState {
  date: string;
  cells: CellState[][];
  guessesUsed: number;
  maxGuesses: number;
  completed: boolean;
  won: boolean;
}

export interface FaBdokuResult {
  date: string;
  won: boolean;
  guessesUsed: number;
  cells: { hero: string | null; correct: boolean }[];
  score: number;
  timestamp: number;
}

export interface FaBdokuStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
}

/** Per-cell pick counts for uniqueness scoring. */
export interface PickData {
  totalPlayers: number;
  /** Map of "row-col" → { heroName: count } */
  cells: Record<string, Record<string, number>>;
}

/** Computed uniqueness info for a completed game. */
export interface UniquenessData {
  /** Per-cell percentage (0–100): what % of players picked the same hero */
  cellPcts: number[][];
  /** Overall uniqueness score: sum of all 9 cell percentages (lower = better) */
  score: number;
  /** Lowest possible score for today (sum of minimum % per cell) */
  bestPossible: number;
  /** Total players who completed today */
  totalPlayers: number;
}
