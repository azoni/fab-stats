import type { EventStats } from "@/types";
import { MatchResult } from "@/types";
import type { PlayoffFinish } from "@/lib/stats";

export type EventTier = "battle-hardened" | "calling" | "nationals" | "pro-tour" | "worlds";

export interface EventBadge {
  tier: EventTier;
  tierLabel: string;
  city: string;
  eventName: string;
  date: string;
  bestFinish?: string;
}

const TIER_ORDER: Record<EventTier, number> = {
  worlds: 5,
  "pro-tour": 4,
  nationals: 3,
  calling: 2,
  "battle-hardened": 1,
};

const EVENT_TYPE_TO_TIER: Record<string, { tier: EventTier; label: string }> = {
  "Worlds": { tier: "worlds", label: "Worlds" },
  "Pro Tour": { tier: "pro-tour", label: "Pro Tour" },
  "Nationals": { tier: "nationals", label: "Nationals" },
  "The Calling": { tier: "calling", label: "The Calling" },
  "Battle Hardened": { tier: "battle-hardened", label: "Battle Hardened" },
};

function extractCity(eventName: string, tierLabel: string): string {
  // Try common separators: "Battle Hardened: Seattle", "Battle Hardened - Seattle", "Battle Hardened Seattle"
  const prefixes = [tierLabel + ":", tierLabel + " -", tierLabel];
  for (const prefix of prefixes) {
    if (eventName.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = eventName.slice(prefix.length).trim();
      if (rest) return rest;
    }
  }
  return eventName;
}

function getBestFinishForEvent(event: EventStats): string | undefined {
  const finishRank: Record<string, number> = { Finals: 4, "Top 4": 3, "Top 8": 2, Playoff: 1 };
  let best: { rank: number; label: string } | null = null;

  for (const match of event.matches) {
    const roundInfo = match.notes?.split(" | ")[1]?.trim();
    if (!roundInfo) continue;
    let rank = finishRank[roundInfo] ?? 0;
    if (rank === 0) continue;

    let label = roundInfo;
    if (roundInfo === "Finals" && match.result === MatchResult.Win) {
      rank = 5;
      label = "Champion";
    } else if (roundInfo === "Finals") {
      label = "Finalist";
    }

    if (!best || rank > best.rank) {
      best = { rank, label };
    }
  }

  return best?.label;
}

const PLAYOFF_TYPE_TO_LABEL: Record<string, string> = {
  champion: "Champion",
  finalist: "Finalist",
  top4: "Top 4",
  top8: "Top 8",
};

export function computeEventBadges(eventStats: EventStats[], playoffFinishes?: PlayoffFinish[]): EventBadge[] {
  // Build a lookup from event name+date → playoff finish label
  const playoffMap = new Map<string, string>();
  if (playoffFinishes) {
    const typeRank: Record<string, number> = { champion: 4, finalist: 3, top4: 2, top8: 1 };
    for (const f of playoffFinishes) {
      const key = `${f.eventName}|${f.eventDate}`;
      const existing = playoffMap.get(key);
      const existingRank = existing ? (typeRank[existing] || 0) : 0;
      if ((typeRank[f.type] || 0) > existingRank) {
        playoffMap.set(key, f.type);
      }
    }
  }

  const badges: EventBadge[] = [];

  for (const event of eventStats) {
    const eventType = event.eventType || "Other";
    const tierInfo = EVENT_TYPE_TO_TIER[eventType];
    if (!tierInfo) continue;

    const city = extractCity(event.eventName, tierInfo.label);

    // Prefer playoff finish from computePlayoffFinishes (more accurate detection),
    // fall back to the simple round-info-based detection
    const playoffType = playoffMap.get(`${event.eventName}|${event.eventDate}`);
    const bestFinish = playoffType ? PLAYOFF_TYPE_TO_LABEL[playoffType] : getBestFinishForEvent(event);

    badges.push({
      tier: tierInfo.tier,
      tierLabel: tierInfo.label,
      city,
      eventName: event.eventName,
      date: event.eventDate,
      bestFinish,
    });
  }

  // Sort: highest tier first, then newest date first
  badges.sort((a, b) => {
    const tierDiff = TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
    if (tierDiff !== 0) return tierDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return badges;
}
