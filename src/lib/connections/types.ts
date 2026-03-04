export interface ConnectionGroup {
  name: string;
  words: [string, string, string, string];
  difficulty: 1 | 2 | 3 | 4; // 1=easiest (yellow), 2=green, 3=blue, 4=hardest (purple)
}

export interface ConnectionsPuzzle {
  id: number;
  groups: [ConnectionGroup, ConnectionGroup, ConnectionGroup, ConnectionGroup];
}

export interface ConnectionsGuess {
  words: string[];
  correct: boolean;
  groupIndex?: number; // which group was found (-1 if wrong)
}

export interface ConnectionsGameState {
  date: string;
  guesses: ConnectionsGuess[];
  solvedGroups: number[]; // indices of solved groups (0-3)
  completed: boolean;
  won: boolean;
  mistakes: number;
}

export interface ConnectionsResult {
  date: string;
  won: boolean;
  mistakes: number;
  solveOrder: number[]; // group difficulty order solved
  timestamp: number;
  uid: string;
}

export interface ConnectionsStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  perfectGames: number; // won with 0 mistakes
}
