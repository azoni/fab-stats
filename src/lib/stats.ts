import type {
  MatchRecord,
  HeroStats,
  MatchupRecord,
  OverallStats,
  StreakInfo,
  OpponentStats,
  TrendDataPoint,
  VenueStats,
  EventTypeStats,
  EventStats,
} from "@/types";
import { MatchResult } from "@/types";
import { localDate } from "@/lib/constants";

export const FORMAT_SHORT: Record<string, string> = {
  "Classic Constructed": "CC",
  "Blitz": "Blitz",
  "Living Legend": "LL",
  "Draft": "Draft",
  "Sealed": "Sealed",
  "Clash": "Clash",
  "Ultimate Pit Fight": "UPF",
  "Silver Age": "SA",
  "Other": "Other",
};

export function formatShortLabel(format?: string): string {
  if (!format) return "";
  return FORMAT_SHORT[format] || format;
}

/** Count wins/losses/draws in a single pass over a match array. */
function countResults(matches: MatchRecord[]): { wins: number; losses: number; draws: number; byes: number } {
  let wins = 0, losses = 0, draws = 0, byes = 0;
  for (const m of matches) {
    switch (m.result) {
      case MatchResult.Win: wins++; break;
      case MatchResult.Loss: losses++; break;
      case MatchResult.Draw: draws++; break;
      case MatchResult.Bye: byes++; break;
    }
  }
  return { wins, losses, draws, byes };
}

export function computeOverallStats(matches: MatchRecord[]): OverallStats {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      || getRoundNumber(a) - getRoundNumber(b)
      || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const { wins: totalWins, losses: totalLosses, draws: totalDraws, byes: totalByes } = countResults(sorted);
  const totalMatches = totalWins + totalLosses + totalDraws;
  const overallWinRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  return {
    totalMatches,
    totalWins,
    totalLosses,
    totalDraws,
    totalByes,
    overallWinRate,
    streaks: computeStreaks(sorted),
  };
}

