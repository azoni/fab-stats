import { collection, doc, getDoc, getDocs, query, where, limit as fLimit } from "firebase/firestore";
import { db, auth } from "./firebase";
import type { LeaderboardEntry } from "@/types";
import { getLeaderboardEntries } from "./leaderboard";
import { isBlockedUser } from "./blocked-users";
import {
  getStoreAliases,
  buildAliasIndex,
  groupForSlug,
  type StoreAliasIndex,
} from "./store-aliases";

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

/** Bounded Levenshtein — returns max+1 as soon as the distance exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Suggest a directory store whose slug is a near-match to a typed slug, to catch
 *  typos like "vudugaminng" → "vudugaming" before an organizer adds a phantom
 *  store. Returns null when the exact slug already exists or nothing is close. */
export function findNearMatchStore(
  typedSlug: string,
  directory: StoreDirectoryEntry[],
): StoreDirectoryEntry | null {
  if (typedSlug.length < 4) return null;
  const prefix = typedSlug.slice(0, 3);
  let best: StoreDirectoryEntry | null = null;
  let bestDist = 3;
  for (const d of directory) {
    if (d.slug === typedSlug) return null; // exact store exists — no suggestion
    if (Math.abs(d.slug.length - typedSlug.length) > 2) continue;
    if (!d.slug.startsWith(prefix)) continue;
    const dist = editDistance(typedSlug, d.slug, 2);
    if (dist <= 2 && dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
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

export interface StoreHeroStat {
  hero: string;
  matches: number;
  wins: number;
  winRate: number;
}

export interface StoreFormatStat {
  format: string;
  matches: number;
}

export interface StoreStats {
  slug: string;
  name: string;
  totalMatches: number;
  uniquePlayers: number;
  players: StorePlayerStat[];
  topByWinRate: StorePlayerStat[];
  topByActivity: StorePlayerStat[];
  /** Store-wide hero + format mix. Populated as leaderboard docs refresh; may be empty. */
  heroes: StoreHeroStat[];
  formats: StoreFormatStat[];
}

type DirectoryAcc = {
  slug: string;
  nameVariants: Map<string, number>;
  totalMatches: number;
  // Every player who logged here (public + private) — the honest unique count.
  playerIds: Set<string>;
  // Public players only — the named roster shown on the store page.
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
const STORAGE_KEY = "fabstats.store-directory.v4";

interface SerializedAcc {
  slug: string;
  // [name, count] pairs (Map serialization-friendly)
  nv: Array<[string, number]>;
  tm: number;
  // [userId, StorePlayerStat] pairs
  pl: Array<[string, StorePlayerStat]>;
  // all player ids (public + private) for the honest unique count
  pi: string[];
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
      // Older payloads (pre-v4) have no `pi` — default to the named players.
      playerIds: new Set(b.pi ?? b.pl.map(([id]) => id)),
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
        pi: [...acc.playerIds],
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
    if (isBlockedUser(entry.userId)) continue;
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
          playerIds: new Set(),
          players: new Map(),
        };
        map.set(slug, acc);
      }
      acc.nameVariants.set(displayName, (acc.nameVariants.get(displayName) || 0) + 1);
      acc.totalMatches += v.matches;
      acc.playerIds.add(entry.userId);

      // Private players are counted above (totals + unique count) but never named,
      // mirroring the server aggregator. Guests are only ever fed public entries,
      // so this is a no-op for them.
      if (entry.isPublic !== true) continue;

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
  // Signed-in users may read every leaderboard doc (rules allow it), so we can
  // include private importers' venues — counted anonymously by
  // buildDirectoryFromEntries. Guests may only read public docs, so they rely on
  // the precomputed `storeAggregates/_directory` (which already includes private
  // stores anonymously) and this fallback stays public-only.
  const signedIn = !!auth.currentUser;
  const entries = signedIn
    ? await getLeaderboardEntries(true, true).catch(() =>
        getLeaderboardEntries(false, true).catch(() => [] as LeaderboardEntry[]),
      )
    : await getLeaderboardEntries(false, false).catch(() => [] as LeaderboardEntry[]);
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

/** Fast path: read the precomputed directory doc written by the
 *  store-aggregator Netlify function. Single doc read, instant. Returns
 *  null when the doc doesn't exist yet (e.g., on a fresh deploy before
 *  the aggregator has run). Supports both v1 (verbose field names) and
 *  v2 (compact short field names) payloads. */
async function getStoreDirectoryFromAggregate(): Promise<StoreDirectoryEntry[] | null> {
  try {
    const snap = await getDoc(doc(db, "storeAggregates", "_directory"));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      v?: number;
      stores?: unknown[];
    };
    if (!data.stores || !Array.isArray(data.stores)) return null;
    // v2: compact { s, n, m, p } shape
    if (data.v === 2) {
      return (data.stores as Array<{ s: string; n: string; m: number; p: number }>).map((e) => ({
        slug: e.s,
        name: e.n,
        totalMatches: e.m,
        uniquePlayers: e.p,
      }));
    }
    // v1 fallback: verbose field names
    return data.stores as StoreDirectoryEntry[];
  } catch {
    return null;
  }
}

/** Fold member-store rows into their canonical store (admin merge groups), then
 *  sort by matches. When the server aggregator has already baked the merge, most
 *  member rows won't exist and this is a near no-op. uniquePlayers is summed and
 *  may slightly over-count a player active at two merged venues — the detail page
 *  (getStoreStats) dedupes named players exactly. */
function mergeDirectoryByAlias(
  entries: StoreDirectoryEntry[],
  index: StoreAliasIndex,
): StoreDirectoryEntry[] {
  const byCanonical = new Map<string, StoreDirectoryEntry>();
  const out: StoreDirectoryEntry[] = [];
  for (const e of entries) {
    const group = groupForSlug(e.slug, index);
    if (!group) {
      out.push(e);
      continue;
    }
    const existing = byCanonical.get(group.canonicalSlug);
    if (existing) {
      existing.totalMatches += e.totalMatches;
      existing.uniquePlayers += e.uniquePlayers;
    } else {
      const merged: StoreDirectoryEntry = {
        slug: group.canonicalSlug,
        name: group.displayName,
        totalMatches: e.totalMatches,
        uniquePlayers: e.uniquePlayers,
      };
      byCanonical.set(group.canonicalSlug, merged);
      out.push(merged);
    }
  }
  out.sort((a, b) => b.totalMatches - a.totalMatches);
  return out;
}

/** Fetch the public auto-directory of stores derived from match venue data.
 *  Tries the precomputed aggregate first; falls back to live aggregation
 *  from the leaderboard collection (slow on cold cache, instant after).
 *  Admin store merges are folded in on either path. */
export async function getStoreDirectory(): Promise<StoreDirectoryEntry[]> {
  const aliasesPromise = getStoreAliases();
  const fromAggregate = await getStoreDirectoryFromAggregate();
  const index = buildAliasIndex(await aliasesPromise);
  if (fromAggregate) return mergeDirectoryByAlias(fromAggregate, index);

  // Fallback: live aggregation (cached via localStorage + SWR).
  const map = await getDirectoryMap();
  const directory: StoreDirectoryEntry[] = [];
  for (const acc of map.values()) {
    directory.push({
      slug: acc.slug,
      name: pickCanonicalName(acc.nameVariants),
      totalMatches: acc.totalMatches,
      uniquePlayers: acc.playerIds.size,
    });
  }
  return mergeDirectoryByAlias(directory, index);
}

/** Search the store directory by name (for the global search box). The directory
 *  is cached, so this is cheap after the first load. */
export async function searchStores(query: string, max = 5): Promise<StoreDirectoryEntry[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const dir = await getStoreDirectory().catch(() => [] as StoreDirectoryEntry[]);
  return dir
    .filter((s) => s.name.toLowerCase().includes(q))
    .sort((a, b) => b.totalMatches - a.totalMatches)
    .slice(0, max);
}

/** Fast path: query just the players who logged at this venue via the
 *  top-level `venueSlugs` array on each leaderboard doc. Avoids reading
 *  the entire leaderboard collection for a single store page. Returns
 *  null when no entries are tagged with this slug (older entries written
 *  before the field existed will be picked up by the directory fallback). */
async function getStoreStatsViaIndex(slug: string): Promise<StoreStats | null> {
  try {
    // Signed-in users read public + private docs for this venue (private counted
    // anonymously by buildDirectoryFromEntries); guests keep the isPublic filter
    // that the rules require. On rule denial the catch below falls through to the
    // aggregate/directory path.
    const q = auth.currentUser
      ? query(
          collection(db, "leaderboard"),
          where("venueSlugs", "array-contains", slug),
          fLimit(500),
        )
      : query(
          collection(db, "leaderboard"),
          where("isPublic", "==", true),
          where("venueSlugs", "array-contains", slug),
          fLimit(500),
        );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const entries = snap.docs.map((d) => d.data() as LeaderboardEntry);
    const map = buildDirectoryFromEntries(entries);
    const acc = map.get(slug);
    if (!acc) return null;

    const allPlayers = [...acc.players.values()].sort((a, b) => b.matches - a.matches);
    return {
      slug,
      name: pickCanonicalName(acc.nameVariants),
      totalMatches: acc.totalMatches,
      uniquePlayers: acc.playerIds.size,
      players: allPlayers,
      topByActivity: allPlayers.slice(0, 10),
      topByWinRate: [...allPlayers]
        .filter((p) => p.matches >= 5)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10),
      heroes: [],
      formats: [],
    };
  } catch {
    // Missing index, rule denial, or any other failure → let the caller
    // fall back to the full-directory path.
    return null;
  }
}

/** Fastest path: read the precomputed per-store aggregate doc written by
 *  the store-aggregator Netlify function. Single doc read. */
async function getStoreStatsFromAggregate(slug: string): Promise<StoreStats | null> {
  try {
    const snap = await getDoc(doc(db, "storeAggregates", slug));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      slug: string;
      name: string;
      totalMatches: number;
      uniquePlayers: number;
      players?: StorePlayerStat[];
      heroes?: StoreHeroStat[];
      formats?: StoreFormatStat[];
    };
    // Defensive: drop blocked users even if a stale aggregate doc still names them.
    const players = (data.players || []).filter((p) => !isBlockedUser(p.userId));
    return {
      slug: data.slug,
      name: data.name,
      totalMatches: data.totalMatches,
      uniquePlayers: data.uniquePlayers,
      players,
      topByActivity: players.slice(0, 10),
      topByWinRate: [...players]
        .filter((p) => p.matches >= 5)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10),
      heroes: data.heroes || [],
      formats: data.formats || [],
    };
  } catch {
    return null;
  }
}

