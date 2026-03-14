import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Module-level cache ──
let cachedGameStats: GameLeaderboardEntry[] | null = null;
let gameStatsCacheTime = 0;
const GAME_STATS_CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Per-game stat shapes (nullable when user hasn't played that game) ──

export interface FabdokuGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
}

export interface CrosswordGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  bestSolveTime?: number;
}

export interface HeroGuesserGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>;
}

export interface MatchupManiaGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  bestScore: number;
  totalCorrect: number;
}

export interface TriviaGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalCorrect: number;
}

export interface TimelineGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalCorrect: number;
}

export interface ConnectionsGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  perfectGames: number;
}

export interface RampageGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalDamageDealt: number;
  bestDamage: number;
}

export interface KnockoutGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalDamageDealt: number;
  bestDamage: number;
}

export interface BrawlGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalDamageDealt: number;
  bestDamage: number;
}

export interface NinjaComboGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalDamageDealt: number;
  bestDamage: number;
  totalCombos: number;
}

export interface ShadowStrikeGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  bestFlips: number;
  bestTimeMs: number;
}

export interface BladeDashGameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  bestTimeMs: number;
  perfectGames: number;
}

// ── Merged entry (one per user) ──

export interface GameLeaderboardEntry {
  userId: string;
  fabdoku: FabdokuGameStats | null;
  crossword: CrosswordGameStats | null;
  heroguesser: HeroGuesserGameStats | null;
  matchupmania: MatchupManiaGameStats | null;
  trivia: TriviaGameStats | null;
  timeline: TimelineGameStats | null;
  connections: ConnectionsGameStats | null;
  rhinarsrampage: RampageGameStats | null;
  kayosknockout: KnockoutGameStats | null;
  brutebrawl: BrawlGameStats | null;
  ninjacombo: NinjaComboGameStats | null;
  shadowstrike: ShadowStrikeGameStats | null;
  bladedash: BladeDashGameStats | null;
  // Computed aggregates
  totalGamesPlayed: number;
  totalGamesWon: number;
  overallWinRate: number;
  bestMaxStreak: number;
  gamesWithActivity: number;
}

// ── Collection names ──

const COLLECTIONS = {
  fabdoku: "fabdokuPlayerStats",
  crossword: "crosswordPlayerStats",
  heroguesser: "heroguesserPlayerStats",
  matchupmania: "matchupmaniaPlayerStats",
  trivia: "triviaPlayerStats",
  timeline: "timelinePlayerStats",
  connections: "connectionsPlayerStats",
  rhinarsrampage: "rhinarsrampagePlayerStats",
  kayosknockout: "kayosknockoutPlayerStats",
  brutebrawl: "brutebrawlPlayerStats",
  ninjacombo: "ninjacomboPlayerStats",
  shadowstrike: "shadowstrikePlayerStats",
  bladedash: "bladedashPlayerStats",
} as const;

type GameKey = keyof typeof COLLECTIONS;

// ── Bulk fetch ──

