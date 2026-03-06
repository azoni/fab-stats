export interface ShadowStrikeGameState {
  date: string;
  flips: number;
  matchedCardIds: number[];
  revealedPositions: number[];
  completed: boolean;
  won: boolean;
  elapsedMs: number;
  startedAt: number | null;
}

export interface ShadowStrikeResult {
  date: string;
  won: boolean;
  flips: number;
  elapsedMs: number;
  pairsFound: number;
  timestamp: number;
  uid: string;
}

export interface ShadowStrikeStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  bestFlips: number;
  bestTimeMs: number;
  totalPairsFound: number;
}
