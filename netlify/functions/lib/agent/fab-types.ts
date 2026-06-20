export interface MatchRecord {
  id: string;
  date: string;
  heroPlayed: string;
  opponentHero: string;
  opponentName?: string;
  opponentGemId?: string;
  result: MatchResult;
  format: GameFormat;
  notes?: string;
  venue?: string;
  eventType?: string;
  rated?: boolean;
  source?: "extension" | "csv" | "paste" | "manual";
  gemEventId?: string;
  createdAt: string;
}

export enum MatchResult {
  Win = "win",
  Loss = "loss",
  Draw = "draw",
  Bye = "bye",
}

export enum GameFormat {
  Blitz = "Blitz",
  ClassicConstructed = "Classic Constructed",
  SilverAge = "Silver Age",
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

export interface OverallStats {
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalByes: number;
  overallWinRate: number;
  streaks: StreakInfo;
}

export interface StreakInfo {
  currentStreak: {
    type: MatchResult.Win | MatchResult.Loss;
    count: number;
  } | null;
  longestWinStreak: number;
  longestLossStreak: number;
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

export interface EventStats {
  eventName: string;
  eventDate: string;
  format: string;
  formats: string[];
  venue?: string;
  eventType?: string;
  rated?: boolean;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matches: MatchRecord[];
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  createdAt: string;
  isPublic: boolean;
  earnings?: number;
  gemId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic: boolean;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalByes: number;
  winRate: number;
  longestWinStreak: number;
  currentWinStreak: number;
  currentStreakType: "win" | "loss" | null;
  currentStreakCount: number;
  ratedMatches: number;
  ratedWins: number;
  ratedWinRate: number;
  ratedWinStreak: number;
  eventsPlayed: number;
  eventWins: number;
  uniqueHeroes: number;
  topHero: string;
  topHeroMatches: number;
  nemesis?: string;
  nemesisWinRate?: number;
  nemesisMatches?: number;
  weeklyMatches: number;
  weeklyWins: number;
  weekStart: string;
  monthlyMatches: number;
  monthlyWins: number;
  monthlyWinRate: number;
  monthStart: string;
  earnings?: number;
  armoryMatches: number;
  armoryWins: number;
  armoryWinRate: number;
  armoryEvents: number;
  heroBreakdown?: { hero: string; matches: number; wins: number; winRate: number }[];
  heroBreakdownDetailed?: {
    hero: string;
    format: string;
    eventType: string;
    matches: number;
    wins: number;
    winRate: number;
    dates?: string[];
  }[];
  weeklyHeroBreakdown?: {
    hero: string;
    format: string;
    eventType: string;
    matches: number;
    wins: number;
  }[];
  monthlyHeroBreakdown?: {
    hero: string;
    format: string;
    eventType: string;
    matches: number;
    wins: number;
  }[];
  top8Heroes?: {
    hero: string;
    eventType: string;
    placementType: "champion" | "finalist" | "top4" | "top8";
    eventDate: string;
    format: string;
    eventName: string;
  }[];
  totalTop8s?: number;
  top8sByEventType?: Record<string, number>;
  totalFinalists?: number;
  uniqueOpponents?: number;
  longestLossStreak?: number;
  uniqueVenues?: number;
  /** Hero-data completion percentage (0–100), written by the website's
   *  leaderboard builder. Present in Firestore but historically absent from
   *  this type — drives the Discord 100% hero-completion role. */
  heroCompletionPct?: number;
  updatedAt: string;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  format: string;
  eventType: string;
  active: boolean;
  backgroundImage?: string;
  showResults?: boolean;
}

export interface H2HRecord {
  p1: string;
  p2: string;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  total: number;
  updatedAt: string;
}

// ── Puzzle Game Types ──

export interface FabdokuPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
}

export interface CrosswordPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  bestSolveTime?: number;
}

export interface FabdokuDailyResult {
  uid: string;
  date: string;
  won: boolean;
  score: number;
  guessesUsed: number;
  timestamp: number;
}

export interface CrosswordDailyResult {
  uid: string;
  date: string;
  won: boolean;
  elapsedSeconds: number;
  wordsFound: number;
  totalWords: number;
  timestamp: number;
}

// ── Additional Game Types ──

export interface HeroGuesserPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  guessDistribution?: Record<number, number>;
}

export interface HeroGuesserDailyResult {
  uid: string;
  date: string;
  won: boolean;
  guessCount?: number;
  timestamp: number;
}

export interface MatchupManiaPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  bestScore: number;
  totalCorrect: number;
}

export interface MatchupManiaDailyResult {
  uid: string;
  date: string;
  won: boolean;
  score: number;
  timestamp: number;
}

export interface ConnectionsPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  perfectGames: number;
}

export interface ConnectionsDailyResult {
  uid: string;
  date: string;
  won: boolean;
  mistakes: number;
  timestamp: number;
}

export interface TimelinePlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  totalCorrect: number;
}

export interface TimelineDailyResult {
  uid: string;
  date: string;
  won: boolean;
  livesRemaining: number;
  correctPlacements: number;
  timestamp: number;
}

export interface TriviaPlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  totalCorrect: number;
}

export interface TriviaDailyResult {
  uid: string;
  date: string;
  won: boolean;
  score: number;
  timestamp: number;
}

/** Union of all game stat types that share common fields */
export type GamePlayerStats =
  | FabdokuPlayerStats
  | CrosswordPlayerStats
  | HeroGuesserPlayerStats
  | MatchupManiaPlayerStats
  | ConnectionsPlayerStats
  | TimelinePlayerStats
  | TriviaPlayerStats;
