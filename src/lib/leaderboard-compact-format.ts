// Wire format of the compact leaderboard snapshot, shared by the publisher
// (netlify/functions/leaderboard-compactor.mts) and the client reader
// (src/lib/leaderboard-compact.ts). Firebase-free on purpose.
//
// A tier (guest / auth) is one manifest doc plus N shard docs:
//   community/_lb_auth      { v, shards, count, fields, updatedAt }
//   community/_lb_auth_0..N { v, i, updatedAt, data: "<JSON array of rows>" }
// Each row is an array aligned with `fields`; absent values are null. Rows
// carry every field the list/rank pages read — the heavy per-hero /
// per-venue arrays (heroBreakdownDetailed, monthlyHeroBreakdown,
// venueBreakdown, venueSlugs) stay only in the raw leaderboard docs.
import type { LeaderboardEntry } from "@/types";

export const COMPACT_FORMAT_VERSION = 1;

/** Only finishes newer than this ride along (CommunityHighlights shows the
 *  last 30 days; the margin keeps that exact under snapshot lag). */
export const TOP8_RECENT_DAYS = 45;

export const COMPACT_FIELDS = [
  "userId",
  "username",
  "displayName",
  "photoUrl",
  "isPublic",
  "totalMatches",
  "totalWins",
  "totalLosses",
  "totalDraws",
  "totalByes",
  "winRate",
  "longestWinStreak",
  "currentWinStreak",
  "currentStreakType",
  "currentStreakCount",
  "ratedMatches",
  "ratedWins",
  "ratedWinRate",
  "ratedWinStreak",
  "eventsPlayed",
  "eventWins",
  "uniqueHeroes",
  "heroCompletionPct",
  "opponentHeroCompletionPct",
  "bothHeroesCompletionPct",
  "topHero",
  "topHeroMatches",
  "nemesis",
  "nemesisWinRate",
  "nemesisMatches",
  "weeklyMatches",
  "weeklyWins",
  "weekStart",
  "monthlyMatches",
  "monthlyWins",
  "monthlyWinRate",
  "monthStart",
  "earnings",
  "armoryMatches",
  "armoryWins",
  "armoryWinRate",
  "armoryEvents",
  "showNameOnProfiles",
  "hideFromSpotlight",
  "hideFromGuests",
  "heroBreakdown",
  "weeklyHeroBreakdown",
  "totalTop8s",
  "top8sByEventType",
  "minorTop8sByEventType",
  "top8Heroes",
  "totalFinalists",
  "uniqueOpponents",
  "longestLossStreak",
  "uniqueVenues",
  "eloRating",
  "teamId",
  "teamName",
  "teamIconUrl",
  "teamVisibility",
  "leagueName",
  "leagueSlug",
  "leagueIconUrl",
  "createdAt",
  "updatedAt",
] as const;

export type CompactField = (typeof COMPACT_FIELDS)[number];
export type CompactRow = unknown[];

export interface CompactManifest {
  v: number;
  shards: number;
  count: number;
  fields: string[];
  /** Publish stamp shared with every shard — a shard carrying a different
   *  value belongs to another publish (torn read). */
  updatedAt: string;
  /** Last time the compactor ran at all, including runs that found nothing
   *  changed. Clients judge staleness on this, not on updatedAt. */
  touchedAt?: string;
}

export interface CompactShard {
  v: number;
  i: number;
  updatedAt: string;
  data: string;
}

/** Local YYYY-MM-DD for N days ago (mirrors lib/rolling-windows without importing it). */
function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Project a raw leaderboard doc onto a compact row. Base64 photos are never
 * carried (a single one is ~15 KB, more than the rest of the row); the
 * compactor externalizes them to Storage first.
 */
export function toCompactRow(entry: Partial<LeaderboardEntry> & Record<string, unknown>): CompactRow {
  const cutoff = daysAgoIso(TOP8_RECENT_DAYS);
  return COMPACT_FIELDS.map((field) => {
    let v: unknown = entry[field];
    if (v === undefined) return null;
    if (field === "photoUrl" && typeof v === "string" && v.startsWith("data:")) return null;
    if (field === "top8Heroes" && Array.isArray(v)) {
      v = (v as { eventDate?: string }[]).filter((t) => typeof t?.eventDate === "string" && t.eventDate >= cutoff);
    }
    return v;
  });
}

/** Rebuild a LeaderboardEntry from a row (nulls become absent fields). */
export function fromCompactRow(fields: readonly string[], row: CompactRow): LeaderboardEntry {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < fields.length; i++) {
    const v = row[i];
    if (v !== null && v !== undefined) out[fields[i]] = v;
  }
  return out as unknown as LeaderboardEntry;
}
