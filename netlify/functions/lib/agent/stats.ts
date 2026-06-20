// @ts-nocheck — vendored verbatim from fab-stats-bot/src/lib/stats.ts (type-checked upstream; relaxes our stricter noUncheckedIndexedAccess)
/**
 * Stat computation functions — ported from fab-stats/src/lib/stats.ts
 * These are pure functions that compute stats from match arrays.
 */

import {
  MatchResult,
  type MatchRecord,
  type HeroStats,
  type MatchupRecord,
  type OverallStats,
  type StreakInfo,
  type OpponentStats,
  type EventStats,
  type LeaderboardEntry,
} from "./fab-types";

// ── Helpers ──

function getRoundNumber(match: MatchRecord): number {
  if (match.notes) {
    const playoffMatch = match.notes.match(/Round\s+P(\d+)/i);
    if (playoffMatch) return 1000 + parseInt(playoffMatch[1], 10);
    const roundMatch = match.notes.match(/Round\s+(\d+)/i);
    if (roundMatch) return parseInt(roundMatch[1], 10);
    const roundInfo = match.notes.split(" | ")[1]?.trim() || "";
    if (/Quarter|Top\s*8/i.test(roundInfo)) return 1001;
    if (/Semi|Top\s*4/i.test(roundInfo)) return 1002;
    if (/Finals?$/i.test(roundInfo)) return 1003;
  }
  return 0;
}

