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
  name: string;
  totalMatches: number;
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
  uniquePlayers: number;
  players: StorePlayerStat[];
  topByWinRate: StorePlayerStat[];
  topByActivity: StorePlayerStat[];
}

type DirectoryAcc = {
  slug: string;
  nameVariants: Map<string, number>;
  totalMatches: number;
  players: Map<string, StorePlayerStat>;
};

// ── Cache layer ─────────────────────────────────────────────────────────────
// Two tiers:
//   1. In-memory cache — fast within a single page lifecycle.
//   2. localStorage cache — persists across hard refresh, tab close, and
//      browser restart, so the user only pays the cold leaderboard fetch
//      once until the TTL is up.
//
// Stale-while-revalidate (SWR) semantics:
//   - If a cache entry exists at all, return it immediately (even stale).
//   - If past TTL, kick off a background refresh so the next page load has
//      fresh data.
// Schema-versioned so a code change can bust any stale cached payloads.
let cachedMap: Map<string, DirectoryAcc> | null = null;
let cachedMapAt = 0;
let refreshInFlight = false;
const CACHE_TTL_MS = 15 * 60_000;
const STORAGE_KEY = "fabstats.store-directory.v3";

interface SerializedAcc {
  slug: string;
  // [name, count] pairs (Map serialization-friendly)
  nv: Array<[string, number]>;
  tm: number;
  // [userId, StorePlayerStat] pairs
  pl: Array<[string, StorePlayerStat]>;
}
interface SerializedCache {
  at: number;
  buckets: SerializedAcc[];
}

function readStorage(): SerializedCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedCache;
  } catch {
    return null;
  }
}

function hydrateFromStorage(): Map<string, DirectoryAcc> | null {
  const parsed = readStorage();
  if (!parsed?.buckets) return null;
  const map = new Map<string, DirectoryAcc>();
  for (const b of parsed.buckets) {
    map.set(b.slug, {
      slug: b.slug,
      nameVariants: new Map(b.nv),
      totalMatches: b.tm,
      players: new Map(b.pl),
    });
  }
  cachedMapAt = parsed.at || 0;
  return map;
}

function writeStorage(map: Map<string, DirectoryAcc>, at: number) {
  if (typeof window === "undefined") return;
  try {
    const buckets: SerializedAcc[] = [];
    for (const acc of map.values()) {
      buckets.push({
        slug: acc.slug,
        nv: [...acc.nameVariants.entries()],
        tm: acc.totalMatches,
        pl: [...acc.players.entries()],
      });
    }
    const payload: SerializedCache = { at, buckets };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage disabled — fall back to in-memory only.
  }
}

export function invalidateStoreDirectoryCache() {
  cachedMap = null;
  cachedMapAt = 0;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}

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
          players: new Map(),
        };
        map.set(slug, acc);
      }
      acc.nameVariants.set(displayName, (acc.nameVariants.get(displayName) || 0) + 1);
      acc.totalMatches += v.matches;

      const existing = acc.players.get(entry.userId);
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
          photoUrl: entry.photoUrl,
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

async function fetchAndCache(): Promise<Map<string, DirectoryAcc>> {
  const entries = await getLeaderboardEntries(false, true).catch(() =>
    getLeaderboardEntries(false, false).catch(() => [] as LeaderboardEntry[]),
  );
  const built = buildDirectoryFromEntries(entries);
  const at = Date.now();
  cachedMap = built;
  cachedMapAt = at;
  writeStorage(built, at);
  return built;
}

function maybeBackgroundRefresh() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  fetchAndCache()
    .catch(() => {})
    .finally(() => {
      refreshInFlight = false;
    });
}

async function getDirectoryMap(): Promise<Map<string, DirectoryAcc>> {
  const now = Date.now();

  // 1. In-memory cache hit — instant.
  if (cachedMap) {
    if (now - cachedMapAt > CACHE_TTL_MS) maybeBackgroundRefresh();
    return cachedMap;
  }

  // 2. localStorage hydration — also instant after first fetch ever.
  const fromStorage = hydrateFromStorage();
  if (fromStorage) {
    cachedMap = fromStorage;
    // Stale-while-revalidate: serve cached data NOW, refresh in background.
    if (now - cachedMapAt > CACHE_TTL_MS) maybeBackgroundRefresh();
    return cachedMap;
  }

  // 3. Cold start — pay the full cost.
  return fetchAndCache();
}

/** Fetch the public auto-directory of stores derived from match venue data. */
export async function getStoreDirectory(): Promise<StoreDirectoryEntry[]> {
  const map = await getDirectoryMap();
  const directory: StoreDirectoryEntry[] = [];
  for (const acc of map.values()) {
    directory.push({
      slug: acc.slug,
      name: pickCanonicalName(acc.nameVariants),
      totalMatches: acc.totalMatches,
      uniquePlayers: acc.players.size,
    });
  }
  directory.sort((a, b) => b.totalMatches - a.totalMatches);
  return directory;
}

/** Fetch detailed stats for a single store. Uses the same cached aggregation
 *  as the directory, so navigating /stores → /stores/[slug] is instant. */
export async function getStoreStats(slug: string): Promise<StoreStats | null> {
  const normalizedSlug = slugifyStoreName(slug);
  if (!normalizedSlug) return null;
  const map = await getDirectoryMap();
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
    uniquePlayers: acc.players.size,
    players: allPlayers,
    topByWinRate,
    topByActivity,
  };
}
