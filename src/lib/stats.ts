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

export function computeOverallStats(matches: MatchRecord[]): OverallStats {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const totalMatches = sorted.length;
  const totalWins = sorted.filter((m) => m.result === MatchResult.Win).length;
  const totalLosses = sorted.filter((m) => m.result === MatchResult.Loss).length;
  const totalDraws = sorted.filter((m) => m.result === MatchResult.Draw).length;
  const totalByes = sorted.filter((m) => m.result === MatchResult.Bye).length;
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

export function computeHeroStats(matches: MatchRecord[]): HeroStats[] {
  const heroMap = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const existing = heroMap.get(match.heroPlayed) ?? [];
    existing.push(match);
    heroMap.set(match.heroPlayed, existing);
  }

  return Array.from(heroMap.entries())
    .map(([heroName, heroMatches]) => {
      const wins = heroMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = heroMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = heroMatches.filter((m) => m.result === MatchResult.Draw).length;

      return {
        heroName,
        totalMatches: heroMatches.length,
        wins,
        losses,
        draws,
        winRate: heroMatches.length > 0 ? (wins / heroMatches.length) * 100 : 0,
        matchups: computeMatchups(heroMatches),
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

function computeMatchups(heroMatches: MatchRecord[]): MatchupRecord[] {
  const oppMap = new Map<string, MatchRecord[]>();

  for (const match of heroMatches) {
    const existing = oppMap.get(match.opponentHero) ?? [];
    existing.push(match);
    oppMap.set(match.opponentHero, existing);
  }

  return Array.from(oppMap.entries())
    .map(([opponentHero, matchupMatches]) => {
      const wins = matchupMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = matchupMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = matchupMatches.filter((m) => m.result === MatchResult.Draw).length;

      return {
        opponentHero,
        totalMatches: matchupMatches.length,
        wins,
        losses,
        draws,
        winRate: matchupMatches.length > 0 ? (wins / matchupMatches.length) * 100 : 0,
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
    } else {
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
function normalizeOpponentName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "unknown";
  const commaMatch = trimmed.match(/^(.+?),\s+(.+)$/);
  if (commaMatch) {
    return `${commaMatch[2]} ${commaMatch[1]}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function computeOpponentStats(matches: MatchRecord[]): OpponentStats[] {
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

  // Group matches by key (gemId or normalized name)
  const oppMap = new Map<string, MatchRecord[]>();
  for (const match of matches) {
    let key: string;
    if (match.opponentGemId) {
      key = `gemid:${match.opponentGemId}`;
    } else {
      key = `name:${normalizeOpponentName(match.opponentName?.trim() || "Unknown")}`;
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

      const wins = oppMatches.filter((m) => m.result === MatchResult.Win).length;
      const losses = oppMatches.filter((m) => m.result === MatchResult.Loss).length;
      const draws = oppMatches.filter((m) => m.result === MatchResult.Draw).length;
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
    const wins = groupMatches.filter((m) => m.result === MatchResult.Win).length;
    return {
      label,
      matches: groupMatches.length,
      wins,
      winRate: groupMatches.length > 0 ? (wins / groupMatches.length) * 100 : 0,
    };
  });
}

export function computeRollingWinRate(
  matches: MatchRecord[],
  windowSize: number = 10
): { index: number; winRate: number; date: string }[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const results: { index: number; winRate: number; date: string }[] = [];

  for (let i = windowSize - 1; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize + 1, i + 1);
    const wins = window.filter((m) => m.result === MatchResult.Win).length;
    results.push({
      index: i,
      winRate: (wins / windowSize) * 100,
      date: sorted[i].date,
    });
  }

  return results;
}

function guessEventTypeFromNotes(notes: string): string {
  const lower = notes.toLowerCase();
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("worlds") || lower.includes("world championship")) return "Worlds";
  if (lower.includes("pro tour")) return "Pro Tour";
  // Check specific tournament types before convention names like "calling"
  // e.g. "Calling Seattle - Battle Hardened..." should be "Battle Hardened"
  if (lower.includes("battle hardened") || /\bbh\b/.test(lower)) return "Battle Hardened";
  if (lower.includes("proquest") || lower.includes("pro quest") || /\bpq\b/.test(lower)) return "ProQuest";
  if (lower.includes("skirmish")) return "Skirmish";
  if (lower.includes("road to national") || /\brtn\b/.test(lower)) return "Road to Nationals";
  if (/\bnational/.test(lower)) return "Nationals";
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("pre release") || lower.includes("pre-release")) return "Pre-Release";
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("championship") || lower.includes("invitation") || lower.includes("invitational")) return "Championship";
  return "Other";
}

/** Derive the best event type from both the explicit eventType and the event name.
 *  Event names like "Calling Seattle - Battle Hardened..." should be "Battle Hardened"
 *  even if the eventType was set to something else by the import source. */
export function refineEventType(eventType: string, eventName: string): string {
  const lower = eventName.toLowerCase();
  // Check local event types first (GEM often misclassifies armory/pre-release with season names)
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("pre-release") || lower.includes("prerelease")) return "Pre-Release";
  // Check specific tournament types in event name — order matters
  if (lower.includes("battle hardened") || /\bbh\b/.test(lower)) return "Battle Hardened";
  if (lower.includes("proquest") || lower.includes("pro quest") || /\bpq\b/.test(lower)) return "ProQuest";
  if (lower.includes("pro tour")) return "Pro Tour";
  if (lower.includes("worlds") || lower.includes("world championship")) return "Worlds";
  if (lower.includes("skirmish")) return "Skirmish";
  if (lower.includes("road to national") || /\brtn\b/.test(lower)) return "Road to Nationals";
  if (/\bnational/.test(lower)) return "Nationals";
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("championship") || lower.includes("invitation") || lower.includes("invitational")) return "Championship";
  // Fall back to provided eventType
  return eventType;
}

export function getEventType(match: MatchRecord): string {
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
      const wins = group.filter((m) => m.result === MatchResult.Win).length;
      const losses = group.filter((m) => m.result === MatchResult.Loss).length;
      const draws = group.filter((m) => m.result === MatchResult.Draw).length;
      return {
        eventType,
        totalMatches: group.length,
        wins,
        losses,
        draws,
        winRate: group.length > 0 ? (wins / group.length) * 100 : 0,
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
      const wins = group.filter((m) => m.result === MatchResult.Win).length;
      const losses = group.filter((m) => m.result === MatchResult.Loss).length;
      const draws = group.filter((m) => m.result === MatchResult.Draw).length;
      return {
        venue,
        totalMatches: group.length,
        wins,
        losses,
        draws,
        winRate: group.length > 0 ? (wins / group.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalMatches - a.totalMatches);
}

const EVENT_PRESTIGE: Record<string, number> = {
  "Worlds": 10,
  "Pro Tour": 9,
  "The Calling": 8,
  "Nationals": 7,
  "Battle Hardened": 6,
  "Road to Nationals": 5,
  "ProQuest": 4,
  "Championship": 3,
  "Skirmish": 2,
  "On Demand": 1,
};

export function computeBestFinish(
  eventStats: EventStats[]
): { label: string; eventName: string; eventDate: string } | null {
  // Use playoff finish data for best finish (reuses same logic)
  const finishes = computePlayoffFinishes(eventStats);
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

  return { label: labelMap[best.type] || best.type, eventName: best.eventName, eventDate: best.eventDate };
}

export interface PlayoffFinish {
  type: "champion" | "finalist" | "top4" | "top8";
  eventName: string;
  eventDate: string;
  format: string;
  eventType: string;
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

export function computePlayoffFinishes(eventStats: EventStats[]): PlayoffFinish[] {
  const finishes: PlayoffFinish[] = [];

  for (const event of eventStats) {
    // Skip event types that don't have formal Top 8 brackets
    const refinedEventType = refineEventType(event.eventType || "Other", event.eventName);
    if (refinedEventType === "Armory" || refinedEventType === "Pre-Release" || refinedEventType === "Other") continue;

    const playoffMatches: MatchRecord[] = [];

    for (const match of event.matches) {
      const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
      if (isPlayoffRound(roundInfo)) {
        playoffMatches.push(match);
      }
    }

    if (playoffMatches.length === 0) continue;

    const playoffWins = playoffMatches.filter((m) => m.result === MatchResult.Win).length;
    const playoffLosses = playoffMatches.filter((m) => m.result === MatchResult.Loss).length;

    // Detect which rounds were played from explicit round names
    const roundInfos = playoffMatches.map((m) => (m.notes?.split(" | ")[1]?.trim() || "").toLowerCase());
    const playedFinals = roundInfos.some((r) => /finals?$/i.test(r) || /\bfinal\b/i.test(r));
    const playedSemis = roundInfos.some((r) => /semi/i.test(r) || /top\s*4/i.test(r));

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
    } else if (playoffWins >= 3) {
      // Generic playoff rounds (Round P style) — use win count heuristic
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
    });
  }

  return finishes.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

function getEventName(match: MatchRecord): string {
  if (match.notes) {
    const parts = match.notes.split(" | ");
    if (parts[0]?.trim()) return parts[0].trim();
  }
  return `${match.date} - ${match.format}`;
}

function getRoundNumber(match: MatchRecord): number {
  if (match.notes) {
    // Handle "Round P{N}" for playoff rounds — sort after swiss rounds
    const playoffMatch = match.notes.match(/Round\s+P(\d+)/i);
    if (playoffMatch) return 1000 + parseInt(playoffMatch[1], 10);
    const roundMatch = match.notes.match(/Round\s+(\d+)/i);
    if (roundMatch) return parseInt(roundMatch[1], 10);
    // Descriptive playoff labels sort after swiss
    const roundInfo = match.notes.split(" | ")[1]?.trim() || "";
    if (/Quarter|Top\s*8/i.test(roundInfo)) return 1001;
    if (/Semi|Top\s*4/i.test(roundInfo)) return 1002;
    if (/Finals?$/i.test(roundInfo)) return 1003;
  }
  return 0;
}

const MULTI_FORMAT_EVENT_TYPES = new Set(["Nationals", "Pro Tour", "Worlds"]);

function isMultiFormatEvent(match: MatchRecord): boolean {
  if (match.eventType && MULTI_FORMAT_EVENT_TYPES.has(match.eventType)) return true;
  const name = getEventName(match).toLowerCase();
  return /\b(nationals|national championship|pro tour|worlds|world championship)\b/.test(name);
}

export function computeEventStats(matches: MatchRecord[]): EventStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const name = getEventName(match);
    // For major multi-format events (Nationals, Pro Tour, Worlds), drop format from
    // the grouping key so CC + Draft rounds stay as one event.
    const key = isMultiFormatEvent(match)
      ? `${name}|${match.date}|${match.venue || ""}`
      : `${name}|${match.date}|${match.venue || ""}|${match.format}`;
    const existing = map.get(key) ?? [];
    existing.push(match);
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([key, group]) => {
      const [eventName] = key.split("|");
      const sorted = [...group].sort((a, b) => getRoundNumber(a) - getRoundNumber(b));
      const first = sorted[0];
      const wins = group.filter((m) => m.result === MatchResult.Win).length;
      const losses = group.filter((m) => m.result === MatchResult.Loss).length;
      const draws = group.filter((m) => m.result === MatchResult.Draw).length;

      // Compute unique formats — ordered by first appearance in sorted rounds
      const seen = new Set<string>();
      const formats: string[] = [];
      for (const m of sorted) {
        if (!seen.has(m.format)) {
          seen.add(m.format);
          formats.push(m.format);
        }
      }

      return {
        eventName,
        eventDate: first.date,
        format: formats[0],
        formats,
        venue: first.venue,
        eventType: getEventType(first),
        rated: first.rated,
        totalMatches: group.length,
        wins,
        losses,
        draws,
        winRate: group.length > 0 ? (wins / group.length) * 100 : 0,
        matches: sorted,
      };
    })
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}
