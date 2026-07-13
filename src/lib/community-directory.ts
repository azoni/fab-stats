import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLeaderboardEntries } from "./leaderboard";
import { isBlockedUser } from "./blocked-users";
import type { LeaderboardEntry } from "@/types";

/** A player row in the /players directory. Sourced from the precomputed
 *  community/_players doc (all ~3.7k registered players), or derived live from
 *  the leaderboard as a fallback before the aggregator's first run. */
export interface DirectoryPlayer {
  username: string;
  displayName: string;
  topHero?: string;
  matches: number;
  winRate?: number;
  rating?: number;
  photoUrl?: string;
  teamName?: string;
  /** Hidden from signed-out visitors (mirrors leaderboard hideFromGuests). */
  hideFromGuests?: boolean;
  /** Registration/first-seen time, epoch seconds — for "newest" sort. */
  createdAt?: number;
  /** Last site visit, epoch seconds — for the "recently active" default sort. */
  lastVisit?: number;
}

interface CompactPlayer {
  u: string;
  d: string;
  h?: string;
  m?: number;
  w?: number;
  r?: number;
  p?: string;
  t?: string;
  g?: 1;
  c?: number;
  v?: number;
}

function expand(c: CompactPlayer): DirectoryPlayer {
  return {
    username: c.u,
    displayName: c.d,
    topHero: c.h,
    matches: c.m || 0,
    winRate: c.w,
    rating: c.r,
    photoUrl: c.p,
    teamName: c.t,
    hideFromGuests: c.g === 1,
    createdAt: c.c,
    lastVisit: c.v,
  };
}

const STORAGE_KEY = "fabstats.community-players.v1";
const CACHE_TTL = 30 * 60_000; // 30 minutes

let cached: DirectoryPlayer[] | null = null;
let cachedAt = 0;

function readStorage(): { players: DirectoryPlayer[]; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { players: DirectoryPlayer[]; at: number };
    if (!Array.isArray(parsed.players)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(players: DirectoryPlayer[], at: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, at }));
  } catch {
    /* quota / disabled — in-memory only */
  }
}

/** Fallback: derive a directory from the public leaderboard when the
 *  precomputed doc doesn't exist yet. Only covers players with stats (~2.5k),
 *  which is fine until the aggregator publishes the full list. */
async function fromLeaderboard(isAuthenticated: boolean): Promise<DirectoryPlayer[]> {
  const entries = await getLeaderboardEntries(false, isAuthenticated).catch(
    () => [] as LeaderboardEntry[],
  );
  const out: DirectoryPlayer[] = [];
  for (const e of entries) {
    if (!e.username || isBlockedUser(e.userId)) continue;
    if (e.hideFromSpotlight) continue;
    out.push({
      username: e.username.toLowerCase(),
      displayName: e.displayName || e.username,
      topHero: e.topHero && e.topHero !== "Unknown" ? e.topHero : undefined,
      matches: e.totalMatches || 0,
      winRate: Number.isFinite(e.winRate) ? e.winRate : undefined,
      rating: typeof e.eloRating === "number" ? Math.round(e.eloRating) : undefined,
      photoUrl: e.photoUrl,
      teamName: e.teamVisibility !== "private" ? e.teamName : undefined,
      hideFromGuests: e.hideFromGuests,
      createdAt: e.createdAt ? Math.floor(Date.parse(e.createdAt) / 1000) || undefined : undefined,
      // No cheap client read for analytics/userLastVisit here — approximate
      // "recently active" with the leaderboard's updatedAt until the aggregator
      // publishes real lastVisit values.
      lastVisit: e.updatedAt ? Math.floor(Date.parse(e.updatedAt) / 1000) || undefined : undefined,
    });
  }
  out.sort((a, b) => b.matches - a.matches);
  return out;
}

async function fetchFresh(isAuthenticated: boolean): Promise<DirectoryPlayer[]> {
  try {
    const snap = await getDoc(doc(db, "community", "_players"));
    if (snap.exists()) {
      const data = snap.data() as { players?: CompactPlayer[] };
      if (Array.isArray(data.players) && data.players.length > 0) {
        return data.players.map(expand);
      }
    }
  } catch {
    /* fall through to leaderboard */
  }
  return fromLeaderboard(isAuthenticated);
}

/** All directory players. Cached (in-memory + localStorage, 30-min SWR). Pass
 *  the viewer's auth state so `hideFromGuests` players are dropped for guests.
 *  The cache stores the full list; guest filtering is applied per call. */
export async function getCommunityPlayers(isAuthenticated: boolean): Promise<DirectoryPlayer[]> {
  const now = Date.now();
  const filter = (list: DirectoryPlayer[]) =>
    isAuthenticated ? list : list.filter((p) => !p.hideFromGuests);

  if (cached && now - cachedAt < CACHE_TTL) return filter(cached);

  const stored = readStorage();
  if (stored) {
    cached = stored.players;
    cachedAt = stored.at;
    if (now - stored.at < CACHE_TTL) return filter(stored.players);
    // Stale — refresh in the background, return stale now.
    fetchFresh(isAuthenticated)
      .then((fresh) => {
        cached = fresh;
        cachedAt = Date.now();
        writeStorage(fresh, cachedAt);
      })
      .catch(() => {});
    return filter(stored.players);
  }

  const fresh = await fetchFresh(isAuthenticated);
  cached = fresh;
  cachedAt = Date.now();
  writeStorage(fresh, cachedAt);
  return filter(fresh);
}

export function invalidateCommunityPlayersCache() {
  cached = null;
  cachedAt = 0;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}
