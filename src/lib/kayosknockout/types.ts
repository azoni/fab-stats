export interface KnockoutRound {
  finalDice: number[];
  combo: string;
  damage: number;
  rerolls: number;
}

export interface KnockoutGameState {
  date: string;
  currentRound: number;
  maxRounds: number;
  targetHP: number;
  totalDamage: number;
  currentDice: number[];
  selectedIndices: number[];
  rerollsUsed: number;
  maxRerolls: number;
  roundHistory: KnockoutRound[];
  diceSequence: number[];
  diceIndex: number;
  completed: boolean;
  won: boolean;
  score: number;
}

export interface KnockoutResult {
  date: string;
  won: boolean;
  score: number;
  targetHP: number;
  rounds: number;
  combos: string[];
  timestamp: number;
  uid: string;
}

export interface KnockoutStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalDamageDealt: number;
  bestDamage: number;
  totalCombos: number;
  bestCombo: string;
}
