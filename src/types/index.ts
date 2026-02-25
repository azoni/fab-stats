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
  commentCount?: number;
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

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  searchName?: string;
  photoUrl?: string;
  createdAt: string;
  isPublic: boolean;
}

export interface EventStats {
  eventName: string;
  eventDate: string;
  format: string;
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

export interface AppData {
  version: number;
  matches: MatchRecord[];
}

export interface MatchComment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: string;
  editedAt?: string;
}

export interface UserNotification {
  id: string;
  type: "comment";
  matchId: string;
  matchOwnerUid: string;
  commentAuthorUid: string;
  commentAuthorName: string;
  commentAuthorPhoto?: string;
  commentPreview: string;
  matchSummary: string;
  createdAt: string;
  read: boolean;
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
  updatedAt: string;
}

export interface FeedEvent {
  id: string;
  type: "import";
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic: boolean;
  matchCount: number;
  topHeroes?: string[];
  createdAt: string;
}

export interface Creator {
  name: string;
  description: string;
  url: string;
  platform: "youtube" | "twitch" | "twitter" | "website";
  imageUrl?: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  type: "bug" | "feature";
  message: string;
  status: "new" | "reviewed" | "done";
  createdAt: string;
}

// Gamification
export type AchievementCategory = "milestone" | "streak" | "mastery" | "exploration" | "fun";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export type MasteryTier = "novice" | "apprentice" | "skilled" | "expert" | "master";

export interface HeroMastery {
  heroName: string;
  tier: MasteryTier;
  matches: number;
  wins: number;
  winRate: number;
  nextTier: MasteryTier | null;
  progress: number; // 0-100 toward next tier
}
