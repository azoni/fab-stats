export interface RampageRound {
  rolls: number[];
  total: number;
  banked: boolean; // true = banked, false = busted
}

export interface RampageGameState {
  date: string;
  currentRound: number; // 0-4
  totalRounds: number; // 5
  currentTargetHP: number; // may reduce with intimidate
  originalTargetHP: number;
  unbankedTotal: number;
  unbankedRolls: number[];
  score: number; // total banked damage
  roundHistory: RampageRound[];
  diceIndex: number; // position in pre-rolled sequence
  completed: boolean;
  won: boolean;
  intimidateUsed: boolean;
  intimidateValue: number;
}

export interface RampageResult {
  date: string;
  won: boolean;
  score: number;
  targetHP: number;
  rounds: number;
  busts: number;
  intimidateUsed: boolean;
  intimidateValue: number;
  timestamp: number;
  uid: string;
}

export interface RampageStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalDamageDealt: number;
  bestDamage: number;
  totalBusts: number;
  intimidatesUsed: number;
}
