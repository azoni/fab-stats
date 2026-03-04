/** A single entry in the word bank. */
export interface WordEntry {
  word: string;
  clue: string;
  category?: string;
}

export type Direction = "across" | "down";

/** A placed word on the grid. */
export interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

/** The generated crossword puzzle. */
export interface CrosswordPuzzle {
  date: string;
  width: number;
  height: number;
  words: PlacedWord[];
  solution: (string | null)[][];
  numbers: (number | null)[][];
}

/** Per-cell state in the player's game. */
export interface CellState {
  letter: string | null;
  revealed: boolean;
}

/** Full game state stored in localStorage. */
export interface CrosswordGameState {
  date: string;
  cells: CellState[][];
  completed: boolean;
  won: boolean;
  solvedWords: number[];
  elapsedSeconds: number;
  checksUsed: number;
  revealsUsed: number;
}

/** Result saved to Firestore. */
export interface CrosswordResult {
  date: string;
  won: boolean;
  elapsedSeconds: number;
  checksUsed: number;
  revealsUsed: number;
  wordsFound: number;
  totalWords: number;
  timestamp: number;
}

/** Player stats. */
export interface CrosswordStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  bestSolveTime?: number;
  hasShared?: boolean;
}
