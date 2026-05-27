import type { LeaderboardEntry } from "@/types";
import { getLeaderboardEntries } from "./leaderboard";

export function slugifyStoreName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Display-friendly normalization: trims, collapses whitespace. Used for the
 *  canonical name we show in the directory (since the same store may appear
 *  under slight capitalization variants across user matches — we pick the
 *  most common variant). */
function normalizeForDisplay(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export interface StoreDirectoryEntry {
  slug: string;
  /** Most common display variant of the name. */
  name: string;
  /** Aggregate match count across all players who have played here. */
  totalMatches: number;
  /** Aggregate wins across all players who have played here (their wins,
   *  not match outcomes from the venue's perspective). */
  totalWins: number;
  /** Number of distinct players who have logged a match at this venue. */
  uniquePlayers: number;
}

export interface StorePlayerStat {
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  matches: number;
  wins: number;
  winRate: number;
}

export interface StoreStats {
  slug: string;
  name: string;
  totalMatches: number;
  totalWins: number;
  uniquePlayers: number;
  /** All players who logged matches here, sorted by matches desc. */
  players: StorePlayerStat[];
  /** Top players by win-rate (min 5 matches at this venue). */
  topByWinRate: StorePlayerStat[];
  /** Top players by raw match count. */
  topByActivity: StorePlayerStat[];
}

type DirectoryAcc = {
  slug: string;
  nameVariants: Map<string, number>; // display string -> count
  totalMatches: number;
  totalWins: number;
  players: Map<string, StorePlayerStat>;
};

/** Internal: scan all leaderboard entries and build the venue → aggregate map. */
function buildDirectoryFromEntries(entries: LeaderboardEntry[]): Map<string, DirectoryAcc> {
  const map = new Map<string, DirectoryAcc>();
  for (const entry of entries) {
    if (!entry.venueBreakdown || entry.venueBreakdown.length === 0) continue;
    for (const v of entry.venueBreakdown) {
      const displayName = normalizeForDisplay(v.venue);
      if (!displayName) continue;
      const slug = slugifyStoreName(displayName);
      if (!slug || slug.length < 2) continue;

      let acc = map.get(slug);
      if (!acc) {
        acc = {
          slug,
          nameVariants: new Map(),
          totalMatches: 0,
          totalWins: 0,
          players: new Map(),
        };
        map.set(slug, acc);
      }
      acc.nameVariants.set(displayName, (acc.nameVariants.get(displayName) || 0) + 1);
      acc.totalMatches += v.matches;
      acc.totalWins += v.wins;

      // Per-player accumulation
      const existing = acc.players.get(entry.userId);
      const photoUrl = entry.photoUrl;
      if (existing) {
        existing.matches += v.matches;
        existing.wins += v.wins;
        existing.winRate =
          existing.matches > 0 ? Math.round((existing.wins / existing.matches) * 1000) / 10 : 0;
      } else {
        acc.players.set(entry.userId, {
          userId: entry.userId,
          username: entry.username,
          displayName: entry.displayName,
          photoUrl,
          matches: v.matches,
          wins: v.wins,
          winRate: v.winRate,
        });
      }
    }
  }
  return map;
}

function pickCanonicalName(variants: Map<string, number>): string {
  let best = "";
  let bestCount = -1;
  for (const [name, count] of variants.entries()) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/** Fetch the public auto-directory of stores derived from match venue data. */
export async function getStoreDirectory(): Promise<StoreDirectoryEntry[]> {
  const entries = await getLeaderboardEntries(false, true).catch(() =>
    getLeaderboardEntries(false, false).catch(() => [] as LeaderboardEntry[]),
  );
  const map = buildDirectoryFromEntries(entries);
  const directory: StoreDirectoryEntry[] = [];
  for (const acc of map.values()) {
    directory.push({
      slug: acc.slug,
      name: pickCanonicalName(acc.nameVariants),
      totalMatches: acc.totalMatches,
      totalWins: acc.totalWins,
      uniquePlayers: acc.players.size,
    });
  }
  directory.sort((a, b) => b.totalMatches - a.totalMatches);
  return directory;
}

/** Fetch detailed stats for a single store. Reads from the same leaderboard
 *  source as the directory and returns null if no venue matches the slug. */
export async function getStoreStats(slug: string): Promise<StoreStats | null> {
  const normalizedSlug = slugifyStoreName(slug);
  if (!normalizedSlug) return null;

  const entries = await getLeaderboardEntries(false, true).catch(() =>
    getLeaderboardEntries(false, false).catch(() => [] as LeaderboardEntry[]),
  );
  const map = buildDirectoryFromEntries(entries);
  const acc = map.get(normalizedSlug);
  if (!acc) return null;

  const allPlayers = [...acc.players.values()].sort((a, b) => b.matches - a.matches);
  const topByActivity = allPlayers.slice(0, 10);
  const topByWinRate = [...allPlayers]
    .filter((p) => p.matches >= 5)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10);

  return {
    slug: normalizedSlug,
    name: pickCanonicalName(acc.nameVariants),
    totalMatches: acc.totalMatches,
    totalWins: acc.totalWins,
    uniquePlayers: acc.players.size,
    players: allPlayers,
    topByWinRate,
    topByActivity,
  };
}

/** Lightweight slug lookup against the directory — used by league create UX
 *  to validate that a selected slug actually corresponds to a real venue. */
export async function venueSlugExists(slug: string): Promise<boolean> {
  const dir = await getStoreDirectory();
  return dir.some((d) => d.slug === slugifyStoreName(slug));
}
