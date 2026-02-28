import type { MatchRecord, HeroStats, OverallStats, OpponentStats, Achievement } from "@/types";
import { MatchResult, GameFormat } from "@/types";
import { computeEventStats, computePlayoffFinishes } from "@/lib/stats";

interface CheckContext {
  matches: MatchRecord[];
  overall: OverallStats;
  heroStats: HeroStats[];
  opponentStats: OpponentStats[];
}

interface AchievementProgress {
  current: number;
  target: number;
}

interface AchievementDef extends Achievement {
  check: (ctx: CheckContext) => boolean;
  progress?: (ctx: CheckContext) => AchievementProgress;
}

// Helper: count matches by event type
function countEventType(ctx: CheckContext, type: string): number {
  return ctx.matches.filter((m) => m.eventType === type).length;
}

// Helper: count distinct events (by date + venue + eventType combos)
function countDistinctEvents(ctx: CheckContext, type: string): number {
  const events = new Set<string>();
  for (const m of ctx.matches) {
    if (m.eventType === type) {
      events.add(`${m.date}|${m.venue || ""}`);
    }
  }
  return events.size;
}

// Helper: count wins by event type
function countEventTypeWins(ctx: CheckContext, type: string): number {
  return ctx.matches.filter((m) => m.eventType === type && m.result === MatchResult.Win).length;
}

// Helper: check if player won (champion finish) at a given event type
function hasChampionFinish(ctx: CheckContext, eventType: string): boolean {
  const eventStats = computeEventStats(ctx.matches);
  const finishes = computePlayoffFinishes(eventStats);
  return finishes.some((f) => f.type === "champion" && f.eventType === eventType);
}

// Helper: count champion finishes at a given event type
function countChampionFinishes(ctx: CheckContext, eventType: string): number {
  const eventStats = computeEventStats(ctx.matches);
  const finishes = computePlayoffFinishes(eventStats);
  return finishes.filter((f) => f.type === "champion" && f.eventType === eventType).length;
}

// Helper: hero stats excluding "Unknown"
function realHeroStats(ctx: CheckContext): HeroStats[] {
  return ctx.heroStats.filter((h) => h.heroName !== "Unknown");
}

