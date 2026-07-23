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
  eventTypeOverride?: string;
  rated?: boolean;
  winCondition?: "damage" | "fatigue" | "concession" | "time" | "other";
  goingFirst?: boolean;
  matchNotes?: string;
  commentCount?: number;
  source?: "extension" | "bookmarklet" | "csv" | "paste" | "manual";
  extensionVersion?: string;
  gemEventId?: string;
  heroSuggestionSent?: string;
  /** ISO timestamp of the last user-initiated edit. Set automatically by
   *  the edit handler in the UI whenever a user manually changes match
   *  fields (e.g. flipping a result, deleting an event). Programmatic
   *  edits (opponent-hero propagation, leaderboard recompute) do NOT set
   *  this. Used to display a subtle "edited" indicator for transparency. */
  editedAt?: string;
  /** True when this match belongs to day two of a multi-day event. Undefined
   *  (omitted) for day-one matches. Set on import via the >10-swiss-round
   *  heuristic (user-adjustable) and editable per-event afterward. */
  day2?: boolean;
  /** Optional decklist URL (typically Fabrary) the player attached to this event.
   *  Stamped onto every match of the event so it survives feed regeneration and can
   *  be edited from the Events tab; forwarded onto the placement feed event. */
  decklistUrl?: string;
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
  LivingLegend = "Living Legend",
  Other = "Other",
}

export interface HeroStats {
  heroName: string;
  format?: string;
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

export interface CardInfo {
  name: string;
  cardIdentifier: string;
  types: string[];
  classes: string[];
  talents: string[];
  keywords: string[];
  pitch?: number;
  cost?: number;
  power?: number;
  defense?: number;
  legalFormats: string[];
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
  hideFromFeed?: boolean;
  profileVisibility?: "public" | "friends" | "private";
  gemId?: string;
  hasDiscoverLinks?: boolean;
  unlockedCans?: string[];
  showcase?: ShowcaseCard[];
  showcaseSecondary?: ShowcaseCard[];
  selectedEmblem?: string;
  selectedClassEmblem?: string;
  notificationsEnabled?: boolean;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    fabrary?: string;
    fabraryName?: string;
    metafy?: string;
    metafyTitle?: string;
    metafyGuide?: string;
    metafyGuideTitle?: string;
    metafyProfile?: string;
    discoverTags?: string[];
  };
  borderStyle?: "beam" | "glow";
  borderEventType?: string;
  borderPlacement?: string;
  underlineEventType?: string;
  underlinePlacement?: string;
  selectedBadgeIds?: string[];
  siteBackgroundId?: string;
  /** Equipped cosmetics (SKU ids from the cosmeticCatalog). Purely decorative;
   *  render is a pure function of the id so it also renders on other players'
   *  profiles. Ownership is enforced at equip time (only owned items selectable). */
  selectedAvatarFrameId?: string;
  selectedCompanionId?: string;
  selectedAuraId?: string;
  selectedNameplateId?: string;
  gemSyncStatus?: {
    enabled: boolean;
    lastSyncAt?: string;
    lastStatus?: "connected" | "disconnected" | "success" | "error" | "syncing";
    lastError?: string;
    matchesImported?: number;
  };
  needsRecompute?: boolean;
  /** All teams the user belongs to. New (multi-team) field. */
  teamIds?: string[];
  /** The user's primary team — used for badges, trophies, /team default. Falls back
   *  to teamIds[0] (or teamId during migration) when missing. */
  primaryTeamId?: string;
  /**
   * Legacy single-team field. New code should use `teamIds` / `primaryTeamId`.
   * Kept on the document for one release to avoid breaking older clients;
   * the canonical primary value is mirrored here on every join/leave.
   * @deprecated Use primaryTeamId.
   */
  teamId?: string;
  trophyDesigns?: Record<string, number>;
}

// ── Teams ──

