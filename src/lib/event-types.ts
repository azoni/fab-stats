import type { MatchRecord } from "@/types";
import { refineEventType, guessEventTypeFromNotes } from "./stats";

export const EVENT_TYPES = [
  "Armory",
  "Skirmish",
  "ProQuest",
  "Battlegrounds",
  "Road to Nationals",
  "Battle Hardened",
  "The Calling",
  "Nationals",
  "Pro Tour",
  "Worlds",
  "Pre-Release",
  "On Demand",
  "Championship",
  "Other",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Major event types (prestige >= 6) — users cannot upgrade into these. */
const MAJOR_EVENT_TYPES = new Set<string>([
  "Worlds",
  "Pro Tour",
  "The Calling",
  "Nationals",
  "Battle Hardened",
]);

export function isMajorEventType(eventType: string): boolean {
  return MAJOR_EVENT_TYPES.has(eventType);
}

/**
 * Compute the auto-classified event type (ignoring any user override).
 * Used to determine what transitions the restriction logic should allow.
 */
export function getOriginalEventType(match: MatchRecord): string {
  const eventName = match.notes?.split(" | ")[0] || "";
  if (match.eventType) return refineEventType(match.eventType, eventName);
  if (match.notes) return guessEventTypeFromNotes(match.notes);
  return "Other";
}

/**
 * Get the list of event types a user is allowed to change TO,
 * given the event's original (auto-classified) type.
 *
 * Rules:
 * - Cannot upgrade a minor event into a major type (prevents abuse)
 * - Can downgrade a major event to any type
 * - Can freely change between minor types
 */
export function getAllowedEventTypes(originalType: string): string[] {
  const currentIsMajor = isMajorEventType(originalType);

  return EVENT_TYPES.filter((candidate) => {
    if (candidate === originalType) return false;
    if (!currentIsMajor && isMajorEventType(candidate)) return false;
    return true;
  });
}
