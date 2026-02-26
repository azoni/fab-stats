import type { MatchRecord, HeroStats, OverallStats, OpponentStats, Achievement } from "@/types";
import { MatchResult, GameFormat } from "@/types";

interface CheckContext {
  matches: MatchRecord[];
  overall: OverallStats;
  heroStats: HeroStats[];
  opponentStats: OpponentStats[];
}

interface AchievementDef extends Achievement {
  check: (ctx: CheckContext) => boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  // ── Milestone ──
  {
    id: "first_blood",
    name: "First Blood",
    description: "Log your first match",
    category: "milestone",
    icon: "drop",
    rarity: "common",
    check: (ctx) => ctx.matches.length >= 1,
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Log 10 matches",
    category: "milestone",
    icon: "list",
    rarity: "common",
    check: (ctx) => ctx.matches.length >= 10,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    description: "Log 50 matches",
    category: "milestone",
    icon: "chart",
    rarity: "uncommon",
    check: (ctx) => ctx.matches.length >= 50,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Log 100 matches",
    category: "milestone",
    icon: "badge",
    rarity: "rare",
    check: (ctx) => ctx.matches.length >= 100,
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Log 250 matches",
    category: "milestone",
    icon: "medal",
    rarity: "epic",
    check: (ctx) => ctx.matches.length >= 250,
  },
  {
    id: "legend",
    name: "Legend",
    description: "Log 500 matches",
    category: "milestone",
    icon: "pillar",
    rarity: "legendary",
    check: (ctx) => ctx.matches.length >= 500,
  },

  // ── Win milestones ──
  {
    id: "first_win",
    name: "Victorious",
    description: "Win your first match",
    category: "milestone",
    icon: "check",
    rarity: "common",
    check: (ctx) => ctx.overall.totalWins >= 1,
  },
  {
    id: "ten_wins",
    name: "On a Roll",
    description: "Win 10 matches",
    category: "milestone",
    icon: "flame",
    rarity: "common",
    check: (ctx) => ctx.overall.totalWins >= 10,
  },
  {
    id: "fifty_wins",
    name: "Battle Tested",
    description: "Win 50 matches",
    category: "milestone",
    icon: "swords",
    rarity: "uncommon",
    check: (ctx) => ctx.overall.totalWins >= 50,
  },
  {
    id: "hundred_wins",
    name: "Champion",
    description: "Win 100 matches",
    category: "milestone",
    icon: "crown",
    rarity: "rare",
    check: (ctx) => ctx.overall.totalWins >= 100,
  },

  // ── Streak ──
  {
    id: "streak_3",
    name: "Hot Hand",
    description: "Achieve a 3-win streak",
    category: "streak",
    icon: "flame",
    rarity: "common",
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 3,
  },
  {
    id: "streak_5",
    name: "On Fire",
    description: "Achieve a 5-win streak",
    category: "streak",
    icon: "star",
    rarity: "uncommon",
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 5,
  },
  {
    id: "streak_10",
    name: "Unstoppable",
    description: "Achieve a 10-win streak",
    category: "streak",
    icon: "bolt",
    rarity: "rare",
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 10,
  },
  {
    id: "streak_15",
    name: "Godlike",
    description: "Achieve a 15-win streak",
    category: "streak",
    icon: "gem",
    rarity: "epic",
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 15,
  },

  // ── Mastery ──
  {
    id: "hero_loyalty",
    name: "Hero Loyalty",
    description: "Play 20+ matches with one hero",
    category: "mastery",
    icon: "shield",
    rarity: "uncommon",
    check: (ctx) => ctx.heroStats.some((h) => h.totalMatches >= 20),
  },
  {
    id: "hero_specialist",
    name: "Specialist",
    description: "Play 50+ matches with one hero",
    category: "mastery",
    icon: "target",
    rarity: "rare",
    check: (ctx) => ctx.heroStats.some((h) => h.totalMatches >= 50),
  },
  {
    id: "hero_master",
    name: "Hero Master",
    description: "Win 60%+ with a hero over 30+ matches",
    category: "mastery",
    icon: "trophy",
    rarity: "epic",
    check: (ctx) => ctx.heroStats.some((h) => h.totalMatches >= 30 && h.winRate >= 60),
  },