export interface Team {
  id: string;
  name: string;
  nameLower: string;
  description?: string;
  iconUrl?: string;
  iconThumbUrl?: string;
  backgroundUrl?: string;
  backgroundThumbUrl?: string;
  accentColor?: string;
  ownerUid: string;
  joinMode: "open" | "invite";
  visibility: "public" | "private";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  role: "owner" | "admin" | "member";
  title?: string;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  teamIconUrl?: string;
  inviterUid: string;
  inviterName: string;
  targetUid: string;
  targetUsername?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  nameLower: string;
  description?: string;
  iconUrl?: string;
  iconThumbUrl?: string;
  accentColor?: string;
  ownerUid: string;
  joinMode: "open" | "invite";
  visibility: "public" | "private";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  role: "owner" | "admin" | "member";
  title?: string;
  joinedAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  groupIconUrl?: string;
  inviterUid: string;
  inviterName: string;
  targetUid: string;
  targetUsername?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

// ── Leagues ──

export interface LeagueScoringRules {
  pointsPerWin: number;
  pointsPerLoss: number;
  pointsPerDraw: number;
  /** Optional bye payout — a bye isn't really a win, so leagues can value
   *  it differently (or 0 / undefined to skip byes entirely). Multipliers
   *  and `pointsPerMatch` do not apply to byes. */
  pointsPerBye?: number;
  /** Flat bonus added to every qualifying W/L/D match regardless of result.
   *  Doesn't apply to byes. Defaults to 0. */
  pointsPerMatch?: number;
  /** Minimum points — a FLOOR on a member's TOTAL (max(total, min)), applied only
   *  to players who attended ≥1 event and NOT additive. e.g. min 1 → a winless
   *  attendee scores 1, but an 11-win player keeps 11 (the floor never adds on top
   *  of wins). Defaults to 0 (no floor). (Field name kept for back-compat; the
   *  minimum is a total floor, not per event.) */
  minPointsPerEvent?: number;
  /** Flat attendance points ADDED per event a member has a qualifying match in —
   *  on top of their match points. Distinct from minPointsPerEvent (a floor).
   *  Defaults to 0. */
  pointsPerEvent?: number;
  /** Optional multipliers keyed by GameFormat string (e.g. "Classic Constructed": 1.5).
   *  When unset, all formats score equally. */
  formatMultipliers?: Record<string, number>;
  /** Event types that count (e.g. ["Armory"]). Empty/undefined = any event type. */
  eligibleEventTypes?: string[];
  /** Formats that count (e.g. ["Classic Constructed"]). Empty/undefined = any format. */
  eligibleFormats?: string[];
}

/** One scheduled league session: a specific store on a specific date. */
export interface LeagueSession {
  /** Slugified store name (matches `slugifyStoreName(match.venue)`). */
  storeSlug: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
}

export interface League {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  /** Wide banner image shown on the league page header. */
  bannerUrl?: string;
  accentColor?: string;
  city?: string;
  region?: string;
  country?: string;
  organizerUid: string;
  organizerName: string;
  /** ISO date string YYYY-MM-DD (inclusive) */
  startDate: string;
  /** ISO date string YYYY-MM-DD (inclusive) */
  endDate: string;
  /** Slugified venue names — matches resolve against `slugify(match.venue)`.
   *  Slugs come from the auto-derived store directory. */
  storeSlugs: string[];
  /** Display names for stores that aren't in the auto-directory (organizer typed
   *  them in). Keyed by slug. Directory stores resolve their name from the
   *  directory, so only free-typed slugs need an entry here. Optional/back-compat. */
  storeNames?: Record<string, string>;
  /** Optional per-store date schedule. When non-empty, a match qualifies only if
   *  its (venue slug, date) matches a scheduled session — instead of the flat
   *  storeSlugs + start/end window. `storeSlugs`, `startDate`, `endDate` are kept
   *  derived from the schedule (distinct stores; min/max dates) so every existing
   *  consumer keeps working. Absent/empty → legacy window behavior. */
  sessions?: LeagueSession[];
  scoringRules: LeagueScoringRules;
  status: "draft" | "active" | "completed";
  /** How players join. "approval" (default) requires organizer approval; "open"
   *  lets anyone self-join. Absent on legacy leagues → treated as "approval". */
  joinPolicy?: "open" | "approval";
  /** Current season number (1-based). Absent on legacy leagues → treated as 1. */
  seasonNumber?: number;
  /** Optional label for the current season, e.g. "Spring 2026". */
  seasonName?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A frozen snapshot of a past league season, archived when a new season starts.
 *  Lives at leagues/{leagueId}/seasons/{seasonId}. */
export interface LeagueSeasonArchive {
  id: string;
  seasonNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  sessions?: LeagueSession[];
  scoringRules: LeagueScoringRules;
  /** Final standings at the time the season closed. */
  entries: LeagueStandingEntry[];
  memberCountAtClose: number;
  archivedAt: string;
}

export interface LeagueMember {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  /** organizer = league owner with edit rights; player = competing member */
  role: "organizer" | "player";
  joinedAt: string;
}

export interface LeagueJoinRequest {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  requestedAt: string;
}

export interface LeagueStandingEntry {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  points: number;
  storesPlayed: number;
  /** Distinct events (date + event name + store) the member has qualifying matches
   *  in. Optional for back-compat with standings docs written before this field. */
  events?: number;
}

export interface LeagueStandings {
  leagueId: string;
  entries: LeagueStandingEntry[];
  computedAt: string;
}

export interface ShowcaseCard {
  type: "featuredMatch" | "heroSpotlight" | "bestFinish" | "rivalry" | "eventRecap" | "achievements" | "statHighlight" | "formatMastery" | "eventTypeMastery" | "venueMastery" | "streakShowcase" | "recentForm" | "leaderboardRank" | "customImage";
  matchId?: string;
  heroName?: string;
  eventDate?: string;
  eventName?: string;
  opponentName?: string;
  achievementIds?: string[];
  stat?: string;
  stats?: string[];
  filter?: string;
  sortBy?: "mostPlayed" | "bestWinRate";
  selectedItems?: string[];
  imageUrl?: string;
  caption?: string;
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
  type: "comment" | "feedComment" | "message" | "friendRequest" | "friendAccepted" | "badge" | "kudos" | "reaction" | "heroCorrection" | "feedbackStatus" | "teamInvite" | "groupInvite";
  // Comment fields
  matchId?: string;
  matchOwnerUid?: string;
  commentAuthorUid?: string;
  commentAuthorName?: string;
  commentAuthorPhoto?: string;
  commentPreview?: string;
  matchSummary?: string;
  // Hero correction fields
  suggestedHero?: string;
  requesterUid?: string;
  requesterName?: string;
  targetMatchId?: string;
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
  // Badge fields
  badgeId?: string;
  badgeName?: string;
  badgeRarity?: string;
  grantedByAdmin?: boolean;
  // Kudos fields
  kudosType?: string;
  kudosGiverUid?: string;
  kudosGiverName?: string;
  // Reaction fields (activity feed)
  reactionKey?: string;
  reactionLabel?: string;
  reacterUid?: string;
  reacterName?: string;
  reacterPhoto?: string;
  feedEventId?: string;
  feedEventType?: string;
  feedEventSummary?: string;
  // Feedback status fields
  feedbackType?: "bug" | "feature";
  newStatus?: "reviewed" | "done";
  feedbackMessage?: string;
  // Team invite fields
  teamInviteId?: string;
  teamId?: string;
  teamName?: string;
  teamIconUrl?: string;
  teamInviteFromUid?: string;
  teamInviteFromName?: string;
  // Group invite fields
  groupInviteId?: string;
  groupId?: string;
  groupName?: string;
  groupIconUrl?: string;
  groupInviteFromUid?: string;
  groupInviteFromName?: string;
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
  heroCompletionPct: number;
  opponentHeroCompletionPct: number;
  bothHeroesCompletionPct: number;
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
  heroBreakdownDetailed?: { hero: string; format: string; eventType: string; matches: number; wins: number; winRate: number; dates?: string[]; eventKeys?: string[] }[];
  weeklyHeroBreakdown?: { hero: string; format: string; eventType: string; matches: number; wins: number }[];
  monthlyHeroBreakdown?: { hero: string; format: string; eventType: string; matches: number; wins: number }[];
  totalTop8s?: number;
  top8sByEventType?: Record<string, number>;
  minorTop8sByEventType?: Record<string, number>;
  top8Heroes?: { hero: string; eventType: string; placementType: string; eventDate: string; format: string; eventName: string }[];
  totalFinalists?: number;
  uniqueOpponents?: number;
  longestLossStreak?: number;
  uniqueVenues?: number;
  venueBreakdown?: {
    venue: string;
    matches: number;
    wins: number;
    winRate: number;
    /** Per-venue hero mix (top heroes the player ran here). Added later, so optional. */
    heroes?: { hero: string; matches: number; wins: number }[];
    /** Per-venue format mix. Added later, so optional. */
    formats?: { format: string; matches: number }[];
  }[];
  /** Flat slugified venue list — top-level for fast `array-contains` queries.
   *  Mirrors the venues in `venueBreakdown`. */
  venueSlugs?: string[];
  eloRating?: number;
  teamId?: string;
  teamName?: string;
  teamIconUrl?: string;
  teamVisibility?: "public" | "private";
  createdAt?: string;
  updatedAt: string;
}

export type ImportSource = "extension" | "bookmarklet" | "csv" | "paste" | "manual";

interface FeedEventBase {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic: boolean;
  teamId?: string;
  teamName?: string;
  teamIconUrl?: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
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
  /** Optional decklist URL (typically Fabrary) the player attached to this finish;
   *  rendered as a clickable "View decklist" link on the placement card. */
  decklistUrl?: string;
}

export interface FaBdokuFeedEvent extends FeedEventBase {
  type: "fabdoku";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  correctCount: number;
  guessesUsed: number;
  uniquenessScore?: number;
  grid: ("correct" | "wrong" | "empty")[];
}

export interface FaBdokuCardFeedEvent extends FeedEventBase {
  type: "fabdoku-cards";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  correctCount: number;
  guessesUsed: number;
  uniquenessScore?: number;
  grid: ("correct" | "wrong" | "empty")[];
}

export interface CrosswordFeedEvent extends FeedEventBase {
  type: "crossword";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  wordsFound: number;
  totalWords: number;
  elapsedSeconds: number;
  checksUsed: number;
  revealsUsed: number;
}

export interface HeroGuesserFeedEvent extends FeedEventBase {
  type: "heroguesser";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  guessCount: number;
  maxGuesses: number;
}

export interface MatchupManiaFeedEvent extends FeedEventBase {
  type: "matchupmania";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  score: number;
  totalRounds: number;
}

export interface TriviaFeedEvent extends FeedEventBase {
  type: "trivia";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  score: number;
  totalQuestions: number;
}

export interface TimelineFeedEvent extends FeedEventBase {
  type: "timeline";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  livesRemaining: number;
  totalItems: number;
}

export interface ConnectionsFeedEvent extends FeedEventBase {
  type: "connections";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  groupsFound: number;
  mistakesUsed: number;
}

export interface RampageFeedEvent extends FeedEventBase {
  type: "rampage";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  score: number;
  targetHP: number;
}

export interface KnockoutFeedEvent extends FeedEventBase {
  type: "kayosknockout";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  score: number;
  targetHP: number;
}

export interface BrawlFeedEvent extends FeedEventBase {
  type: "brutebrawl";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  totalDamage: number;
  targetDamage: number;
  defenderName: string;
  difficulty: string;
}

export interface NinjaComboFeedEvent extends FeedEventBase {
  type: "ninjacombo";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  totalDamage: number;
  targetDamage: number;
  comboCount: number;
  maxStreak: number;
}

export interface ShadowStrikeFeedEvent extends FeedEventBase {
  type: "shadowstrike";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  flips: number;
  elapsedMs: number;
  pairsFound: number;
}

export interface BladeDashFeedEvent extends FeedEventBase {
  type: "bladedash";
  subtype: "completed" | "shared";
  date: string;
  won: boolean;
  elapsedMs: number;
  hintsUsed: number;
  wordsSolved: number;
}

export interface ArticleFeedEvent extends FeedEventBase {
  type: "article";
  articleId: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  heroTags?: string[];
  publishedAt: string;
}

export type FeedEvent = ImportFeedEvent | AchievementFeedEvent | PlacementFeedEvent | FaBdokuFeedEvent | FaBdokuCardFeedEvent | CrosswordFeedEvent | HeroGuesserFeedEvent | MatchupManiaFeedEvent | TriviaFeedEvent | TimelineFeedEvent | ConnectionsFeedEvent | RampageFeedEvent | KnockoutFeedEvent | BrawlFeedEvent | NinjaComboFeedEvent | ShadowStrikeFeedEvent | BladeDashFeedEvent | ArticleFeedEvent;

export interface Creator {
  name: string;
  description: string;
  url: string;
  platform: "youtube" | "twitch" | "twitter" | "website";
  imageUrl?: string;
  username?: string;
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

// Historical events (auto-generated from scraped decklists)
export interface HistoricalPlacement {
  placement: string;
  name: string;
  hero: string;
  country?: string;
  decklistUrl?: string;
  fabstatsUsername?: string;
}

export interface HistoricalEvent {
  name: string;
  date: string;
  format: string;
  eventType: string;
  totalDecklists: number;
  top8: HistoricalPlacement[];
}

// Seasons
export interface Season {
  id: string;           // URL-safe slug, e.g. "pq-cc-s1-2026"
  name: string;         // Display name: "ProQuest Season 1 (CC)"
  startDate: string;    // YYYY-MM-DD inclusive
  endDate: string;      // YYYY-MM-DD inclusive
  format: string;       // "Classic Constructed", "Blitz", etc.
  eventType: string;    // "ProQuest", "Battle Hardened", etc.
  active: boolean;
  backgroundImage?: string; // URL for season background image on meta table
  showResults?: boolean;    // Show donut chart on homepage after season ends
}

// Polls
export interface Poll {
  id?: string;
  question: string;
  options: string[];
  active: boolean;
  createdAt: string;
  showResults?: boolean;
  // Prediction fields (optional for backward compat)
  type?: "poll" | "prediction";
  allowUserOptions?: boolean;
  votingOpen?: boolean;
  correctOptionIndex?: number | null;
  resolvedAt?: string;
  closedAt?: string;
  optionAddCount?: Record<string, number>;
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

// Articles
export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleImageWidth = "small" | "standard" | "wide" | "full" | "inline-left" | "inline-right";
export type ArticleReactionKey = "fire" | "heart" | "insight";
export type ArticleCalloutTone = "note" | "tip" | "warning";

export interface ArticleGalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

export type ArticleBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "list"; style: "bullet" | "numbered"; items: string[] }
  | { id: string; type: "divider" }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string; width?: ArticleImageWidth }
  | { id: string; type: "gallery"; images: ArticleGalleryImage[]; columns?: 2 | 3 }
  | { id: string; type: "callout"; tone: ArticleCalloutTone; title?: string; text: string }
  | { id: string; type: "embed"; url: string; title?: string; caption?: string };

export interface ArticleRecord {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoUrl?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  contentBlocks: ArticleBlock[];
  searchText: string;
  heroTags: string[];
  tags: string[];
  status: ArticleStatus;
  allowComments: boolean;
  readingMinutes: number;
  viewCount: number;
  commentCount: number;
  reactionCounts?: Partial<Record<ArticleReactionKey, number>>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ArticleCommentAuthorDecor {
  borderStyle?: "beam" | "glow";
  borderEventType?: string;
  borderPlacement?: string;
  underlineEventType?: string;
  underlinePlacement?: string;
  selectedBadgeIds?: string[];
}

export interface ArticleComment {
  id: string;
  articleId: string;
  authorUid: string;
  authorUsername: string;
  authorName: string;
  authorPhoto?: string;
  authorDecor?: ArticleCommentAuthorDecor;
  text: string;
  parentId?: string;
  replyToName?: string;
  createdAt: string;
  editedAt?: string;
}

// Gamification
export type AchievementCategory = "milestone" | "streak" | "mastery" | "exploration" | "fun" | "games" | "special" | "social";

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

// ── Event Wall ──

export type ReactionType = "fire" | "heart" | "laugh" | "thumbsUp" | "thinking";

export interface WallComment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  parentId?: string;
  replyToName?: string;
  reactions?: Record<ReactionType, string[]>;
  createdAt: string;
  editedAt?: string;
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

// ── Event Showcase ──

export interface EventShowcaseConfig {
  active: boolean;
  title: string;
  images: EventShowcaseImage[];
  imageLink?: string;
  autoAdvanceSeconds: number;
  youtube: {
    url: string;
    enabled: boolean;
  };
  discussion: {
    eventId: string;
    enabled: boolean;
  };
}

export interface EventShowcaseImage {
  url: string;
  alt?: string;
}

// ── Community Hero Matchups ──

export interface HeroMatchupDoc {
  hero1: string;
  hero2: string;
  month: string;
  hero1Wins: number;
  hero2Wins: number;
  draws: number;
  total: number;
  byFormat?: Record<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }>;
  byRated?: Record<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }>;
  byEventType?: Record<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }>;
  byFormatEventType?: Record<string, Record<string, { hero1Wins: number; hero2Wins: number; draws: number; total: number }>>;
  updatedAt: string;
}
