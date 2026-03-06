export interface BrawlRound {
  attackDice: number[];
  defenseDice: number[];
  attackTotal: number;
  defenseTotal: number;
  damage: number;
  isSmash: boolean;
  isBlock: boolean;
  rerolledIndex?: number;
}

export interface BrawlGameState {
  date: string;
  currentRound: number; // 0-7
  totalRounds: number; // 8
  totalDamage: number;
  targetDamage: number; // 20
  roundHistory: BrawlRound[];
  diceIndex: number;
  completed: boolean;
  won: boolean;
  defenderName: string;
  defenderClass: string;
  defenderImageUrl: string;
  difficulty: "Easy" | "Medium" | "Hard";
  difficultyBonus: number; // 0, 1, or 2
  bloodrushAvailable: boolean;
  bloodrushUsed: boolean;
  barragingAvailable: boolean;
  barragingUsed: boolean;
  // Current round in-progress state
  phase: "ready" | "player_roll" | "reroll" | "defender_roll" | "resolve" | "power_up";
  currentAttackDice: number[];
  currentDefenseDice: number[];
}

export interface BrawlResult {
  date: string;
  won: boolean;
  totalDamage: number;
  targetDamage: number;
  rounds: number;
  smashes: number;
  blocked: number;
  defenderName: string;
  difficulty: string;
  timestamp: number;
  uid: string;
}

export interface BrawlStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalDamageDealt: number;
  bestDamage: number;
  totalSmashes: number;
  totalBlocked: number;
}