function sortMatches(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() ||
      getRoundNumber(a) - getRoundNumber(b) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// ── Overall Stats ──

export function computeOverallStats(matches: MatchRecord[]): OverallStats {
  const sorted = sortMatches(matches);
  const totalWins = sorted.filter((m) => m.result === MatchResult.Win).length;
  const totalLosses = sorted.filter((m) => m.result === MatchResult.Loss).length;
  const totalDraws = sorted.filter((m) => m.result === MatchResult.Draw).length;
  const totalByes = sorted.filter((m) => m.result === MatchResult.Bye).length;
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

// ── Streaks ──

function computeStreaks(sortedMatches: MatchRecord[]): StreakInfo {
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
      // Byes don't break or extend streaks
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  let currentStreak: StreakInfo["currentStreak"] = null;
  if (currentWinStreak > 0) {
    currentStreak = { type: MatchResult.Win, count: currentWinStreak };
  } else if (currentLossStreak > 0) {
    currentStreak = { type: MatchResult.Loss, count: currentLossStreak };
  }

  return { currentStreak, longestWinStreak, longestLossStreak };
}

// ── Hero Stats ──

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
      const played = wins + losses + draws;

      return {
        heroName,
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

// ── Event Classification ──

const COMPETITIVE_EVENT_TYPES: [RegExp, string][] = [
  [/skirmish/i, "Skirmish"],
  [/road to national|\brtn\b/i, "Road to Nationals"],
  [/proquest|pro quest|\bpq\b/i, "ProQuest"],
  [/battle hardened|\bbh\b/i, "Battle Hardened"],
  [/\bcalling\b/i, "The Calling"],
  [/\bnational/i, "Nationals"],
  [/pro tour/i, "Pro Tour"],
  [/worlds|world championship/i, "Worlds"],
];

function classifyCompetitiveEvent(text: string): string | null {
  for (const [pattern, type] of COMPETITIVE_EVENT_TYPES) {
    if (pattern.test(text)) return type;
  }
  return null;
}

function guessEventTypeFromNotes(notes: string): string {
  const lower = notes.toLowerCase();
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("pre release") || lower.includes("pre-release")) return "Pre-Release";
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("on demand")) return "On Demand";
  const competitive = classifyCompetitiveEvent(lower);
  if (competitive) return competitive;
  if (lower.includes("championship") || lower.includes("invitation") || lower.includes("invitational")) return "Championship";
  return "Other";
}

export function refineEventType(eventType: string, eventName: string): string {
  const lower = eventName.toLowerCase();
  if (lower.includes("armory")) return "Armory";
  if (lower.includes("world premiere")) return "Pre-Release";
  if (lower.includes("pre-release") || lower.includes("prerelease")) return "Pre-Release";
  const competitive = classifyCompetitiveEvent(lower);
  if (competitive) return competitive;
  return eventType;
}

export function getEventType(match: MatchRecord): string {
  const eventName = match.notes?.split(" | ")[0] || "";
  if (match.eventType) return refineEventType(match.eventType, eventName);
  if (match.notes) return guessEventTypeFromNotes(match.notes);
  return "Other";
}

export function getEventName(match: MatchRecord): string {
  if (match.notes) {
    const parts = match.notes.split(" | ");
    if (parts[0]?.trim()) return parts[0].trim();
  }
  return `${match.date} - ${match.format}`;
}

// ── Event Stats ──

function hasExplicitEventName(match: MatchRecord): boolean {
  return !!(match.notes?.split(" | ")[0]?.trim());
}

export function computeEventStats(matches: MatchRecord[]): EventStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const name = getEventName(match);
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
      const wins = group.filter((m) => m.result === MatchResult.Win).length;
      const losses = group.filter((m) => m.result === MatchResult.Loss).length;
      const draws = group.filter((m) => m.result === MatchResult.Draw).length;

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

// ── Opponent Stats ──

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
  matches = matches.filter(
    (m) => m.result !== MatchResult.Bye && !/^bye$/i.test(m.opponentName?.trim() || "")
  );

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

// ── Playoff Detection ──

export type PlacementType = "champion" | "finalist" | "top4" | "top8";

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

/**
 * Determine the placement finish for a single event.
 * Returns null if the event had no playoff rounds (and isn't an undefeated Skirmish).
 */
export function getEventPlacement(event: EventStats): PlacementType | null {
  const refinedEventType = refineEventType(event.eventType || "Other", event.eventName);

  const playoffMatches: MatchRecord[] = [];
  for (const match of event.matches) {
    const roundInfo = match.notes?.split(" | ")[1]?.trim() || "";
    if (isPlayoffRound(roundInfo)) {
      playoffMatches.push(match);
    }
  }

  if (playoffMatches.length === 0) {
    // Undefeated Skirmish without top cut = champion
    if (refinedEventType === "Skirmish") {
      const wins = event.matches.filter((m) => m.result === MatchResult.Win).length;
      const losses = event.matches.filter((m) => m.result === MatchResult.Loss).length;
      if (wins > 0 && losses === 0) return "champion";
    }
    return null;
  }

  const playoffWins = playoffMatches.filter((m) => m.result === MatchResult.Win).length;
  const playoffLosses = playoffMatches.filter((m) => m.result === MatchResult.Loss).length;

  const roundInfos = playoffMatches.map((m) => (m.notes?.split(" | ")[1]?.trim() || "").toLowerCase());
  const playedFinals = roundInfos.some((r) => /finals?$/i.test(r) || /\bfinal\b/i.test(r));
  const playedSemis = roundInfos.some((r) => /semi/i.test(r) || /top\s*4/i.test(r));

  if (playoffLosses === 0 && playoffWins > 0) return "champion";
  if (playedFinals) return "finalist";
  if (playedSemis) return "top4";
  if (playoffWins >= 3) return "champion";
  if (playoffWins === 2) return "finalist";
  if (playoffWins === 1) return "top4";
  return "top8";
}

// ── Power Level (from power-level.ts) ──

export function computePowerLevel(e: LeaderboardEntry): number {
  let score = 0;
  const totalMatches = e.totalMatches + e.totalByes;

  // Win rate: max 30pts
  const wrWeight = Math.min(totalMatches / 20, 1);
  score += (e.winRate / 100) * 30 * wrWeight;

  // Volume: max 15pts
  if (totalMatches > 0) {
    score += Math.min(Math.log(totalMatches + 1) / Math.log(501), 1) * 15;
  }

  // Event success: max 20pts
  score += Math.min(e.eventWins / 10, 1) * 10;
  score += Math.min((e.totalTop8s ?? 0) / 8, 1) * 6;
  score += Math.min(e.eventsPlayed / 20, 1) * 4;

  // Streaks: max 10pts
  score += Math.min(e.longestWinStreak / 15, 1) * 7;
  score += Math.min(e.currentStreakType === "win" ? e.currentStreakCount / 10 : 0, 1) * 3;

  // Hero mastery: max 10pts
  score += Math.min(e.uniqueHeroes / 8, 1) * 5;
  score += Math.min(e.topHeroMatches / 100, 1) * 5;

  // Rated performance: max 10pts
  if (e.ratedMatches >= 5) {
    score += (e.ratedWinRate / 100) * 10;
  }

  // Earnings: max 5pts
  const earnings = e.earnings ?? 0;
  if (earnings > 0) {
    score += Math.min(Math.log(earnings + 1) / Math.log(10001), 1) * 5;
  }

  return Math.min(Math.round(score), 99);
}

export interface PowerTier {
  label: string;
  color: number; // Discord embed color (hex)
  emoji: string;
}

export function getPowerTier(level: number): PowerTier {
  if (level >= 80) return { label: "Grandmaster", color: 0xd946ef, emoji: "💎" };
  if (level >= 65) return { label: "Diamond", color: 0x38bdf8, emoji: "🔷" };
  if (level >= 50) return { label: "Gold", color: 0xfbbf24, emoji: "🥇" };
  if (level >= 35) return { label: "Silver", color: 0x9ca3af, emoji: "🥈" };
  return { label: "Bronze", color: 0xd97706, emoji: "🥉" };
}
