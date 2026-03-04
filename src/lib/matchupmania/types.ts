export interface MatchupRound {
  hero1: string;
  hero2: string;
  hero1WinRate: number;
  hero2WinRate: number;
  totalGames: number;
  picked?: string;
  correct?: boolean;
}

export interface MatchupManiaGameState {
  date: string;
  rounds: MatchupRound[];
  currentRound: number;
  completed: boolean;
  won: boolean;
  score: number;
}

export interface MatchupManiaResult {
  date: string;
  won: boolean;
  score: number;
  timestamp: number;
  uid: string;
}

export interface MatchupManiaStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  bestScore: number;
  totalCorrect: number;
}
