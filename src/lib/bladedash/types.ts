export interface BladeDashWordState {
  wordId: number;
  scrambled: string;
  solved: boolean;
  hintsUsed: number;
  revealedIndices: number[];
}

export interface BladeDashGameState {
  date: string;
  words: BladeDashWordState[];
  currentWord: number;
  completed: boolean;
  won: boolean;
  totalHintsUsed: number;
  elapsedMs: number;
  startedAt: number | null;
}

export interface BladeDashResult {
  date: string;
  won: boolean;
  elapsedMs: number;
  hintsUsed: number;
  wordsSolved: number;
  timestamp: number;
  uid: string;
}

export interface BladeDashStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  bestTimeMs: number;
  totalHintsUsed: number;
  perfectGames: number;
}
