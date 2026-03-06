export type CardType = "kick" | "punch" | "kunai" | "special";
export type ComboCondition = "after_kick" | "after_punch" | "after_any" | "after_2_chain";

export interface ComboCard {
  id: string;
  name: string;
  type: CardType;
  baseDamage: number;
  comboCondition: ComboCondition;
}

export interface ChainSlot {
  card: ComboCard;
  comboed: boolean;
  bonusDamage: number;
  totalDamage: number;
  consecutiveCombo: number;
}

export interface NinjaComboGameState {
  date: string;
  hand: ComboCard[];
  chain: ChainSlot[];
  chainSize: number;
  totalDamage: number;
  targetDamage: number;
  completed: boolean;
  won: boolean;
}

export interface NinjaComboResult {
  date: string;
  won: boolean;
  totalDamage: number;
  targetDamage: number;
  chainLength: number;
  comboCount: number;
  maxStreak: number;
  timestamp: number;
  uid: string;
}

export interface NinjaComboStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  hasShared?: boolean;
  totalDamageDealt: number;
  bestDamage: number;
  totalCombos: number;
  perfectGames: number;
}