/** Detailed stats for a SINGLE store slug (no alias resolution). Three-tier
 *  fallback: aggregate doc → venueSlugs array-contains → full leaderboard scan. */
async function getStoreStatsForSlug(normalizedSlug: string): Promise<StoreStats | null> {
  const fromAggregate = await getStoreStatsFromAggregate(normalizedSlug);
  if (fromAggregate) return fromAggregate;

  const fromIndex = await getStoreStatsViaIndex(normalizedSlug);
  if (fromIndex) return fromIndex;

  const map = await getDirectoryMap();
  const acc = map.get(normalizedSlug);
  if (!acc) return null;

  const allPlayers = [...acc.players.values()].sort((a, b) => b.matches - a.matches);
  return {
    slug: normalizedSlug,
    name: pickCanonicalName(acc.nameVariants),
    totalMatches: acc.totalMatches,
    uniquePlayers: acc.playerIds.size,
    players: allPlayers,
    topByActivity: allPlayers.slice(0, 10),
    topByWinRate: [...allPlayers]
      .filter((p) => p.matches >= 5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10),
    heroes: [],
    formats: [],
  };
}

/** Combine several member-store stat blocks into one merged store. Named public
 *  players are deduped by userId; anonymous (private) counts are summed. */
function combineStoreStats(slug: string, name: string, parts: StoreStats[]): StoreStats {
  const players = new Map<string, StorePlayerStat>();
  const heroes = new Map<string, StoreHeroStat>();
  const formats = new Map<string, number>();
  let totalMatches = 0;
  let anonymous = 0;
  for (const p of parts) {
    totalMatches += p.totalMatches;
    anonymous += Math.max(0, p.uniquePlayers - p.players.length);
    for (const pl of p.players) {
      const ex = players.get(pl.userId);
      if (ex) {
        ex.matches += pl.matches;
        ex.wins += pl.wins;
        ex.winRate = ex.matches > 0 ? Math.round((ex.wins / ex.matches) * 1000) / 10 : 0;
      } else {
        players.set(pl.userId, { ...pl });
      }
    }
    for (const h of p.heroes) {
      const ex = heroes.get(h.hero);
      if (ex) {
        ex.matches += h.matches;
        ex.wins += h.wins;
        ex.winRate = ex.matches > 0 ? Math.round((ex.wins / ex.matches) * 1000) / 10 : 0;
      } else {
        heroes.set(h.hero, { ...h });
      }
    }
    for (const f of p.formats) formats.set(f.format, (formats.get(f.format) || 0) + f.matches);
  }
  const allPlayers = [...players.values()].sort((a, b) => b.matches - a.matches);
  return {
    slug,
    name,
    totalMatches,
    uniquePlayers: players.size + anonymous,
    players: allPlayers,
    topByActivity: allPlayers.slice(0, 10),
    topByWinRate: [...allPlayers]
      .filter((p) => p.matches >= 5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10),
    heroes: [...heroes.values()].sort((a, b) => b.matches - a.matches).slice(0, 12),
    formats: [...formats.entries()]
      .map(([format, matches]) => ({ format, matches }))
      .sort((a, b) => b.matches - a.matches),
  };
}

/** Fetch detailed stats for a store. Resolves admin merge groups: a member slug
 *  URL loads the merged canonical store (combining every member's stats). */
export async function getStoreStats(slug: string): Promise<StoreStats | null> {
  const normalizedSlug = slugifyStoreName(slug);
  if (!normalizedSlug) return null;

  const index = buildAliasIndex(await getStoreAliases());
  const group = groupForSlug(normalizedSlug, index);
  if (!group) return getStoreStatsForSlug(normalizedSlug);

  // Combine every member store into the canonical. After the server bake,
  // non-canonical member docs are gone, so this collapses to the merged doc.
  const parts = (
    await Promise.all(group.memberSlugs.map((m) => getStoreStatsForSlug(m)))
  ).filter((s): s is StoreStats => s !== null);
  if (parts.length === 0) return null;
  return combineStoreStats(group.canonicalSlug, group.displayName, parts);
}
