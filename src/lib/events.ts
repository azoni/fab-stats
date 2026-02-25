import type { EventStats } from "@/types";
import { MatchResult } from "@/types";

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

export function computeEventBadges(eventStats: EventStats[]): EventBadge[] {
  const badges: EventBadge[] = [];

  for (const event of eventStats) {
    const eventType = event.eventType || "Other";
    const tierInfo = EVENT_TYPE_TO_TIER[eventType];
    if (!tierInfo) continue;

    const city = extractCity(event.eventName, tierInfo.label);
    const bestFinish = getBestFinishForEvent(event);

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