export function computeHeroStats(matches: MatchRecord[], splitByFormat = false): HeroStats[] {
  const heroMap = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const key = splitByFormat ? `${match.heroPlayed}::${match.format}` : match.heroPlayed;
    const existing = heroMap.get(key) ?? [];
    existing.push(match);
    heroMap.set(key, existing);
  }

  return Array.from(heroMap.entries())
    .map(([key, heroMatches]) => {
      const [heroName, format] = splitByFormat ? key.split("::") : [key, undefined];
      const { wins, losses, draws } = countResults(heroMatches);
      const played = wins + losses + draws;

      return {
        heroName,
        format,
        totalMatches: played,
        wins,
        losses,
        draws,
        winRate: played > 0 ? (wins / played) * 100 : 0,
        matchups: computeMatchups(heroMatches),
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

function computeMatchups(heroMatches: MatchRecord[]): MatchupRecord[] {
  const oppMap = new Map<string, MatchRecord[]>();

  for (const match of heroMatches) {
    const opp = match.opponentHero || "Unknown";
    const existing = oppMap.get(opp) ?? [];
    existing.push(match);
    oppMap.set(opp, existing);
  }

  return Array.from(oppMap.entries())
    .map(([opponentHero, matchupMatches]) => {
      const { wins, losses, draws } = countResults(matchupMatches);
      const played = wins + losses + draws;

      return {
        opponentHero,
        totalMatches: played,
        wins,
        losses,
        draws,
        winRate: played > 0 ? (wins / played) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

export function computeStreaks(sortedMatches: MatchRecord[]): StreakInfo {
  if (sortedMatches.length === 0) {
    return { currentStreak: null, longestWinStreak: 0, longestLossStreak: 0 };
  }

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const match of sortedMatches) {
    if (match.result === MatchResult.Win) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (match.result === MatchResult.Loss) {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else if (match.result === MatchResult.Bye) {
      // Byes are skipped — they don't break or extend streaks
    } else {
      // Draws break streaks
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  const lastMatch = sortedMatches[sortedMatches.length - 1];
  let currentStreak: StreakInfo["currentStreak"] = null;
  if (currentWinStreak > 0) {
    currentStreak = { type: MatchResult.Win, count: currentWinStreak };
  } else if (currentLossStreak > 0) {
    currentStreak = { type: MatchResult.Loss, count: currentLossStreak };
  } else if (lastMatch.result === MatchResult.Draw) {
    currentStreak = null;
  }

  return { currentStreak, longestWinStreak, longestLossStreak };
}

/** Normalize an opponent name: trim, handle "Last, First" → "First Last" */
export function normalizeOpponentName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "unknown";
  const commaMatch = trimmed.match(/^(.+?),\s+(.+)$/);
  if (commaMatch) {
    return `${commaMatch[2]} ${commaMatch[1]}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function computeOpponentStats(matches: MatchRecord[]): OpponentStats[] {
  // Exclude byes — they aren't real opponents
  matches = matches.filter((m) => m.result !== MatchResult.Bye && !/^bye$/i.test(m.opponentName?.trim() || ""));

  // Build gemId → most recent display name
  const gemIdToName = new Map<string, { name: string; date: string }>();
  for (const match of matches) {
    if (match.opponentGemId) {
      const name = match.opponentName?.trim() || "Unknown";
      const existing = gemIdToName.get(match.opponentGemId);
      if (!existing || match.date > existing.date) {
        gemIdToName.set(match.opponentGemId, { name, date: match.date });
      }
    }
  }

  // Build normalized name → best display name (most recent, for name-only matches)
  const normalizedToDisplay = new Map<string, { name: string; date: string }>();
  for (const match of matches) {
    if (!match.opponentGemId) {
      const raw = match.opponentName?.trim() || "Unknown";
      const norm = normalizeOpponentName(raw);
      const existing = normalizedToDisplay.get(norm);
      if (!existing || match.date > existing.date) {
        normalizedToDisplay.set(norm, { name: raw, date: match.date });
      }
    }
  }

  // Cross-reference: normalized name → gemId (so name-only matches merge with gemId matches)
  const nameToGemId = new Map<string, string>();
  for (const match of matches) {
    if (match.opponentGemId && match.opponentName) {
      const norm = normalizeOpponentName(match.opponentName.trim());
      nameToGemId.set(norm, match.opponentGemId);
    }
  }

  // Group matches by key (gemId or normalized name, with cross-reference)
  const oppMap = new Map<string, MatchRecord[]>();
  for (const match of matches) {
    let key: string;
    if (match.opponentGemId) {
      key = `gemid:${match.opponentGemId}`;
    } else {
      const norm = normalizeOpponentName(match.opponentName?.trim() || "Unknown");
      const linkedGemId = nameToGemId.get(norm);
      key = linkedGemId ? `gemid:${linkedGemId}` : `name:${norm}`;
    }
    const existing = oppMap.get(key) ?? [];
    existing.push(match);
    oppMap.set(key, existing);
  }

  return Array.from(oppMap.entries())
    .map(([key, oppMatches]) => {
      let opponentName: string;
      if (key.startsWith("gemid:")) {
        opponentName = gemIdToName.get(key.slice(6))?.name || "Unknown";
      } else {
        opponentName = normalizedToDisplay.get(key.slice(5))?.name || "Unknown";
      }

      const { wins, losses, draws } = countResults(oppMatches);
      const heroesPlayed = [...new Set(oppMatches.map((m) => m.heroPlayed))];
      const opponentHeroes = [...new Set(oppMatches.map((m) => m.opponentHero))];

      return {
        opponentName,
        totalMatches: oppMatches.length,
        wins,
        losses,
        draws,
        winRate: oppMatches.length > 0 ? (wins / oppMatches.length) * 100 : 0,
        heroesPlayed,
        opponentHeroes,
        matches: oppMatches.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

export function computeTrends(
  matches: MatchRecord[],
  granularity: "weekly" | "monthly" = "weekly"
): TrendDataPoint[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      || getRoundNumber(a) - getRoundNumber(b)
      || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (sorted.length === 0) return [];

  const groups = new Map<string, MatchRecord[]>();

  for (const match of sorted) {
    const d = localDate(match.date);
    let key: string;
    if (granularity === "weekly") {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().split("T")[0];
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    const existing = groups.get(key) ?? [];
    existing.push(match);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([label, groupMatches]) => {
    const { wins, losses, draws } = countResults(groupMatches);
    const played = wins + losses + draws;
    return {
      label,
      matches: played,
      wins,
      winRate: played > 0 ? (wins / played) * 100 : 0,
    };
  });
}

export function computeRollingWinRate(
  matches: MatchRecord[],
  windowSize: number = 10
): { index: number; winRate: number; date: string }[] {
  if (windowSize <= 0) return [];

  const sorted = [...matches]
    .filter((m) => m.result !== MatchResult.Bye)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        || getRoundNumber(a) - getRoundNumber(b)
        || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const results: { index: number; winRate: number; date: string }[] = [];
  let windowWins = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].result === MatchResult.Win) windowWins++;
    if (i >= windowSize && sorted[i - windowSize].result === MatchResult.Win) windowWins--;
    if (i >= windowSize - 1) {
      results.push({
        index: i,
        winRate: (windowWins / windowSize) * 100,
        date: sorted[i].date,
      });
    }
  }

  return results;
}

/** Competitive event types ordered by prestige (lowest first).
 *  When an event name contains multiple keywords (e.g. side events at major
 *  tournaments), we pick the LOWEST tier — "Battle Hardened at Worlds" is a
 *  Battle Hardened, not a Worlds event. */
const COMPETITIVE_EVENT_TYPES: [RegExp, string][] = [
  [/super armory|super armorys/i, "Super Armory"],
  [/skirmish/i, "Skirmish"],
  [/road to national|\brtn\b/i, "Road to Nationals"],
  [/proquest|pro quest|\bpq\b/i, "ProQuest"],
  [/showdown/i, "Showdown"],
  [/battleground/i, "Battlegrounds"],
  [/battle hardened|\bbh\b/i, "Battle Hardened"],
  [/\bcalling\b/i, "The Calling"],
  [/\bnational/i, "Nationals"],
  [/pro tour/i, "Pro Tour"],
  [/worlds|world championship/i, "Worlds"],
  [/path to.*(pro tour)|convention.*5k|\bldxp\b/i, "Path to Pro Tour"],
];

/** Find the lowest-prestige competitive event type that matches the text. */
function classifyCompetitiveEvent(text: string): string | null {
  for (const [pattern, type] of COMPETITIVE_EVENT_TYPES) {
    if (pattern.test(text)) return type;
  }
  return null;
}

export function guessEventTypeFromNotes(notes: string): string {
  const lower = notes.toLowerCase();
  // Local/casual events — always win (super armory before armory)
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("pre release") || lower.includes("pre-release")) return "Pre-Release";
  if (/super armory|super armorys/i.test(lower)) return "Super Armory";
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("on demand")) return "On Demand";
  // Competitive events — pick lowest prestige when multiple match
  const competitive = classifyCompetitiveEvent(lower);
  if (competitive) return competitive;
  if (lower.includes("championship") || lower.includes("invitation") || lower.includes("invitational")) return "Championship";
  return "Other";
}

/** Derive the best event type from both the explicit eventType and the event name.
 *  Event names like "Calling Seattle - Battle Hardened..." should be "Battle Hardened"
 *  even if the eventType was set to something else by the import source.
 *  When multiple competitive keywords appear, the lowest-prestige one wins
 *  (side events at major tournaments carry the parent name). */
export function refineEventType(eventType: string, eventName: string): string {
  const lower = eventName.toLowerCase();
  // Local/casual events — these always win (super armory before armory)
  if (/super armory|super armorys/i.test(lower)) return "Super Armory";
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("pre-release") || lower.includes("prerelease")) return "Pre-Release";
  // Explicitly catch "Road to Nationals" / "RTN" before general classification,
  // even if the provided eventType says "Nationals"
  if (/road to national|\brtn\b/i.test(lower)) return "Road to Nationals";
  // Competitive events — pick lowest prestige when multiple match
  const competitive = classifyCompetitiveEvent(lower);
  if (competitive) return competitive;
  // Also check the provided eventType string itself for RTN patterns
  // (GEM may set eventType to "Road to Nationals" but name could be generic)
  if (/road to national|\brtn\b/i.test(eventType.toLowerCase())) return "Road to Nationals";
  // Fall back to provided eventType (don't promote random "invitational" / "championship" store events)
  return eventType;
}

export function getEventType(match: MatchRecord): string {
  if (match.eventTypeOverride) return match.eventTypeOverride;
  const eventName = match.notes?.split(" | ")[0] || "";
  if (match.eventType) return refineEventType(match.eventType, eventName);
  if (match.notes) return guessEventTypeFromNotes(match.notes);
  return "Other";
}

function sanitizeVenue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length <= 2) return null;
  const lower = trimmed.toLowerCase();
  // Days of the week
  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(lower)) return null;
  // Prize / reward descriptions (e.g. "4x Cold Foil ...")
  if (/^\d+x\s/i.test(trimmed)) return null;
  // Prize / award language
  if (/awarded to|promo cards?|cold foil|rainbow foil|extended art/i.test(lower)) return null;
  // Pure numbers, rating changes, XP
  if (/^\d+$/.test(trimmed) || /^[+-]\d+$/.test(trimmed)) return null;
  // Score lines
  if (/^\d+\s*-\s*\d+(\s*-\s*\d+)?$/.test(trimmed)) return null;
  // Metadata lines mistakenly stored as venue
  if (/^(Classic Constructed|Blitz|Sealed|Draft|Clash|Rated|Not Rated|Unrated|Competitive|Casual)$/i.test(lower)) return null;
  // Player count lines
  if (/^\d+\s*(players?|participants?)$/i.test(lower)) return null;
  return trimmed;
}

function getVenue(match: MatchRecord): string {
  if (!match.venue) return "Unknown";
  return sanitizeVenue(match.venue) || "Unknown";
}

export function computeEventTypeStats(matches: MatchRecord[]): EventTypeStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const et = getEventType(match);
    const existing = map.get(et) ?? [];
    existing.push(match);
    map.set(et, existing);
  }

  return Array.from(map.entries())
    .map(([eventType, group]) => {
      const { wins, losses, draws } = countResults(group);
      const played = wins + losses + draws;
      return {
        eventType,
        totalMatches: played,
        wins,
        losses,
        draws,
        winRate: played > 0 ? (wins / played) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

export function computeVenueStats(matches: MatchRecord[]): VenueStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const v = getVenue(match);
    const existing = map.get(v) ?? [];
    existing.push(match);
    map.set(v, existing);
  }

  return Array.from(map.entries())
    .map(([venue, group]) => {
      const { wins, losses, draws } = countResults(group);
      const played = wins + losses + draws;
      return {
        venue,
        totalMatches: played,
        wins,
        losses,
        draws,
        winRate: played > 0 ? (wins / played) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

const EVENT_PRESTIGE: Record<string, number> = {
  "Worlds": 12,
  "Path to Pro Tour": 11,
  "Pro Tour": 10,
  "The Calling": 9,
  "Nationals": 8,
  "Battle Hardened": 7,
  "Battlegrounds": 6,
  "Showdown": 5,
  "Road to Nationals": 4,
  "ProQuest": 3,
  "Championship": 3,
  "Super Armory": 2,
  "Skirmish": 2,
  "On Demand": 1,
};

export function computeBestFinish(
  eventStats: EventStats[],
  overrides?: Record<string, PlayoffFinish["type"]>,
): { label: string; eventName: string; eventDate: string; hero?: string } | null {
  // Use playoff finish data for best finish (reuses same logic)
  const finishes = computePlayoffFinishes(eventStats, overrides);
  if (finishes.length === 0) return null;

  const rankMap: Record<string, number> = { top8: 1, top4: 2, finalist: 3, champion: 4 };
  const labelMap: Record<string, string> = { top8: "Top 8", top4: "Top 4", finalist: "Finalist", champion: "Champion" };

  let best = finishes[0];
  for (const f of finishes) {
    const fRank = rankMap[f.type] || 0;
    const bestRank = rankMap[best.type] || 0;
    if (fRank > bestRank) {
      best = f;
    } else if (fRank === bestRank) {
      // Same finish type — prefer more prestigious event
      const fPrestige = EVENT_PRESTIGE[f.eventType] || 0;
      const bestPrestige = EVENT_PRESTIGE[best.eventType] || 0;
      if (fPrestige > bestPrestige) {
        best = f;
      }
    }
  }

  // Find the hero played at this event (most common non-Unknown hero)
  const ev = eventStats.find((e) => e.eventName === best.eventName && e.eventDate === best.eventDate);
  let hero: string | undefined;
  if (ev) {
    const heroCounts: Record<string, number> = {};
    for (const m of ev.matches) {
      if (m.heroPlayed && m.heroPlayed !== "Unknown") {
        heroCounts[m.heroPlayed] = (heroCounts[m.heroPlayed] || 0) + 1;
      }
    }
    const sorted = Object.entries(heroCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) hero = sorted[0][0];
  }

  return { label: labelMap[best.type] || best.type, eventName: best.eventName, eventDate: best.eventDate, hero };
}

export interface PlayoffFinish {
  type: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
  hero?: string;
}

function isPlayoffRound(roundInfo: string): boolean {
  return /^Round P/i.test(roundInfo) ||
    /^P\d/i.test(roundInfo) ||
    /Top\s*8/i.test(roundInfo) ||
    /Top\s*4/i.test(roundInfo) ||
    /Finals?$/i.test(roundInfo) ||
    /Semi/i.test(roundInfo) ||
    /Playoff/i.test(roundInfo) ||
    /Quarter/i.test(roundInfo);
}

export function computePlayoffFinishes(
  eventStats: EventStats[],
  overrides?: Record<string, PlayoffFinish["type"]>,
): PlayoffFinish[] {
  const finishes: PlayoffFinish[] = [];

  for (const event of eventStats) {
    // Trust the eventType from computeEventStats — it already applied eventTypeOverride
    // and refineEventType. Don't re-refine or overrides get undone.
    const raw = event.eventType || "Other";
    // Non-competitive event types with a Top 8 get shown as "Other" (marble icons)
    // Unrated events with major event types get downgraded to "Other" too
    const isMajorType = ["Battle Hardened", "The Calling", "Battlegrounds", "Nationals", "Pro Tour", "Worlds", "Path to Pro Tour"].includes(raw);
    const refinedEventType = (raw === "Armory" || raw === "Pre-Release" || raw === "On Demand" || (isMajorType && !event.rated)) ? "Other" : raw;

    // Check for manual override first
    const overrideKey = `${event.eventName}::${event.eventDate}`;
    if (overrides?.[overrideKey]) {
      finishes.push({
        type: overrides[overrideKey],
        eventName: event.eventName,
        eventDate: event.eventDate,
        format: event.format,
        eventType: refinedEventType,
        hero: event.matches[0]?.heroPlayed,
      });
      continue;
    }

    const playoffMatches: MatchRecord[] = [];

    for (const match of event.matches) {
      const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
      if (isPlayoffRound(roundInfo)) {
        playoffMatches.push(match);
      }
    }

    if (playoffMatches.length === 0) {
      // For Skirmish events without playoffs (not enough players for top cut),
      // an undefeated record means the player won the event
      if (refinedEventType === "Skirmish") {
        const { wins, losses } = countResults(event.matches);
        if (wins > 0 && losses === 0) {
          finishes.push({
            type: "champion",
            eventName: event.eventName,
            eventDate: event.eventDate,
            format: event.format,
            eventType: refinedEventType,
            hero: event.matches[0]?.heroPlayed,
          });
        }
      }
      continue;
    }

    const { wins: playoffWins, losses: playoffLosses } = countResults(playoffMatches);

    // Detect which rounds were played from explicit round names
    const roundInfos = playoffMatches.map((m) => (m.notes?.split(" | ")[1]?.trim() || "").toLowerCase());
    const playedFinals = roundInfos.some((r) => /finals?$/i.test(r) || /\bfinal\b/i.test(r));
    const playedSemis = roundInfos.some((r) => /semi/i.test(r) || /top\s*4/i.test(r));

    // Check if the last playoff match was a loss (lost in the final round they played)
    const lastPlayoffResult = playoffMatches[playoffMatches.length - 1]?.result;
    const lostLastPlayoff = lastPlayoffResult === MatchResult.Loss;

    let finishType: PlayoffFinish["type"];

    // No losses in playoffs = won the whole bracket
    if (playoffLosses === 0 && playoffWins > 0) {
      finishType = "champion";
    } else if (playedFinals) {
      // Played in finals but has a loss → lost the finals
      finishType = "finalist";
    } else if (playedSemis) {
      // Played in semis but not finals → lost in semis
      finishType = "top4";
    } else if (lostLastPlayoff) {
      // Lost their last playoff match — they were eliminated at that round
      // Use total playoff rounds played to determine bracket depth
      const totalPlayoffRounds = playoffMatches.length;
      if (totalPlayoffRounds >= 3) finishType = "finalist"; // Lost in round 3+ = at least finalist
      else if (totalPlayoffRounds === 2) finishType = "top4";
      else finishType = "top8";
    } else if (playoffWins >= 3) {
      // Won 3+ with no loss at the end — champion
      finishType = "champion";
    } else if (playoffWins === 2) {
      finishType = "finalist";
    } else if (playoffWins === 1) {
      finishType = "top4";
    } else {
      finishType = "top8";
    }

    finishes.push({
      type: finishType,
      eventName: event.eventName,
      eventDate: event.eventDate,
      format: event.format,
      eventType: refinedEventType,
      hero: event.matches[0]?.heroPlayed,
    });
  }

  return finishes.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

export interface MinorEventFinish {
  type: "undefeated" | "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
  hero?: string;
}

const MINOR_EVENT_TYPES = new Set(["Armory", "Super Armory", "Skirmish", "Road to Nationals", "ProQuest", "Showdown"]);

export function computeMinorEventFinishes(eventStats: EventStats[]): MinorEventFinish[] {
  const finishes: MinorEventFinish[] = [];

  for (const event of eventStats) {
    const raw = event.eventType || "Other";
    if (!MINOR_EVENT_TYPES.has(raw)) continue;

    const hero = event.matches[0]?.heroPlayed;

    // Armory: only "undefeated" (wins > 0, losses === 0)
    if (raw === "Armory") {
      if (event.wins > 0 && event.losses === 0) {
        finishes.push({
          type: "undefeated",
          eventName: event.eventName,
          eventDate: event.eventDate,
          format: event.format,
          eventType: raw,
          hero,
        });
      }
      continue;
    }

    // Skirmish, RTN, PQ: use playoff detection
    const playoffMatches: MatchRecord[] = [];
    for (const match of event.matches) {
      const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
      if (isPlayoffRound(roundInfo)) {
        playoffMatches.push(match);
      }
    }

    if (playoffMatches.length === 0) {
      // Skirmish without top cut: undefeated = champion
      if (raw === "Skirmish" && event.wins > 0 && event.losses === 0) {
        finishes.push({ type: "champion", eventName: event.eventName, eventDate: event.eventDate, format: event.format, eventType: raw, hero });
      }
      continue;
    }

    const { wins: playoffWins, losses: playoffLosses } = countResults(playoffMatches);
    const roundInfos = playoffMatches.map((m) => (m.notes?.split(" | ")[1]?.trim() || "").toLowerCase());
    const playedFinals = roundInfos.some((r) => /finals?$/i.test(r) || /\bfinal\b/i.test(r));
    const playedSemis = roundInfos.some((r) => /semi/i.test(r) || /top\s*4/i.test(r));
    const lastPlayoffResult = playoffMatches[playoffMatches.length - 1]?.result;
    const lostLastPlayoff = lastPlayoffResult === MatchResult.Loss;

    let finishType: MinorEventFinish["type"];
    if (playoffLosses === 0 && playoffWins > 0) finishType = "champion";
    else if (playedFinals) finishType = "finalist";
    else if (playedSemis) finishType = "top4";
    else if (lostLastPlayoff) {
      const totalPlayoffRounds = playoffMatches.length;
      if (totalPlayoffRounds >= 3) finishType = "finalist";
      else if (totalPlayoffRounds === 2) finishType = "top4";
      else finishType = "top8";
    }
    else if (playoffWins >= 3) finishType = "champion";
    else if (playoffWins === 2) finishType = "finalist";
    else if (playoffWins === 1) finishType = "top4";
    else finishType = "top8";

    finishes.push({ type: finishType, eventName: event.eventName, eventDate: event.eventDate, format: event.format, eventType: raw, hero });
  }

  return finishes.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

export function getEventName(match: MatchRecord): string {
  if (match.notes) {
    const parts = match.notes.split(" | ");
    if (parts[0]?.trim()) return parts[0].trim();
  }
  return `${match.date} - ${match.format}`;
}

export function getRoundNumber(match: MatchRecord): number {
  if (match.notes) {
    // Handle "Round P{N}" for playoff rounds — sort after swiss rounds
    const playoffMatch = match.notes.match(/Round\s+P(\d+)/i);
    if (playoffMatch) return 1000 + parseInt(playoffMatch[1], 10);
    const roundMatch = match.notes.match(/Round\s+(\d+)/i);
    if (roundMatch) return parseInt(roundMatch[1], 10);
    // Descriptive playoff labels sort after swiss — check full notes string
    if (/Playoff|Skirmish/i.test(match.notes)) return 1000;
    if (/Quarter|Top\s*8/i.test(match.notes)) return 1001;
    if (/Semi|Top\s*4/i.test(match.notes)) return 1002;
    if (/Finals?(?:\s|$|\|)/i.test(match.notes)) return 1003;
  }
  return 0;
}

/** Check if the match has an explicit event name (from GEM/notes) vs a generated fallback. */
function hasExplicitEventName(match: MatchRecord): boolean {
  return !!(match.notes?.split(" | ")[0]?.trim());
}

export function computeEventStats(matches: MatchRecord[]): EventStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const name = getEventName(match);
    // Named events (from GEM import): group by name+date+venue so editing
    // format on individual rounds doesn't split the event.
    // Unnamed events (manual entry): the fallback name already includes format,
    // so format is implicitly part of the key.
    const normalizedVenue = (match.venue || "").trim().toLowerCase();
    const key = hasExplicitEventName(match)
      ? `${name}|${match.date}|${normalizedVenue}`
      : `${name}|${match.date}|${normalizedVenue}|${match.format}`;
    const existing = map.get(key) ?? [];
    existing.push(match);
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([key, group]) => {
      const [eventName] = key.split("|");
      const sorted = [...group].sort((a, b) => getRoundNumber(a) - getRoundNumber(b));
      const first = sorted[0];
      const { wins, losses, draws } = countResults(group);

      // Compute unique formats — ordered by first appearance in sorted rounds
      const seen = new Set<string>();
      const formats: string[] = [];
      for (const m of sorted) {
        if (!seen.has(m.format)) {
          seen.add(m.format);
          formats.push(m.format);
        }
      }

      const played = wins + losses + draws;
      return {
        eventName,
        eventDate: first.date,
        format: formats[0],
        formats,
        venue: first.venue,
        eventType: getEventType(first),
        rated: first.rated,
        totalMatches: played,
        wins,
        losses,
        draws,
        winRate: played > 0 ? (wins / played) * 100 : 0,
        matches: sorted,
      };
    })
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

// ── Tournament Analytics ──

export interface RoundRecord {
  round: string;
  roundNum: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

export interface StartPattern {
  pattern: string;
  count: number;
  pct: number;
  conversionRate: number; // % that finished with wins > losses
}

export interface HeroTournamentRecord {
  hero: string;
  events: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  eventWinRate: number; // % of events with positive record
}

export interface TournamentAnalytics {
  // First round
  r1Wins: number;
  r1Losses: number;
  r1Draws: number;
  r1WinRate: number;

  // Start patterns
  startPatterns: StartPattern[];

  // Round breakdown
  roundBreakdown: RoundRecord[];

  // Momentum & mental game
  bounceBackRate: number; // WR in round after a loss
  bounceBackWins: number;
  bounceBackTotal: number;
  streakWinRate: number; // WR when on 2+ win streak
  streakWins: number;
  streakTotal: number;
  afterByeWinRate: number; // WR in round after a bye
  afterByeWins: number;
  afterByeTotal: number;
  closerRate: number; // WR in final swiss round
  closerWins: number;
  closerTotal: number;
  bestRound: RoundRecord | null;
  worstRound: RoundRecord | null;

  // Tournament outcomes
  totalEvents: number;
  totalMatches: number;
  overallWinRate: number;
  top8Rate: number; // % of events making playoffs
  top8Count: number;
  undefeatedSwissRate: number;
  undefeatedSwissCount: number;
  avgFinalRecord: { wins: number; losses: number; draws: number };
  dropRate: number;
  dropCount: number;
  longestEventWinStreak: number; // most consecutive round wins in a single event
  longestCrossEventWinStreak: number; // consecutive wins across event boundaries
  consecutiveTop8s: number; // most consecutive events making top 8
  consecutiveEventWins: number; // most consecutive events won (champion)
  championCount: number; // tournament wins
  finalistCount: number; // events where player reached finals
  top4Count: number; // top 4 finishes
  submarineCount: number; // lost R1 but made top 8
  rightRecordWrongOrder: number; // had top 8 record but didn't make it (lost too early)

  // Hero tournament performance
  heroTournamentStats: HeroTournamentRecord[];

  // Trends over time (per event, chronological)
  eventTimeline: {
    date: string;
    eventName: string;
    eventType: string;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    rollingWinRate: number; // rolling 10-event WR
  }[];

  // Events per month
  eventsPerMonth: { month: string; count: number }[];

  // Top 8s by venue
  venueTop8s: {
    venue: string;
    events: number;
    top8s: number;
    top8Rate: number;
    champions: number;
    finalists: number;
    winRate: number;
    wins: number;
    losses: number;
    draws: number;
  }[];
}

export function computeTournamentAnalytics(events: EventStats[]): TournamentAnalytics {
  // R1 record
  let r1Wins = 0, r1Losses = 0, r1Draws = 0;

  // Momentum tracking
  let bounceBackWins = 0, bounceBackTotal = 0;
  let streakWins = 0, streakTotal = 0;
  let afterByeWins = 0, afterByeTotal = 0;
  let closerWins = 0, closerTotal = 0;

  // Round breakdown
  const roundMap = new Map<number, { wins: number; losses: number; draws: number }>();

  // Start patterns
  const patternCounts = new Map<string, { count: number; positive: number }>();

  // Outcomes
  let top8Count = 0;
  let undefeatedSwissCount = 0;
  let dropCount = 0;
  let totalWins = 0, totalLosses = 0, totalDraws = 0, totalMatches = 0;
  let longestEventWinStreak = 0;

  // Hero tournament stats
  const heroEventMap = new Map<string, { events: number; wins: number; losses: number; draws: number; positiveEvents: number }>();

  // Timeline
  const timeline: TournamentAnalytics["eventTimeline"] = [];

  // Events per month
  const monthMap = new Map<string, number>();

  // Sort events chronologically for timeline
  const chronological = [...events].sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  for (const event of chronological) {
    const swiss = event.matches.filter(m => {
      const rn = getRoundNumber(m);
      return rn > 0 && rn < 1000 && m.result !== MatchResult.Bye;
    });
    const swissByes = event.matches.filter(m => {
      const rn = getRoundNumber(m);
      return rn > 0 && rn < 1000 && m.result === MatchResult.Bye;
    });
    const hasPlayoffs = event.matches.some(m => getRoundNumber(m) >= 1000);
    const allRoundMatches = event.matches.filter(m => getRoundNumber(m) > 0 && m.result !== MatchResult.Bye);

    totalWins += event.wins;
    totalLosses += event.losses;
    totalDraws += event.draws;
    totalMatches += event.totalMatches;

    // Events per month
    const month = event.eventDate.slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) || 0) + 1);

    // R1 record
    const r1Match = swiss.find(m => getRoundNumber(m) === 1);
    if (r1Match) {
      if (r1Match.result === MatchResult.Win) r1Wins++;
      else if (r1Match.result === MatchResult.Loss) r1Losses++;
      else if (r1Match.result === MatchResult.Draw) r1Draws++;
    }

    // Round breakdown + momentum stats
    let eventWinStreak = 0;
    let maxEventWinStreak = 0;
    const allInOrder = [...swiss, ...swissByes].sort((a, b) => getRoundNumber(a) - getRoundNumber(b));

    for (let i = 0; i < allInOrder.length; i++) {
      const m = allInOrder[i];
      const rn = getRoundNumber(m);

      if (m.result === MatchResult.Bye) {
        // Byes don't count in round breakdown but affect "after bye" tracking
        eventWinStreak = 0; // reset streak (not a win)
        continue;
      }

      // Round breakdown
      const cur = roundMap.get(rn) || { wins: 0, losses: 0, draws: 0 };
      if (m.result === MatchResult.Win) { cur.wins++; eventWinStreak++; }
      else if (m.result === MatchResult.Loss) { cur.losses++; eventWinStreak = 0; }
      else if (m.result === MatchResult.Draw) { cur.draws++; eventWinStreak = 0; }
      roundMap.set(rn, cur);
      maxEventWinStreak = Math.max(maxEventWinStreak, eventWinStreak);

      // Bounce-back: WR in round immediately after a loss
      if (i > 0) {
        const prev = allInOrder[i - 1];
        if (prev.result === MatchResult.Loss) {
          bounceBackTotal++;
          if (m.result === MatchResult.Win) bounceBackWins++;
        }
        // After bye
        if (prev.result === MatchResult.Bye) {
          afterByeTotal++;
          if (m.result === MatchResult.Win) afterByeWins++;
        }
      }

      // Streak WR: when on 2+ consecutive wins
      if (eventWinStreak >= 3) { // current win is #3+, so we WERE on a 2+ streak
        streakTotal++;
        streakWins++; // by definition we won
      } else if (i >= 2) {
        // Check if previous 2 were wins
        const p1 = allInOrder[i - 1];
        const p2 = allInOrder[i - 2];
        if (p1.result === MatchResult.Win && p2.result === MatchResult.Win) {
          streakTotal++;
          if (m.result === MatchResult.Win) streakWins++;
        }
      }
    }

    longestEventWinStreak = Math.max(longestEventWinStreak, maxEventWinStreak);

    // Closer rate: last swiss round
    if (swiss.length > 0) {
      const lastSwiss = swiss[swiss.length - 1];
      closerTotal++;
      if (lastSwiss.result === MatchResult.Win) closerWins++;
    }

    // Start patterns (need at least 2 swiss rounds)
    if (swiss.length >= 2) {
      const r1 = swiss.find(m => getRoundNumber(m) === 1);
      const r2 = swiss.find(m => getRoundNumber(m) === 2);
      if (r1 && r2) {
        let w = 0, l = 0, d = 0;
        if (r1.result === MatchResult.Win) w++;
        else if (r1.result === MatchResult.Loss) l++;
        else d++;
        if (r2.result === MatchResult.Win) w++;
        else if (r2.result === MatchResult.Loss) l++;
        else d++;
        const pattern = d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`;
        const entry = patternCounts.get(pattern) || { count: 0, positive: 0 };
        entry.count++;
        if (event.wins > event.losses) entry.positive++;
        patternCounts.set(pattern, entry);
      }
    }

    // Top 8 (has playoff matches)
    if (hasPlayoffs) top8Count++;

    // Undefeated swiss
    const swissLosses = swiss.filter(m => m.result === MatchResult.Loss).length;
    if (swiss.length > 0 && swissLosses === 0) undefeatedSwissCount++;

    // Drop detection: events with significantly fewer rounds than expected
    // Heuristic: if event has < 3 matches and other events of same type have more
    if (allRoundMatches.length > 0 && allRoundMatches.length <= 2 && swiss.length <= 2) {
      const maxRound = Math.max(...swiss.map(m => getRoundNumber(m)), 0);
      if (maxRound > 0 && maxRound < 3 && !hasPlayoffs) dropCount++;
    }

    // Hero tournament stats
    const heroesInEvent = new Set(event.matches.map(m => m.heroPlayed).filter(Boolean));
    for (const hero of heroesInEvent) {
      const cur = heroEventMap.get(hero) || { events: 0, wins: 0, losses: 0, draws: 0, positiveEvents: 0 };
      const heroMatches = event.matches.filter(m => m.heroPlayed === hero && m.result !== MatchResult.Bye);
      const hw = heroMatches.filter(m => m.result === MatchResult.Win).length;
      const hl = heroMatches.filter(m => m.result === MatchResult.Loss).length;
      const hd = heroMatches.filter(m => m.result === MatchResult.Draw).length;
      cur.events++;
      cur.wins += hw;
      cur.losses += hl;
      cur.draws += hd;
      if (hw > hl) cur.positiveEvents++;
      heroEventMap.set(hero, cur);
    }

    // Timeline entry
    timeline.push({
      date: event.eventDate,
      eventName: event.eventName,
      eventType: event.eventType || "Other",
      wins: event.wins,
      losses: event.losses,
      draws: event.draws,
      winRate: event.winRate,
      rollingWinRate: 0, // filled below
    });
  }

  // Cross-event win streak (consecutive wins spanning event boundaries)
  let longestCrossEventWinStreak = 0;
  let currentCrossStreak = 0;
  for (const event of chronological) {
    const sorted = [...event.matches]
      .filter(m => getRoundNumber(m) > 0 && m.result !== MatchResult.Bye)
      .sort((a, b) => getRoundNumber(a) - getRoundNumber(b));
    for (const m of sorted) {
      if (m.result === MatchResult.Win) {
        currentCrossStreak++;
        longestCrossEventWinStreak = Math.max(longestCrossEventWinStreak, currentCrossStreak);
      } else {
        currentCrossStreak = 0;
      }
    }
  }

  // Consecutive top 8s (most consecutive events making playoffs)
  let consecutiveTop8s = 0;
  let currentTop8Streak = 0;
  for (const event of chronological) {
    const hasPlayoffsInEvent = event.matches.some(m => getRoundNumber(m) >= 1000);
    if (hasPlayoffsInEvent) {
      currentTop8Streak++;
      consecutiveTop8s = Math.max(consecutiveTop8s, currentTop8Streak);
    } else {
      currentTop8Streak = 0;
    }
  }

  // Consecutive event wins (champion — uses computePlayoffFinishes for consistency)
  const allFinishes = computePlayoffFinishes(chronological);
  const championEvents = new Set(
    allFinishes.filter(f => f.type === "champion").map(f => `${f.eventName}|${f.eventDate}`)
  );
  let consecutiveEventWins = 0;
  let currentEventWinStreak = 0;
  for (const event of chronological) {
    if (championEvents.has(`${event.eventName}|${event.eventDate}`)) {
      currentEventWinStreak++;
      consecutiveEventWins = Math.max(consecutiveEventWins, currentEventWinStreak);
    } else {
      currentEventWinStreak = 0;
    }
  }

  // Submarines: lost R1 but made top 8
  const top8EventKeys = new Set(
    allFinishes.map(f => `${f.eventName}|${f.eventDate}`)
  );
  let submarineCount = 0;
  for (const event of chronological) {
    const r1 = event.matches.find(m => getRoundNumber(m) === 1 && m.result !== MatchResult.Bye);
    if (r1 && r1.result === MatchResult.Loss && top8EventKeys.has(`${event.eventName}|${event.eventDate}`)) {
      submarineCount++;
    }
  }

  // Right record wrong order: had a record good enough for top 8 but didn't make it
  // For each event WITHOUT top 8, check if their swiss W-L was >= the best non-top-8 record
  // Simpler: events where wins > losses AND no top 8 AND at least 3 swiss rounds
  let rightRecordWrongOrder = 0;
  for (const event of chronological) {
    const key = `${event.eventName}|${event.eventDate}`;
    if (top8EventKeys.has(key)) continue; // already made top 8
    const swiss = event.matches.filter(m => {
      const rn = getRoundNumber(m);
      return rn > 0 && rn < 1000 && m.result !== MatchResult.Bye;
    });
    if (swiss.length < 3) continue;
    const w = swiss.filter(m => m.result === MatchResult.Win).length;
    const l = swiss.filter(m => m.result === MatchResult.Loss).length;
    // Typically top 8 requires X-1 or X-2 in a 5+ round event
    // Heuristic: positive record (wins > losses) with at most 1 loss in 4+ rounds
    if (swiss.length >= 4 && w > l && l <= 1) {
      rightRecordWrongOrder++;
    }
  }

  // Compute rolling 10-event win rate
  for (let i = 0; i < timeline.length; i++) {
    const window = timeline.slice(Math.max(0, i - 9), i + 1);
    const w = window.reduce((sum, e) => sum + e.wins, 0);
    const l = window.reduce((sum, e) => sum + e.losses, 0);
    const d = window.reduce((sum, e) => sum + e.draws, 0);
    const t = w + l + d;
    timeline[i].rollingWinRate = t > 0 ? (w / t) * 100 : 0;
  }

  // Build round breakdown sorted
  const roundBreakdown: RoundRecord[] = [...roundMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([roundNum, data]) => {
      const total = data.wins + data.losses + data.draws;
      return {
        round: roundNum >= 1000 ? (roundNum === 1000 ? "Playoffs" : `P${roundNum - 1000}`) : `R${roundNum}`,
        roundNum,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        total,
        winRate: total > 0 ? (data.wins / total) * 100 : 0,
      };
    });

  // Add playoff aggregate
  const playoffMatches = events.flatMap(e => e.matches.filter(m => getRoundNumber(m) >= 1000 && m.result !== MatchResult.Bye));
  if (playoffMatches.length > 0) {
    const existing = roundBreakdown.filter(r => r.roundNum >= 1000);
    if (existing.length > 1) {
      // Already have individual playoff rounds — add aggregate
      const pw = playoffMatches.filter(m => m.result === MatchResult.Win).length;
      const pl = playoffMatches.filter(m => m.result === MatchResult.Loss).length;
      const pd = playoffMatches.filter(m => m.result === MatchResult.Draw).length;
      const pt = pw + pl + pd;
      // Remove individual P1/P2/P3 and replace with single "Playoffs"
      const swissRounds = roundBreakdown.filter(r => r.roundNum < 1000);
      swissRounds.push({
        round: "Playoffs",
        roundNum: 1000,
        wins: pw,
        losses: pl,
        draws: pd,
        total: pt,
        winRate: pt > 0 ? (pw / pt) * 100 : 0,
      });
      roundBreakdown.length = 0;
      roundBreakdown.push(...swissRounds);
    }
  }

  // Best/worst round (swiss only, min 3 matches)
  const swissRounds = roundBreakdown.filter(r => r.roundNum < 1000 && r.total >= 3);
  const bestRound = swissRounds.length > 0
    ? swissRounds.reduce((best, r) => r.winRate > best.winRate ? r : best)
    : null;
  const worstRound = swissRounds.length > 0
    ? swissRounds.reduce((worst, r) => r.winRate < worst.winRate ? r : worst)
    : null;

  // Start patterns sorted by count
  const startPatterns: StartPattern[] = [...patternCounts.entries()]
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      pct: events.length > 0 ? (data.count / events.length) * 100 : 0,
      conversionRate: data.count > 0 ? (data.positive / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Hero tournament stats sorted by events
  const heroTournamentStats: HeroTournamentRecord[] = [...heroEventMap.entries()]
    .map(([hero, data]) => {
      const total = data.wins + data.losses + data.draws;
      return {
        hero,
        events: data.events,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        winRate: total > 0 ? (data.wins / total) * 100 : 0,
        eventWinRate: data.events > 0 ? (data.positiveEvents / data.events) * 100 : 0,
      };
    })
    .filter(h => h.hero && h.hero !== "Unknown")
    .sort((a, b) => b.events - a.events);

  // Events per month
  const eventsPerMonth = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  // Top 8s by venue
  const venueAgg = new Map<string, { events: number; top8s: number; champions: number; finalists: number; wins: number; losses: number; draws: number }>();
  const finishKeys = new Set(allFinishes.map(f => `${f.eventName}|${f.eventDate}`));
  const championKeys = new Set(allFinishes.filter(f => f.type === "champion").map(f => `${f.eventName}|${f.eventDate}`));
  const finalistKeys = new Set(allFinishes.filter(f => f.type === "finalist").map(f => `${f.eventName}|${f.eventDate}`));

  for (const evt of events) {
    const venue = evt.venue || "Unknown";
    let entry = venueAgg.get(venue);
    if (!entry) entry = { events: 0, top8s: 0, champions: 0, finalists: 0, wins: 0, losses: 0, draws: 0 };
    entry.events++;
    entry.wins += evt.wins;
    entry.losses += evt.losses;
    entry.draws += evt.draws;
    const key = `${evt.eventName}|${evt.eventDate}`;
    if (finishKeys.has(key)) entry.top8s++;
    if (championKeys.has(key)) entry.champions++;
    if (finalistKeys.has(key)) entry.finalists++;
    venueAgg.set(venue, entry);
  }

  const venueTop8s = [...venueAgg.entries()]
    .filter(([v]) => v !== "Unknown")
    .map(([venue, d]) => ({
      venue,
      events: d.events,
      top8s: d.top8s,
      top8Rate: d.events > 0 ? (d.top8s / d.events) * 100 : 0,
      champions: d.champions,
      finalists: d.finalists,
      winRate: (d.wins + d.losses + d.draws) > 0 ? (d.wins / (d.wins + d.losses + d.draws)) * 100 : 0,
      wins: d.wins,
      losses: d.losses,
      draws: d.draws,
    }))
    .sort((a, b) => b.events - a.events);

  const r1Total = r1Wins + r1Losses + r1Draws;

  return {
    r1Wins,
    r1Losses,
    r1Draws,
    r1WinRate: r1Total > 0 ? (r1Wins / r1Total) * 100 : 0,

    startPatterns,
    roundBreakdown,

    bounceBackRate: bounceBackTotal > 0 ? (bounceBackWins / bounceBackTotal) * 100 : 0,
    bounceBackWins,
    bounceBackTotal,
    streakWinRate: streakTotal > 0 ? (streakWins / streakTotal) * 100 : 0,
    streakWins,
    streakTotal,
    afterByeWinRate: afterByeTotal > 0 ? (afterByeWins / afterByeTotal) * 100 : 0,
    afterByeWins,
    afterByeTotal,
    closerRate: closerTotal > 0 ? (closerWins / closerTotal) * 100 : 0,
    closerWins,
    closerTotal,
    bestRound,
    worstRound,

    totalEvents: events.length,
    totalMatches,
    overallWinRate: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
    top8Rate: events.length > 0 ? (top8Count / events.length) * 100 : 0,
    top8Count,
    undefeatedSwissRate: events.length > 0 ? (undefeatedSwissCount / events.length) * 100 : 0,
    undefeatedSwissCount,
    avgFinalRecord: events.length > 0
      ? { wins: totalWins / events.length, losses: totalLosses / events.length, draws: totalDraws / events.length }
      : { wins: 0, losses: 0, draws: 0 },
    dropRate: events.length > 0 ? (dropCount / events.length) * 100 : 0,
    dropCount,
    longestEventWinStreak,
    longestCrossEventWinStreak,
    consecutiveTop8s,
    consecutiveEventWins,
    championCount: allFinishes.filter(f => f.type === "champion").length,
    finalistCount: allFinishes.filter(f => f.type === "finalist").length,
    top4Count: allFinishes.filter(f => f.type === "top4").length,
    submarineCount,
    rightRecordWrongOrder,

    heroTournamentStats,
    eventTimeline: timeline,
    eventsPerMonth,
    venueTop8s,
  };
}