  // ── Exploration ──
  {
    id: "explorer",
    name: "Explorer",
    description: "Play 3 different heroes",
    category: "exploration",
    icon: "compass",
    rarity: "common",
    check: (ctx) => ctx.heroStats.length >= 3,
  },
  {
    id: "versatile",
    name: "Versatile",
    description: "Play 5 different heroes",
    category: "exploration",
    icon: "masks",
    rarity: "uncommon",
    check: (ctx) => ctx.heroStats.length >= 5,
  },
  {
    id: "jack_of_all",
    name: "Jack of All Trades",
    description: "Play 10 different heroes",
    category: "exploration",
    icon: "cards",
    rarity: "rare",
    check: (ctx) => ctx.heroStats.length >= 10,
  },
  {
    id: "format_hopper",
    name: "Format Hopper",
    description: "Play in 3+ different formats",
    category: "exploration",
    icon: "shuffle",
    rarity: "uncommon",
    check: (ctx) => {
      const formats = new Set(ctx.matches.map((m) => m.format));
      return formats.size >= 3;
    },
  },
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Play against 10+ different opponents",
    category: "exploration",
    icon: "people",
    rarity: "uncommon",
    check: (ctx) => ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length >= 10,
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    description: "Play at 3+ different venues",
    category: "exploration",
    icon: "globe",
    rarity: "uncommon",
    check: (ctx) => {
      const venues = new Set(ctx.matches.map((m) => m.venue).filter(Boolean));
      return venues.size >= 3;
    },
  },

  // ── Fun ──
  {
    id: "peacekeeper",
    name: "Peacekeeper",
    description: "Draw a match",
    category: "fun",
    icon: "handshake",
    rarity: "common",
    check: (ctx) => ctx.overall.totalDraws >= 1,
  },
  {
    id: "swiss_diplomat",
    name: "Swiss Diplomat",
    description: "Draw 5+ matches",
    category: "fun",
    icon: "dove",
    rarity: "uncommon",
    check: (ctx) => ctx.overall.totalDraws >= 5,
  },
  {
    id: "comeback_king",
    name: "Comeback Story",
    description: "Win 50%+ overall after logging 20+ matches",
    category: "fun",
    icon: "trending",
    rarity: "uncommon",
    check: (ctx) => ctx.matches.length >= 20 && ctx.overall.overallWinRate >= 50,
  },
  {
    id: "blitz_runner",
    name: "Blitz Runner",
    description: "Play 10+ Blitz matches",
    category: "fun",
    icon: "bolt",
    rarity: "common",
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Blitz).length >= 10,
  },
  {
    id: "constructed_grinder",
    name: "CC Grinder",
    description: "Play 10+ Classic Constructed matches",
    category: "fun",
    icon: "hammer",
    rarity: "common",
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.ClassicConstructed).length >= 10,
  },
  {
    id: "rival",
    name: "Rival",
    description: "Play the same opponent 5+ times",
    category: "fun",
    icon: "versus",
    rarity: "uncommon",
    check: (ctx) => ctx.opponentStats.some((o) => o.totalMatches >= 5 && o.opponentName !== "Unknown"),
  },
  {
    id: "nemesis_slayer",
    name: "Nemesis Slayer",
    description: "Beat an opponent you've lost to 3+ times",
    category: "fun",
    icon: "sword",
    rarity: "rare",
    check: (ctx) => ctx.opponentStats.some(
      (o) => o.losses >= 3 && o.wins >= 1 && o.opponentName !== "Unknown"
    ),
  },
  {
    id: "rated_warrior",
    name: "Rated Warrior",
    description: "Play 10+ rated matches",
    category: "fun",
    icon: "star-badge",
    rarity: "uncommon",
    check: (ctx) => ctx.matches.filter((m) => m.rated).length >= 10,
  },
];

/** Evaluate which achievements a player has earned */
export function evaluateAchievements(
  matches: MatchRecord[],
  overall: OverallStats,
  heroStats: HeroStats[],
  opponentStats: OpponentStats[],
): Achievement[] {
  const ctx: CheckContext = { matches, overall, heroStats, opponentStats };
  return ACHIEVEMENTS.filter((a) => a.check(ctx)).map(({ check: _, ...rest }) => rest);
}

/** Get all possible achievements (for progress display) */
export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS.map(({ check: _, ...rest }) => rest);
}

/** Rarity colors for styling */
export const rarityColors: Record<Achievement["rarity"], { text: string; bg: string; border: string }> = {
  common: { text: "text-amber-200", bg: "bg-amber-200/10", border: "border-amber-200/30" },
  uncommon: { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  rare: { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  epic: { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  legendary: { text: "text-fab-gold", bg: "bg-fab-gold/10", border: "border-fab-gold/30" },
};
