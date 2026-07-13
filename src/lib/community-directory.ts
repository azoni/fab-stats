import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLeaderboardEntries } from "./leaderboard";
import { isBlockedUser } from "./blocked-users";
import type { LeaderboardEntry } from "@/types";

/** A player row in the /players directory. Sourced from the precomputed
 *  community/_players(_auth) doc (all public registered players), or derived
 *  live from the leaderboard as a fallback before the aggregator's first run. */
export interface DirectoryPlayer {
  username: string;
  displayName: string;
  topHero?: string;
  matches: number;
  winRate?: number;
  rating?: number;
  photoUrl?: string;
  teamName?: string;
  /** Registration/first-seen time, epoch seconds — for "newest" sort. */
  createdAt?: number;
  /** Last site visit, epoch seconds (day-bucketed) — "recently active" sort. */
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
    createdAt: c.c,
    lastVisit: c.v,
  };
}

const STORAGE_KEY = "fabstats.community-players.v2";
const CACHE_TTL = 30 * 60_000; // 30 minutes

let cached: DirectoryPlayer[] | null = null;
let cachedAt = 0;
let cachedAuth: boolean | null = null;

interface StoragePayload {
  players: DirectoryPlayer[];
  at: number;
  auth: boolean;
}

function readStorage(): StoragePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoragePayload;
    if (!Array.isArray(parsed.players)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(players: DirectoryPlayer[], at: number, auth: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, at, auth }));
  } catch {
    /* quota / disabled — in-memory only */
  }
}

/** Fallback: derive a directory from the public leaderboard when the precomputed
 *  doc isn't readable yet. getLeaderboardEntries already applies the correct auth
 *  gating (guests get isPublic==true AND hideFromGuests==false; authed get all
 *  public), so no extra guest filtering is needed here. Throws on hard failure
 *  so the caller can tell a failed load apart from a genuinely empty result. */
async function fromLeaderboard(isAuthenticated: boolean): Promise<DirectoryPlayer[]> {
  const entries: LeaderboardEntry[] = await getLeaderboardEntries(false, isAuthenticated);
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
      createdAt: e.createdAt ? Math.floor(Date.parse(e.createdAt) / 1000) || undefined : undefined,
      // No cheap client read for analytics/userLastVisit — approximate "recently
      // active" with the leaderboard's updatedAt until the aggregator publishes.
      lastVisit: e.updatedAt ? Math.floor(Date.parse(e.updatedAt) / 1000) || undefined : undefined,
    });
  }
  out.sort((a, b) => b.matches - a.matches);
  return out;
}

/** Returns the directory, or null on hard failure (both the precomputed doc and
 *  the leaderboard fallback failed) so callers never cache an empty list. */
async function fetchFresh(isAuthenticated: boolean): Promise<DirectoryPlayer[] | null> {
  const docId = isAuthenticated ? "_players_auth" : "_players";
  try {
    const snap = await getDoc(doc(db, "community", docId));
    if (snap.exists()) {
      const data = snap.data() as { players?: CompactPlayer[] };
      if (Array.isArray(data.players) && data.players.length > 0) {
        return data.players.map(expand);
      }
    }
  } catch {
    /* fall through to leaderboard */
  }
  try {
    return await fromLeaderboard(isAuthenticated);
  } catch {
    return null;
  }
}

/** All directory players. Cached (in-memory + localStorage, 30-min SWR) and
 *  keyed by auth state — guests and signed-in users read different docs, so a
 *  guest→sign-in transition must re-fetch. Rejects on hard load failure so the
 *  UI can show an error instead of a misleading "no players found". */
export async function getCommunityPlayers(isAuthenticated: boolean): Promise<DirectoryPlayer[]> {
  const now = Date.now();

  if (cached && cachedAuth === isAuthenticated && now - cachedAt < CACHE_TTL) return cached;

  const stored = readStorage();
  if (stored && stored.auth === isAuthenticated) {
    cached = stored.players;
    cachedAt = stored.at;
    cachedAuth = stored.auth;
    if (now - stored.at < CACHE_TTL) return stored.players;
    // Stale — refresh in the background, return stale now.
    fetchFresh(isAuthenticated)
      .then((fresh) => {
        if (fresh) {
          cached = fresh;
          cachedAt = Date.now();
          cachedAuth = isAuthenticated;
          writeStorage(fresh, cachedAt, isAuthenticated);
        }
      })
      .catch(() => {});
    return stored.players;
  }

  const fresh = await fetchFresh(isAuthenticated);
  if (!fresh) throw new Error("Failed to load player directory");
  cached = fresh;
  cachedAt = Date.now();
  cachedAuth = isAuthenticated;
  writeStorage(fresh, cachedAt, isAuthenticated);
  return fresh;
}

export function invalidateCommunityPlayersCache() {
  cached = null;
  cachedAt = 0;
  cachedAuth = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}
