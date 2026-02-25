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

export function computeOverallStats(matches: MatchRecord[]): OverallStats {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const totalMatches = sorted.length;
  const totalWins = sorted.filter((m) => m.result === MatchResult.Win).length;
  const totalLosses = sorted.filter((m) => m.result === MatchResult.Loss).length;
  const totalDraws = sorted.filter((m) => m.result === MatchResult.Draw).length;
  const overallWinRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  return {
    totalMatches,
    totalWins,
    totalLosses,
    totalDraws,
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
  );

  if (sorted.length === 0) return [];

  const groups = new Map<string, MatchRecord[]>();

  for (const match of sorted) {
    const d = new Date(match.date);
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
  if (lower.includes("world")) return "Worlds";
  if (lower.includes("pro tour")) return "Pro Tour";
  if (lower.includes("proquest")) return "ProQuest";
  if (lower.includes("calling")) return "The Calling";
  if (lower.includes("battle hardened")) return "Battle Hardened";
  if (lower.includes("pre release") || lower.includes("pre-release")) return "Pre-Release";
  if (lower.includes("skirmish")) return "Skirmish";
  if (lower.includes("road to nationals")) return "Road to Nationals";
  if (lower.includes("national")) return "Nationals";
  if (lower.includes("armory")) return "Armory";
  return "Other";
}

function getEventType(match: MatchRecord): string {
  if (match.eventType) return match.eventType;
  if (match.notes) return guessEventTypeFromNotes(match.notes);
  return "Other";
}

function getVenue(match: MatchRecord): string {
  return match.venue || "Unknown";
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

export function computeBestFinish(
  eventStats: EventStats[]
): { label: string; eventName: string; eventDate: string } | null {
  // Rank: Champion (5) > Finalist (4) > Top 4 (3) > Top 8 (2) > Playoff (1)
  const rankMap: Record<string, number> = {
    Finals: 4,
    "Top 4": 3,
    "Top 8": 2,
    Playoff: 1,
  };

  let best: { rank: number; label: string; eventName: string; eventDate: string } | null = null;

  for (const event of eventStats) {
    for (const match of event.matches) {
      const roundInfo = match.notes?.split(" | ")[1]?.trim();
      if (!roundInfo) continue;

      let rank = rankMap[roundInfo] ?? 0;
      if (rank === 0) continue;

      // Finals + Win = Champion (rank 5)
      let label = roundInfo;
      if (roundInfo === "Finals" && match.result === MatchResult.Win) {
        rank = 5;
        label = "Champion";
      } else if (roundInfo === "Finals") {
        label = "Finalist";
      }

      if (!best || rank > best.rank) {
        best = { rank, label, eventName: event.eventName, eventDate: event.eventDate };
      }
    }
  }

  return best ? { label: best.label, eventName: best.eventName, eventDate: best.eventDate } : null;
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
    const roundMatch = match.notes.match(/Round\s+(\d+)/i);
    if (roundMatch) return parseInt(roundMatch[1], 10);
  }
  return 0;
}

export function computeEventStats(matches: MatchRecord[]): EventStats[] {
  const map = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const name = getEventName(match);
    // Group by name + date + venue + format to prevent merging different events
    const key = `${name}|${match.date}|${match.venue || ""}|${match.format}`;
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

      return {
        eventName,
        eventDate: first.date,
        format: first.format,
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