const ACHIEVEMENTS: AchievementDef[] = [
  // ══════════════════════════════════════════
  // MATCH MILESTONES (tiered)
  // ══════════════════════════════════════════
  {
    id: "matches_1",
    name: "First Blood",
    description: "Log your first match",
    category: "milestone",
    icon: "drop",
    rarity: "common",
    group: "matches",
    tier: 1,
    check: (ctx) => ctx.matches.length >= 1,
    progress: (ctx) => ({ current: ctx.matches.length, target: 1 }),
  },
  {
    id: "matches_10",
    name: "Getting Started",
    description: "Log 10 matches",
    category: "milestone",
    icon: "list",
    rarity: "common",
    group: "matches",
    tier: 2,
    check: (ctx) => ctx.matches.length >= 10,
    progress: (ctx) => ({ current: ctx.matches.length, target: 10 }),
  },
  {
    id: "matches_50",
    name: "Dedicated",
    description: "Log 50 matches",
    category: "milestone",
    icon: "chart",
    rarity: "uncommon",
    group: "matches",
    tier: 3,
    check: (ctx) => ctx.matches.length >= 50,
    progress: (ctx) => ({ current: ctx.matches.length, target: 50 }),
  },
  {
    id: "matches_100",
    name: "Centurion",
    description: "Log 100 matches",
    category: "milestone",
    icon: "badge",
    rarity: "rare",
    group: "matches",
    tier: 4,
    check: (ctx) => ctx.matches.length >= 100,
    progress: (ctx) => ({ current: ctx.matches.length, target: 100 }),
  },
  {
    id: "matches_250",
    name: "Veteran",
    description: "Log 250 matches",
    category: "milestone",
    icon: "medal",
    rarity: "epic",
    group: "matches",
    tier: 5,
    check: (ctx) => ctx.matches.length >= 250,
    progress: (ctx) => ({ current: ctx.matches.length, target: 250 }),
  },
  {
    id: "matches_500",
    name: "Legend",
    description: "Log 500 matches",
    category: "milestone",
    icon: "pillar",
    rarity: "legendary",
    group: "matches",
    tier: 6,
    check: (ctx) => ctx.matches.length >= 500,
    progress: (ctx) => ({ current: ctx.matches.length, target: 500 }),
  },
  {
    id: "matches_1000",
    name: "Warlord",
    description: "Log 1,000 matches",
    category: "milestone",
    icon: "crown",
    rarity: "legendary",
    group: "matches",
    tier: 7,
    check: (ctx) => ctx.matches.length >= 1000,
    progress: (ctx) => ({ current: ctx.matches.length, target: 1000 }),
  },
  {
    id: "matches_2500",
    name: "Living Legend",
    description: "Log 2,500 matches",
    category: "milestone",
    icon: "gem",
    rarity: "legendary",
    group: "matches",
    tier: 8,
    check: (ctx) => ctx.matches.length >= 2500,
    progress: (ctx) => ({ current: ctx.matches.length, target: 2500 }),
  },
  {
    id: "matches_5000",
    name: "Flesh and Blood",
    description: "Log 5,000 matches",
    category: "milestone",
    icon: "infinity",
    rarity: "legendary",
    group: "matches",
    tier: 9,
    check: (ctx) => ctx.matches.length >= 5000,
    progress: (ctx) => ({ current: ctx.matches.length, target: 5000 }),
  },

  // ══════════════════════════════════════════
  // WIN MILESTONES (tiered)
  // ══════════════════════════════════════════
  {
    id: "wins_1",
    name: "Victorious",
    description: "Win your first match",
    category: "milestone",
    icon: "check",
    rarity: "common",
    group: "wins",
    tier: 1,
    check: (ctx) => ctx.overall.totalWins >= 1,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 1 }),
  },
  {
    id: "wins_10",
    name: "On a Roll",
    description: "Win 10 matches",
    category: "milestone",
    icon: "flame",
    rarity: "common",
    group: "wins",
    tier: 2,
    check: (ctx) => ctx.overall.totalWins >= 10,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 10 }),
  },
  {
    id: "wins_50",
    name: "Battle Tested",
    description: "Win 50 matches",
    category: "milestone",
    icon: "swords",
    rarity: "uncommon",
    group: "wins",
    tier: 3,
    check: (ctx) => ctx.overall.totalWins >= 50,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 50 }),
  },
  {
    id: "wins_100",
    name: "Champion",
    description: "Win 100 matches",
    category: "milestone",
    icon: "crown",
    rarity: "rare",
    group: "wins",
    tier: 4,
    check: (ctx) => ctx.overall.totalWins >= 100,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 100 }),
  },
  {
    id: "wins_250",
    name: "Conqueror",
    description: "Win 250 matches",
    category: "milestone",
    icon: "trophy",
    rarity: "epic",
    group: "wins",
    tier: 5,
    check: (ctx) => ctx.overall.totalWins >= 250,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 250 }),
  },
  {
    id: "wins_500",
    name: "Dominator",
    description: "Win 500 matches",
    category: "milestone",
    icon: "gem",
    rarity: "legendary",
    group: "wins",
    tier: 6,
    check: (ctx) => ctx.overall.totalWins >= 500,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 500 }),
  },
  {
    id: "wins_1000",
    name: "Apex Predator",
    description: "Win 1,000 matches",
    category: "milestone",
    icon: "infinity",
    rarity: "legendary",
    group: "wins",
    tier: 7,
    check: (ctx) => ctx.overall.totalWins >= 1000,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 1000 }),
  },
  {
    id: "wins_2500",
    name: "Unbreakable",
    description: "Win 2,500 matches",
    category: "milestone",
    icon: "infinity",
    rarity: "legendary",
    group: "wins",
    tier: 8,
    check: (ctx) => ctx.overall.totalWins >= 2500,
    progress: (ctx) => ({ current: ctx.overall.totalWins, target: 2500 }),
  },

  // ══════════════════════════════════════════
  // STREAKS (tiered)
  // ══════════════════════════════════════════
  {
    id: "streak_3",
    name: "Hot Hand",
    description: "Achieve a 3-win streak",
    category: "streak",
    icon: "flame",
    rarity: "common",
    group: "streaks",
    tier: 1,
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 3,
    progress: (ctx) => ({ current: ctx.overall.streaks.longestWinStreak, target: 3 }),
  },
  {
    id: "streak_5",
    name: "On Fire",
    description: "Achieve a 5-win streak",
    category: "streak",
    icon: "star",
    rarity: "uncommon",
    group: "streaks",
    tier: 2,
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 5,
    progress: (ctx) => ({ current: ctx.overall.streaks.longestWinStreak, target: 5 }),
  },
  {
    id: "streak_10",
    name: "Unstoppable",
    description: "Achieve a 10-win streak",
    category: "streak",
    icon: "bolt",
    rarity: "rare",
    group: "streaks",
    tier: 3,
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 10,
    progress: (ctx) => ({ current: ctx.overall.streaks.longestWinStreak, target: 10 }),
  },
  {
    id: "streak_15",
    name: "Godlike",
    description: "Achieve a 15-win streak",
    category: "streak",
    icon: "gem",
    rarity: "epic",
    group: "streaks",
    tier: 4,
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 15,
    progress: (ctx) => ({ current: ctx.overall.streaks.longestWinStreak, target: 15 }),
  },
  {
    id: "streak_20",
    name: "Transcendent",
    description: "Achieve a 20-win streak",
    category: "streak",
    icon: "infinity",
    rarity: "legendary",
    group: "streaks",
    tier: 5,
    check: (ctx) => ctx.overall.streaks.longestWinStreak >= 20,
    progress: (ctx) => ({ current: ctx.overall.streaks.longestWinStreak, target: 20 }),
  },

  // ══════════════════════════════════════════
  // HERO MASTERY (tiered)
  // ══════════════════════════════════════════
  {
    id: "hero_loyalty",
    name: "Hero Loyalty",
    description: "Play 20+ matches with one hero",
    category: "mastery",
    icon: "shield",
    rarity: "uncommon",
    group: "hero_mastery",
    tier: 1,
    check: (ctx) => realHeroStats(ctx).some((h) => h.totalMatches >= 20),
    progress: (ctx) => ({ current: Math.max(0, ...realHeroStats(ctx).map((h) => h.totalMatches)), target: 20 }),
  },
  {
    id: "hero_specialist",
    name: "Specialist",
    description: "Play 50+ matches with one hero",
    category: "mastery",
    icon: "target",
    rarity: "rare",
    group: "hero_mastery",
    tier: 2,
    check: (ctx) => realHeroStats(ctx).some((h) => h.totalMatches >= 50),
    progress: (ctx) => ({ current: Math.max(0, ...realHeroStats(ctx).map((h) => h.totalMatches)), target: 50 }),
  },
  {
    id: "hero_devoted",
    name: "Devoted",
    description: "Play 100+ matches with one hero",
    category: "mastery",
    icon: "shield",
    rarity: "epic",
    group: "hero_mastery",
    tier: 3,
    check: (ctx) => realHeroStats(ctx).some((h) => h.totalMatches >= 100),
    progress: (ctx) => ({ current: Math.max(0, ...realHeroStats(ctx).map((h) => h.totalMatches)), target: 100 }),
  },
  {
    id: "hero_one_trick",
    name: "One Trick",
    description: "Play 250+ matches with one hero",
    category: "mastery",
    icon: "target",
    rarity: "legendary",
    group: "hero_mastery",
    tier: 4,
    check: (ctx) => realHeroStats(ctx).some((h) => h.totalMatches >= 250),
    progress: (ctx) => ({ current: Math.max(0, ...realHeroStats(ctx).map((h) => h.totalMatches)), target: 250 }),
  },

  // ══════════════════════════════════════════
  // HERO EXPLORATION (tiered)
  // ══════════════════════════════════════════
  {
    id: "heroes_3",
    name: "Explorer",
    description: "Play 3 different heroes",
    category: "exploration",
    icon: "compass",
    rarity: "common",
    group: "heroes_played",
    tier: 1,
    check: (ctx) => realHeroStats(ctx).length >= 3,
    progress: (ctx) => ({ current: realHeroStats(ctx).length, target: 3 }),
  },
  {
    id: "heroes_5",
    name: "Versatile",
    description: "Play 5 different heroes",
    category: "exploration",
    icon: "masks",
    rarity: "uncommon",
    group: "heroes_played",
    tier: 2,
    check: (ctx) => realHeroStats(ctx).length >= 5,
    progress: (ctx) => ({ current: realHeroStats(ctx).length, target: 5 }),
  },
  {
    id: "heroes_10",
    name: "Jack of All Trades",
    description: "Play 10 different heroes",
    category: "exploration",
    icon: "cards",
    rarity: "rare",
    group: "heroes_played",
    tier: 3,
    check: (ctx) => realHeroStats(ctx).length >= 10,
    progress: (ctx) => ({ current: realHeroStats(ctx).length, target: 10 }),
  },
  {
    id: "heroes_20",
    name: "Shapeshifter",
    description: "Play 20 different heroes",
    category: "exploration",
    icon: "masks",
    rarity: "epic",
    group: "heroes_played",
    tier: 4,
    check: (ctx) => realHeroStats(ctx).length >= 20,
    progress: (ctx) => ({ current: realHeroStats(ctx).length, target: 20 }),
  },

  // ══════════════════════════════════════════
  // OPPONENTS (tiered)
  // ══════════════════════════════════════════
  {
    id: "opponents_10",
    name: "Social Butterfly",
    description: "Play against 10 different opponents",
    category: "exploration",
    icon: "people",
    rarity: "common",
    group: "opponents",
    tier: 1,
    check: (ctx) => ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length >= 10,
    progress: (ctx) => ({ current: ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length, target: 10 }),
  },
  {
    id: "opponents_25",
    name: "Regular",
    description: "Play against 25 different opponents",
    category: "exploration",
    icon: "people",
    rarity: "uncommon",
    group: "opponents",
    tier: 2,
    check: (ctx) => ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length >= 25,
    progress: (ctx) => ({ current: ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length, target: 25 }),
  },
  {
    id: "opponents_50",
    name: "Community Pillar",
    description: "Play against 50 different opponents",
    category: "exploration",
    icon: "people",
    rarity: "rare",
    group: "opponents",
    tier: 3,
    check: (ctx) => ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length >= 50,
    progress: (ctx) => ({ current: ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length, target: 50 }),
  },
  {
    id: "opponents_100",
    name: "The Arena",
    description: "Play against 100 different opponents",
    category: "exploration",
    icon: "people",
    rarity: "epic",
    group: "opponents",
    tier: 4,
    check: (ctx) => ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length >= 100,
    progress: (ctx) => ({ current: ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").length, target: 100 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: ARMORY (tiered)
  // ══════════════════════════════════════════
  {
    id: "armory_10",
    name: "Armory Regular",
    description: "Play 10 Armory matches",
    category: "exploration",
    icon: "shield",
    rarity: "common",
    group: "armory",
    tier: 1,
    check: (ctx) => countEventType(ctx, "Armory") >= 10,
    progress: (ctx) => ({ current: countEventType(ctx, "Armory"), target: 10 }),
  },
  {
    id: "armory_50",
    name: "Armory Veteran",
    description: "Play 50 Armory matches",
    category: "exploration",
    icon: "shield",
    rarity: "uncommon",
    group: "armory",
    tier: 2,
    check: (ctx) => countEventType(ctx, "Armory") >= 50,
    progress: (ctx) => ({ current: countEventType(ctx, "Armory"), target: 50 }),
  },
  {
    id: "armory_200",
    name: "Armory Legend",
    description: "Play 200 Armory matches",
    category: "exploration",
    icon: "shield",
    rarity: "rare",
    group: "armory",
    tier: 3,
    check: (ctx) => countEventType(ctx, "Armory") >= 200,
    progress: (ctx) => ({ current: countEventType(ctx, "Armory"), target: 200 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: SKIRMISH (tiered)
  // ══════════════════════════════════════════
  {
    id: "skirmish_10",
    name: "Skirmisher",
    description: "Play 10 Skirmish matches",
    category: "exploration",
    icon: "swords",
    rarity: "common",
    group: "skirmish",
    tier: 1,
    check: (ctx) => countEventType(ctx, "Skirmish") >= 10,
    progress: (ctx) => ({ current: countEventType(ctx, "Skirmish"), target: 10 }),
  },
  {
    id: "skirmish_50",
    name: "Skirmish Veteran",
    description: "Play 50 Skirmish matches",
    category: "exploration",
    icon: "swords",
    rarity: "uncommon",
    group: "skirmish",
    tier: 2,
    check: (ctx) => countEventType(ctx, "Skirmish") >= 50,
    progress: (ctx) => ({ current: countEventType(ctx, "Skirmish"), target: 50 }),
  },
  {
    id: "skirmish_100",
    name: "Skirmish Legend",
    description: "Play 100 Skirmish matches",
    category: "exploration",
    icon: "swords",
    rarity: "rare",
    group: "skirmish",
    tier: 3,
    check: (ctx) => countEventType(ctx, "Skirmish") >= 100,
    progress: (ctx) => ({ current: countEventType(ctx, "Skirmish"), target: 100 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: PROQUEST (tiered)
  // ══════════════════════════════════════════
  {
    id: "pq_5",
    name: "Quester",
    description: "Play 5 ProQuest matches",
    category: "exploration",
    icon: "compass",
    rarity: "common",
    group: "proquest",
    tier: 1,
    check: (ctx) => countEventType(ctx, "ProQuest") >= 5,
    progress: (ctx) => ({ current: countEventType(ctx, "ProQuest"), target: 5 }),
  },
  {
    id: "pq_25",
    name: "Quest Veteran",
    description: "Play 25 ProQuest matches",
    category: "exploration",
    icon: "compass",
    rarity: "uncommon",
    group: "proquest",
    tier: 2,
    check: (ctx) => countEventType(ctx, "ProQuest") >= 25,
    progress: (ctx) => ({ current: countEventType(ctx, "ProQuest"), target: 25 }),
  },
  {
    id: "pq_75",
    name: "Quest Legend",
    description: "Play 75 ProQuest matches",
    category: "exploration",
    icon: "compass",
    rarity: "rare",
    group: "proquest",
    tier: 3,
    check: (ctx) => countEventType(ctx, "ProQuest") >= 75,
    progress: (ctx) => ({ current: countEventType(ctx, "ProQuest"), target: 75 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: ROAD TO NATIONALS (tiered)
  // ══════════════════════════════════════════
  {
    id: "rtn_5",
    name: "Road Tripper",
    description: "Play 5 Road to Nationals matches",
    category: "exploration",
    icon: "trending",
    rarity: "common",
    group: "rtn",
    tier: 1,
    check: (ctx) => countEventType(ctx, "Road to Nationals") >= 5,
    progress: (ctx) => ({ current: countEventType(ctx, "Road to Nationals"), target: 5 }),
  },
  {
    id: "rtn_25",
    name: "Road Warrior",
    description: "Play 25 Road to Nationals matches",
    category: "exploration",
    icon: "trending",
    rarity: "uncommon",
    group: "rtn",
    tier: 2,
    check: (ctx) => countEventType(ctx, "Road to Nationals") >= 25,
    progress: (ctx) => ({ current: countEventType(ctx, "Road to Nationals"), target: 25 }),
  },
  {
    id: "rtn_75",
    name: "Road Legend",
    description: "Play 75 Road to Nationals matches",
    category: "exploration",
    icon: "trending",
    rarity: "rare",
    group: "rtn",
    tier: 3,
    check: (ctx) => countEventType(ctx, "Road to Nationals") >= 75,
    progress: (ctx) => ({ current: countEventType(ctx, "Road to Nationals"), target: 75 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: BATTLE HARDENED (tiered)
  // ══════════════════════════════════════════
  {
    id: "bh_1",
    name: "Battle Ready",
    description: "Attend a Battle Hardened",
    category: "exploration",
    icon: "sword",
    rarity: "uncommon",
    group: "battle_hardened",
    tier: 1,
    check: (ctx) => countDistinctEvents(ctx, "Battle Hardened") >= 1,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Battle Hardened"), target: 1 }),
  },
  {
    id: "bh_3",
    name: "Hardened",
    description: "Attend 3 Battle Hardened events",
    category: "exploration",
    icon: "sword",
    rarity: "rare",
    group: "battle_hardened",
    tier: 2,
    check: (ctx) => countDistinctEvents(ctx, "Battle Hardened") >= 3,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Battle Hardened"), target: 3 }),
  },
  {
    id: "bh_5",
    name: "Battle Scarred",
    description: "Attend 5 Battle Hardened events",
    category: "exploration",
    icon: "sword",
    rarity: "epic",
    group: "battle_hardened",
    tier: 3,
    check: (ctx) => countDistinctEvents(ctx, "Battle Hardened") >= 5,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Battle Hardened"), target: 5 }),
  },
  {
    id: "bh_10",
    name: "War Machine",
    description: "Attend 10 Battle Hardened events",
    category: "exploration",
    icon: "sword",
    rarity: "legendary",
    group: "battle_hardened",
    tier: 4,
    check: (ctx) => countDistinctEvents(ctx, "Battle Hardened") >= 10,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Battle Hardened"), target: 10 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: THE CALLING (tiered)
  // ══════════════════════════════════════════
  {
    id: "calling_1",
    name: "Answering the Call",
    description: "Attend a Calling",
    category: "exploration",
    icon: "horn",
    rarity: "uncommon",
    group: "calling",
    tier: 1,
    check: (ctx) => countDistinctEvents(ctx, "The Calling") >= 1,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "The Calling"), target: 1 }),
  },
  {
    id: "calling_3",
    name: "Called",
    description: "Attend 3 Callings",
    category: "exploration",
    icon: "horn",
    rarity: "rare",
    group: "calling",
    tier: 2,
    check: (ctx) => countDistinctEvents(ctx, "The Calling") >= 3,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "The Calling"), target: 3 }),
  },
  {
    id: "calling_5",
    name: "Devoted Warrior",
    description: "Attend 5 Callings",
    category: "exploration",
    icon: "horn",
    rarity: "epic",
    group: "calling",
    tier: 3,
    check: (ctx) => countDistinctEvents(ctx, "The Calling") >= 5,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "The Calling"), target: 5 }),
  },
  {
    id: "calling_10",
    name: "Herald",
    description: "Attend 10 Callings",
    category: "exploration",
    icon: "horn",
    rarity: "legendary",
    group: "calling",
    tier: 4,
    check: (ctx) => countDistinctEvents(ctx, "The Calling") >= 10,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "The Calling"), target: 10 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: NATIONALS (tiered)
  // ══════════════════════════════════════════
  {
    id: "nats_1",
    name: "National Pride",
    description: "Attend a Nationals",
    category: "exploration",
    icon: "flag",
    rarity: "rare",
    group: "nationals",
    tier: 1,
    check: (ctx) => countDistinctEvents(ctx, "Nationals") >= 1,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Nationals"), target: 1 }),
  },
  {
    id: "nats_3",
    name: "National Treasure",
    description: "Attend 3 Nationals",
    category: "exploration",
    icon: "flag",
    rarity: "epic",
    group: "nationals",
    tier: 2,
    check: (ctx) => countDistinctEvents(ctx, "Nationals") >= 3,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Nationals"), target: 3 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: PRO TOUR (tiered)
  // ══════════════════════════════════════════
  {
    id: "pt_1",
    name: "Pro Tour Player",
    description: "Attend a Pro Tour",
    category: "exploration",
    icon: "star",
    rarity: "epic",
    group: "protour",
    tier: 1,
    check: (ctx) => countDistinctEvents(ctx, "Pro Tour") >= 1,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Pro Tour"), target: 1 }),
  },
  {
    id: "pt_3",
    name: "Tour Veteran",
    description: "Attend 3 Pro Tours",
    category: "exploration",
    icon: "star",
    rarity: "legendary",
    group: "protour",
    tier: 2,
    check: (ctx) => countDistinctEvents(ctx, "Pro Tour") >= 3,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Pro Tour"), target: 3 }),
  },

  // ══════════════════════════════════════════
  // EVENT TYPE: WORLDS
  // ══════════════════════════════════════════
  {
    id: "worlds_1",
    name: "World Stage",
    description: "Attend a World Championship",
    category: "exploration",
    icon: "globe",
    rarity: "legendary",
    group: "worlds",
    tier: 1,
    check: (ctx) => countDistinctEvents(ctx, "Worlds") >= 1,
    progress: (ctx) => ({ current: countDistinctEvents(ctx, "Worlds"), target: 1 }),
  },

  // ══════════════════════════════════════════
  // EVENT CHAMPION ACHIEVEMENTS
  // ══════════════════════════════════════════
  {
    id: "champion_worlds",
    name: "World Champion",
    description: "Win a World Championship",
    category: "milestone",
    icon: "globe",
    rarity: "legendary",
    check: (ctx) => hasChampionFinish(ctx, "Worlds"),
  },
  {
    id: "champion_protour",
    name: "Pro Tour Champion",
    description: "Win a Pro Tour",
    category: "milestone",
    icon: "star",
    rarity: "legendary",
    check: (ctx) => hasChampionFinish(ctx, "Pro Tour"),
  },
  {
    id: "champion_nationals",
    name: "National Champion",
    description: "Win a Nationals",
    category: "milestone",
    icon: "flag",
    rarity: "legendary",
    check: (ctx) => hasChampionFinish(ctx, "Nationals"),
  },
  {
    id: "champion_calling",
    name: "Calling Champion",
    description: "Win a Calling",
    category: "milestone",
    icon: "horn",
    rarity: "epic",
    check: (ctx) => hasChampionFinish(ctx, "The Calling"),
  },
  {
    id: "champion_bh",
    name: "Battle Hardened Champion",
    description: "Win a Battle Hardened",
    category: "milestone",
    icon: "sword",
    rarity: "epic",
    check: (ctx) => hasChampionFinish(ctx, "Battle Hardened"),
  },
  {
    id: "champion_pq",
    name: "ProQuest Champion",
    description: "Win a ProQuest",
    category: "milestone",
    icon: "compass",
    rarity: "rare",
    check: (ctx) => hasChampionFinish(ctx, "ProQuest"),
  },
  {
    id: "champion_skirmish",
    name: "Skirmish Champion",
    description: "Win a Skirmish",
    category: "milestone",
    icon: "swords",
    rarity: "uncommon",
    check: (ctx) => hasChampionFinish(ctx, "Skirmish"),
  },
  {
    id: "champion_rtn",
    name: "Road to Nationals Champion",
    description: "Win a Road to Nationals",
    category: "milestone",
    icon: "trending",
    rarity: "rare",
    check: (ctx) => hasChampionFinish(ctx, "Road to Nationals"),
  },
  // ══════════════════════════════════════════
  // HERO MASTERY (single)
  // ══════════════════════════════════════════
  {
    id: "hero_master",
    name: "Hero Master",
    description: "Win 60%+ with a hero over 30+ matches",
    category: "mastery",
    icon: "trophy",
    rarity: "epic",
    check: (ctx) => realHeroStats(ctx).some((h) => h.totalMatches >= 30 && h.winRate >= 60),
    progress: (ctx) => {
      const best = realHeroStats(ctx).filter((h) => h.totalMatches >= 10).sort((a, b) => b.winRate - a.winRate)[0];
      return { current: best ? Math.min(best.totalMatches, 30) : 0, target: 30 };
    },
  },

  // ══════════════════════════════════════════
  // FORMAT VARIETY (singles)
  // ══════════════════════════════════════════
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
    progress: (ctx) => ({ current: new Set(ctx.matches.map((m) => m.format)).size, target: 3 }),
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    description: "Play at 5+ different venues",
    category: "exploration",
    icon: "globe",
    rarity: "uncommon",
    group: "venues",
    tier: 1,
    check: (ctx) => {
      const venues = new Set(ctx.matches.map((m) => m.venue).filter(Boolean));
      return venues.size >= 5;
    },
    progress: (ctx) => ({ current: new Set(ctx.matches.map((m) => m.venue).filter(Boolean)).size, target: 5 }),
  },
  {
    id: "world_traveler",
    name: "World Traveler",
    description: "Play at 15+ different venues",
    category: "exploration",
    icon: "globe",
    rarity: "rare",
    group: "venues",
    tier: 2,
    check: (ctx) => {
      const venues = new Set(ctx.matches.map((m) => m.venue).filter(Boolean));
      return venues.size >= 15;
    },
    progress: (ctx) => ({ current: new Set(ctx.matches.map((m) => m.venue).filter(Boolean)).size, target: 15 }),
  },

  // ══════════════════════════════════════════
  // FORMAT SPECIFIC (tiered)
  // ══════════════════════════════════════════
  {
    id: "blitz_10",
    name: "Blitz Runner",
    description: "Play 10 Blitz matches",
    category: "fun",
    icon: "bolt",
    rarity: "common",
    group: "blitz",
    tier: 1,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Blitz).length >= 10,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.Blitz).length, target: 10 }),
  },
  {
    id: "blitz_100",
    name: "Blitz Blaster",
    description: "Play 100 Blitz matches",
    category: "fun",
    icon: "bolt",
    rarity: "rare",
    group: "blitz",
    tier: 2,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Blitz).length >= 100,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.Blitz).length, target: 100 }),
  },
  {
    id: "cc_10",
    name: "CC Grinder",
    description: "Play 10 Classic Constructed matches",
    category: "fun",
    icon: "hammer",
    rarity: "common",
    group: "cc",
    tier: 1,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.ClassicConstructed).length >= 10,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.ClassicConstructed).length, target: 10 }),
  },
  {
    id: "cc_100",
    name: "Constructed Master",
    description: "Play 100 Classic Constructed matches",
    category: "fun",
    icon: "hammer",
    rarity: "rare",
    group: "cc",
    tier: 2,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.ClassicConstructed).length >= 100,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.ClassicConstructed).length, target: 100 }),
  },
  {
    id: "draft_5",
    name: "Drafter",
    description: "Play 5 Draft matches",
    category: "fun",
    icon: "cards",
    rarity: "common",
    group: "draft",
    tier: 1,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Draft).length >= 5,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.Draft).length, target: 5 }),
  },
  {
    id: "draft_25",
    name: "Draft Expert",
    description: "Play 25 Draft matches",
    category: "fun",
    icon: "cards",
    rarity: "rare",
    group: "draft",
    tier: 2,
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Draft).length >= 25,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.Draft).length, target: 25 }),
  },

  // ══════════════════════════════════════════
  // FUN / MISC (singles + small groups)
  // ══════════════════════════════════════════
  {
    id: "peacekeeper",
    name: "Peacekeeper",
    description: "Draw a match",
    category: "fun",
    icon: "handshake",
    rarity: "common",
    group: "draws",
    tier: 1,
    check: (ctx) => ctx.overall.totalDraws >= 1,
    progress: (ctx) => ({ current: ctx.overall.totalDraws, target: 1 }),
  },
  {
    id: "swiss_diplomat",
    name: "Swiss Diplomat",
    description: "Draw 5 matches",
    category: "fun",
    icon: "dove",
    rarity: "uncommon",
    group: "draws",
    tier: 2,
    check: (ctx) => ctx.overall.totalDraws >= 5,
    progress: (ctx) => ({ current: ctx.overall.totalDraws, target: 5 }),
  },
  {
    id: "swiss_army",
    name: "Swiss Army",
    description: "Draw 15 matches",
    category: "fun",
    icon: "dove",
    rarity: "rare",
    group: "draws",
    tier: 3,
    check: (ctx) => ctx.overall.totalDraws >= 15,
    progress: (ctx) => ({ current: ctx.overall.totalDraws, target: 15 }),
  },
  {
    id: "comeback_king",
    name: "Comeback Story",
    description: "Win 50%+ overall after 20+ matches",
    category: "fun",
    icon: "trending",
    rarity: "uncommon",
    check: (ctx) => ctx.matches.length >= 20 && ctx.overall.overallWinRate >= 50,
    progress: (ctx) => ({ current: ctx.matches.length, target: 20 }),
  },
  {
    id: "rival",
    name: "Rival",
    description: "Play the same opponent 5+ times",
    category: "fun",
    icon: "versus",
    rarity: "uncommon",
    group: "rival",
    tier: 1,
    check: (ctx) => ctx.opponentStats.some((o) => o.totalMatches >= 5 && o.opponentName !== "Unknown"),
    progress: (ctx) => ({ current: Math.max(0, ...ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").map((o) => o.totalMatches)), target: 5 }),
  },
  {
    id: "archrival",
    name: "Archrival",
    description: "Play the same opponent 15+ times",
    category: "fun",
    icon: "versus",
    rarity: "rare",
    group: "rival",
    tier: 2,
    check: (ctx) => ctx.opponentStats.some((o) => o.totalMatches >= 15 && o.opponentName !== "Unknown"),
    progress: (ctx) => ({ current: Math.max(0, ...ctx.opponentStats.filter((o) => o.opponentName !== "Unknown").map((o) => o.totalMatches)), target: 15 }),
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
    id: "rated_10",
    name: "Rated Warrior",
    description: "Play 10 rated matches",
    category: "fun",
    icon: "star-badge",
    rarity: "uncommon",
    group: "rated",
    tier: 1,
    check: (ctx) => ctx.matches.filter((m) => m.rated).length >= 10,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.rated).length, target: 10 }),
  },
  {
    id: "rated_50",
    name: "Rated Veteran",
    description: "Play 50 rated matches",
    category: "fun",
    icon: "star-badge",
    rarity: "rare",
    group: "rated",
    tier: 2,
    check: (ctx) => ctx.matches.filter((m) => m.rated).length >= 50,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.rated).length, target: 50 }),
  },
  {
    id: "win_rate_60",
    name: "Consistent",
    description: "Maintain 60%+ win rate over 50+ matches",
    category: "mastery",
    icon: "trending",
    rarity: "rare",
    check: (ctx) => ctx.matches.length >= 50 && ctx.overall.overallWinRate >= 60,
    progress: (ctx) => ({ current: ctx.matches.length >= 50 ? Math.round(ctx.overall.overallWinRate) : 0, target: 60 }),
  },
  {
    id: "win_rate_70",
    name: "Elite",
    description: "Maintain 70%+ win rate over 50+ matches",
    category: "mastery",
    icon: "crown",
    rarity: "epic",
    check: (ctx) => ctx.matches.length >= 50 && ctx.overall.overallWinRate >= 70,
    progress: (ctx) => ({ current: ctx.matches.length >= 50 ? Math.round(ctx.overall.overallWinRate) : 0, target: 70 }),
  },
  {
    id: "sealed_5",
    name: "Sealed Specialist",
    description: "Play 5 Sealed matches",
    category: "fun",
    icon: "cards",
    rarity: "uncommon",
    check: (ctx) => ctx.matches.filter((m) => m.format === GameFormat.Sealed).length >= 5,
    progress: (ctx) => ({ current: ctx.matches.filter((m) => m.format === GameFormat.Sealed).length, target: 5 }),
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
  return ACHIEVEMENTS.filter((a) => a.check(ctx)).map(({ check: _, progress: _p, ...rest }) => rest);
}

/** Get all possible achievements (for progress display) */
export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS.map(({ check: _, progress: _p, ...rest }) => rest);
}

/** Compute progress for all achievements */
export function getAchievementProgress(
  matches: MatchRecord[],
  overall: OverallStats,
  heroStats: HeroStats[],
  opponentStats: OpponentStats[],
): Record<string, { current: number; target: number }> {
  const ctx: CheckContext = { matches, overall, heroStats, opponentStats };
  const result: Record<string, { current: number; target: number }> = {};
  for (const a of ACHIEVEMENTS) {
    if (a.progress) {
      result[a.id] = a.progress(ctx);
    }
  }
  return result;
}

/** Rarity colors for styling */
export const rarityColors: Record<Achievement["rarity"], { text: string; bg: string; border: string }> = {
  common: { text: "text-amber-200", bg: "bg-amber-200/10", border: "border-amber-200/30" },
  uncommon: { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  rare: { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  epic: { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  legendary: { text: "text-fab-gold", bg: "bg-fab-gold/10", border: "border-fab-gold/30" },
};
