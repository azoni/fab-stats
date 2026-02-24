export interface MatchRecord {
  id: string;
  date: string;
  heroPlayed: string;
  opponentHero: string;
  opponentName?: string;
  result: MatchResult;
  format: GameFormat;
  notes?: string;
  venue?: string;
  eventType?: string;
  rated?: boolean;
  createdAt: string;
}

export interface VenueStats {
  venue: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface EventTypeStats {
  eventType: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export enum MatchResult {
  Win = "win",
  Loss = "loss",
  Draw = "draw",
}

export enum GameFormat {
  Blitz = "Blitz",
  ClassicConstructed = "Classic Constructed",
  Draft = "Draft",
  Sealed = "Sealed",
  Clash = "Clash",
  UltimatePitFight = "Ultimate Pit Fight",
  Other = "Other",
}

export interface HeroStats {
  heroName: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matchups: MatchupRecord[];
}

export interface MatchupRecord {
  opponentHero: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface OpponentStats {
  opponentName: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  heroesPlayed: string[];
  opponentHeroes: string[];
  matches: MatchRecord[];
}

export interface StreakInfo {
  currentStreak: {
    type: MatchResult.Win | MatchResult.Loss;
    count: number;
  } | null;
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface OverallStats {
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  overallWinRate: number;
  streaks: StreakInfo;
}

export interface TrendDataPoint {
  label: string;
  matches: number;
  wins: number;
  winRate: number;
}

export interface HeroInfo {
  name: string;
  cardIdentifier: string;
  classes: string[];
  talents: string[];
  life?: number;
  intellect?: number;
  young?: boolean;
  imageUrl: string;
}

export interface AppData {
  version: number;
  matches: MatchRecord[];
}