export async function loadAllGameStats(): Promise<GameLeaderboardEntry[]> {
  const now = Date.now();
  if (cachedGameStats && now - gameStatsCacheTime < GAME_STATS_CACHE_TTL) {
    return cachedGameStats;
  }

  // Use allSettled so one failing collection doesn't break the entire fetch
  const results = await Promise.allSettled(
    Object.values(COLLECTIONS).map((col) => getDocs(collection(db, col)))
  );

  const keys = Object.keys(COLLECTIONS) as GameKey[];
  const byUser = new Map<string, Partial<Record<GameKey, Record<string, unknown>>>>();

  for (let i = 0; i < keys.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;
    const key = keys[i];
    for (const doc of result.value.docs) {
      const uid = doc.id;
      if (!byUser.has(uid)) byUser.set(uid, {});
      byUser.get(uid)![key] = doc.data() as Record<string, unknown>;
    }
  }

  const entries: GameLeaderboardEntry[] = [];

  for (const [userId, gameData] of byUser) {
    const fabdoku = gameData.fabdoku ? parseBasicStats(gameData.fabdoku) : null;
    const crossword = gameData.crossword ? parseCrosswordStats(gameData.crossword) : null;
    const heroguesser = gameData.heroguesser ? parseHeroGuesserStats(gameData.heroguesser) : null;
    const matchupmania = gameData.matchupmania ? parseMatchupManiaStats(gameData.matchupmania) : null;
    const trivia = gameData.trivia ? parseTriviaStats(gameData.trivia) : null;
    const timeline = gameData.timeline ? parseTimelineStats(gameData.timeline) : null;
    const connections = gameData.connections ? parseConnectionsStats(gameData.connections) : null;
    const rhinarsrampage = gameData.rhinarsrampage ? parseDiceGameStats(gameData.rhinarsrampage) : null;
    const kayosknockout = gameData.kayosknockout ? parseDiceGameStats(gameData.kayosknockout) : null;
    const brutebrawl = gameData.brutebrawl ? parseDiceGameStats(gameData.brutebrawl) : null;
    const ninjacombo = gameData.ninjacombo ? parseNinjaComboStats(gameData.ninjacombo) : null;
    const shadowstrike = gameData.shadowstrike ? parseShadowStrikeStats(gameData.shadowstrike) : null;
    const bladedash = gameData.bladedash ? parseBladeDashStats(gameData.bladedash) : null;

    const all = [fabdoku, crossword, heroguesser, matchupmania, trivia, timeline, connections, rhinarsrampage, kayosknockout, brutebrawl, ninjacombo, shadowstrike, bladedash];
    const active = all.filter((s): s is NonNullable<typeof s> => s !== null && s.gamesPlayed > 0);

    const totalGamesPlayed = active.reduce((sum, s) => sum + s.gamesPlayed, 0);
    const totalGamesWon = active.reduce((sum, s) => sum + s.gamesWon, 0);
    const overallWinRate = totalGamesPlayed > 0 ? (totalGamesWon / totalGamesPlayed) * 100 : 0;
    const bestMaxStreak = active.reduce((max, s) => Math.max(max, s.maxStreak), 0);
    const gamesWithActivity = active.length;

    if (totalGamesPlayed === 0) continue;

    entries.push({

      userId,
      fabdoku,
      crossword,
      heroguesser,
      matchupmania,
      trivia,
      timeline,
      connections,
      rhinarsrampage,
      kayosknockout,
      brutebrawl,
      ninjacombo,
      shadowstrike,
      bladedash,
      totalGamesPlayed,
      totalGamesWon,
      overallWinRate,
      bestMaxStreak,
      gamesWithActivity,
    });
  }

  cachedGameStats = entries;
  gameStatsCacheTime = Date.now();
  return entries;
}

// ── Parsers ──

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseBasicStats(d: Record<string, unknown>): FabdokuGameStats {
  return {
    gamesPlayed: num(d.gamesPlayed),
    gamesWon: num(d.gamesWon),
    currentStreak: num(d.currentStreak),
    maxStreak: num(d.maxStreak),
  };
}

function parseCrosswordStats(d: Record<string, unknown>): CrosswordGameStats {
  return {
    ...parseBasicStats(d),
    bestSolveTime: d.bestSolveTime != null ? num(d.bestSolveTime) : undefined,
  };
}

function parseHeroGuesserStats(d: Record<string, unknown>): HeroGuesserGameStats {
  return {
    ...parseBasicStats(d),
    guessDistribution: (d.guessDistribution as Record<number, number>) ?? {},
  };
}

function parseMatchupManiaStats(d: Record<string, unknown>): MatchupManiaGameStats {
  return {
    ...parseBasicStats(d),
    bestScore: num(d.bestScore),
    totalCorrect: num(d.totalCorrect),
  };
}

function parseTriviaStats(d: Record<string, unknown>): TriviaGameStats {
  return {
    ...parseBasicStats(d),
    totalCorrect: num(d.totalCorrect),
  };
}

function parseTimelineStats(d: Record<string, unknown>): TimelineGameStats {
  return {
    ...parseBasicStats(d),
    totalCorrect: num(d.totalCorrect),
  };
}

function parseConnectionsStats(d: Record<string, unknown>): ConnectionsGameStats {
  return {
    ...parseBasicStats(d),
    perfectGames: num(d.perfectGames),
  };
}

function parseDiceGameStats(d: Record<string, unknown>): RampageGameStats {
  return {
    ...parseBasicStats(d),
    totalDamageDealt: num(d.totalDamageDealt),
    bestDamage: num(d.bestDamage),
  };
}

function parseNinjaComboStats(d: Record<string, unknown>): NinjaComboGameStats {
  return {
    ...parseBasicStats(d),
    totalDamageDealt: num(d.totalDamageDealt),
    bestDamage: num(d.bestDamage),
    totalCombos: num(d.totalCombos),
  };
}

function parseShadowStrikeStats(d: Record<string, unknown>): ShadowStrikeGameStats {
  return {
    ...parseBasicStats(d),
    bestFlips: num(d.bestFlips),
    bestTimeMs: num(d.bestTimeMs),
  };
}

function parseBladeDashStats(d: Record<string, unknown>): BladeDashGameStats {
  return {
    ...parseBasicStats(d),
    bestTimeMs: num(d.bestTimeMs),
    perfectGames: num(d.perfectGames),
  };
}
