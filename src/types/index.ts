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
  commentCount?: number;
  source?: "extension" | "csv" | "paste" | "manual";
  extensionVersion?: string;
  gemEventId?: string;
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
  totalByes: number;
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
  legalFormats: string[];
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
  earnings?: number;
  showNameOnProfiles?: boolean;
  hideFromSpotlight?: boolean;
  hideFromGuests?: boolean;
  gemId?: string;
  unlockedCans?: string[];
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
  type: "comment" | "message" | "friendRequest" | "friendAccepted";
  // Comment fields
  matchId?: string;
  matchOwnerUid?: string;
  commentAuthorUid?: string;
  commentAuthorName?: string;
  commentAuthorPhoto?: string;
  commentPreview?: string;
  matchSummary?: string;
  // Message fields
  conversationId?: string;
  senderUid?: string;
  senderName?: string;
  senderPhoto?: string;
  messagePreview?: string;
  messageCount?: number;
  // Friend request fields
  friendRequestFromUid?: string;
  friendRequestFromName?: string;
  friendRequestFromPhoto?: string;
  friendRequestFromUsername?: string;
  // Common
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
  showNameOnProfiles?: boolean;
  hideFromSpotlight?: boolean;
  hideFromGuests?: boolean;
  heroBreakdown?: { hero: string; matches: number; wins: number; winRate: number }[];
  heroBreakdownDetailed?: { hero: string; format: string; eventType: string; matches: number; wins: number; winRate: number }[];
  totalTop8s?: number;
  top8sByEventType?: Record<string, number>;
  createdAt?: string;
  updatedAt: string;
}

export type ImportSource = "extension" | "csv" | "paste" | "manual";

interface FeedEventBase {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface ImportFeedEvent extends FeedEventBase {
  type: "import";
  matchCount: number;
  topHeroes?: string[];
  source?: ImportSource;
}

export interface AchievementFeedEvent extends FeedEventBase {
  type: "achievement";
  achievements: { id: string; name: string; icon: string; rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" }[];
}

export interface PlacementFeedEvent extends FeedEventBase {
  type: "placement";
  placementType: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  eventType: string;
  hero?: string;
}

export type FeedEvent = ImportFeedEvent | AchievementFeedEvent | PlacementFeedEvent;

export interface Creator {
  name: string;
  description: string;
  url: string;
  platform: "youtube" | "twitch" | "twitter" | "website";
  imageUrl?: string;
}

export interface FeaturedEventPlayer {
  name: string;
  username?: string;
  hero?: string;
}

export interface FeaturedEvent {
  name: string;
  date: string;
  format: string;
  eventType: string;
  description?: string;
  imageUrl?: string;
  players: FeaturedEventPlayer[];
}

// Polls
export interface Poll {
  id?: string;
  question: string;
  options: string[];
  active: boolean;
  createdAt: string;
  showResults?: boolean;
}

export interface PollVote {
  optionIndex: number;
  votedAt: string;
}

export interface PollResults {
  counts: number[];
  total: number;
}

export interface PollVoter {
  userId: string;
  optionIndex: number;
  votedAt: string;
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
export type AchievementCategory = "milestone" | "streak" | "mastery" | "exploration" | "fun" | "special";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  /** Group key for tiered achievements (e.g., "matches", "wins") */
  group?: string;
  /** Tier within the group (1 = lowest, higher = harder) */
  tier?: number;
}

export type MasteryTier = "novice" | "apprentice" | "skilled" | "expert" | "master" | "grandmaster" | "legend" | "mythic";

export interface HeroMastery {
  heroName: string;
  tier: MasteryTier;
  matches: number;
  wins: number;
  winRate: number;
  nextTier: MasteryTier | null;
  progress: number; // 0-100 toward next tier
}

// ── Messaging ──

export interface Conversation {
  id: string;
  participants: [string, string];
  participantInfo: Record<string, { displayName: string; photoUrl?: string; username: string }>;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: string;
  isAdmin: boolean;
}

// ── Friends ──

export interface Friendship {
  id: string;
  participants: [string, string];
  requesterUid: string;
  recipientUid: string;
  status: "pending" | "accepted";
  requesterInfo: { displayName: string; username: string; photoUrl?: string };
  recipientInfo: { displayName: string; username: string; photoUrl?: string };
  createdAt: string;
  acceptedAt?: string;
}
