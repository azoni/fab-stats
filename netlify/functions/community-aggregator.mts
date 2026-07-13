// Materializes a single community player-directory doc from the usernames +
// leaderboard collections.
//
// Why:
//   The /players directory wants to list ALL registered players (~3.7k), not
//   just the ~2.5k with a public leaderboard entry. Reading the whole usernames
//   collection client-side per visitor would be a Firestore quota sink, so this
//   function precomputes one compact doc the client reads in a single request.
//
// Schedule:
//   Every 12 hours (players/stats change slowly; a directory doesn't need to be
//   real-time). First run after deploy publishes the doc.
//
// Manual trigger (auth via AGGREGATOR_TOKEN):
//   GET /.netlify/functions/community-aggregator?mode=full&token=...
//
// Writes:
//   community/_players — { v, players: CompactPlayer[], count, withStats,
//                          truncated, bytes, updatedAt }

import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";

// Hard-blocked test/spam accounts — mirror of src/lib/blocked-users.ts.
const BLOCKED_USER_IDS = new Set<string>([
  "L7Vd2uSxm8dKW2TSwo9Rd8ZFEYB3", // testtest / agentazoni — test account
]);

// Keep well under Firestore's 1MB doc limit (leave headroom for metadata).
const DOC_SIZE_LIMIT = 900_000;

interface UsernameDoc {
  userId?: string;
  displayName?: string;
  searchName?: string;
}

interface LeaderboardDoc {
  userId: string;
  username?: string;
  displayName?: string;
  photoUrl?: string;
  topHero?: string;
  totalMatches?: number;
  winRate?: number;
  eloRating?: number;
  teamName?: string;
  teamVisibility?: "public" | "private";
  hideFromSpotlight?: boolean;
  hideFromGuests?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Compact directory record — short keys to fit thousands of players in one
 *  doc. Expanded back to full names by src/lib/community-directory.ts. */
interface CompactPlayer {
  u: string; // username (doc id / link slug)
  d: string; // displayName
  h?: string; // topHero
  m?: number; // totalMatches
  w?: number; // winRate
  r?: number; // eloRating
  p?: string; // photoUrl
  t?: string; // teamName (public only)
  g?: 1; // hideFromGuests — client hides these from signed-out visitors
  c?: number; // createdAt (epoch seconds) — for "newest" sort
  v?: number; // lastVisit (epoch seconds) — for "recently active" default sort
}

async function buildPlayers(): Promise<{ players: CompactPlayer[]; total: number; withStats: number }> {
  const db = getAdminDb();
  const [unameSnap, lbSnap, visitSnap] = await Promise.all([
    db.collection("usernames").get(),
    db.collection("leaderboard").get(),
    db.collection("analytics").doc("userLastVisit").get(),
  ]);

  // uid -> last site-visit ISO timestamp (written on each signed-in page view).
  const lastVisitByUid = (visitSnap.data() as Record<string, string> | undefined) || {};

  const lbByUid = new Map<string, LeaderboardDoc>();
  for (const doc of lbSnap.docs) {
    const data = doc.data() as LeaderboardDoc;
    if (data.userId) lbByUid.set(data.userId, data);
  }

  const players: CompactPlayer[] = [];
  let withStats = 0;

  for (const doc of unameSnap.docs) {
    const uname = doc.id; // username is the doc id (already lowercase)
    if (!uname) continue;
    const urec = doc.data() as UsernameDoc;
    const uid = urec.userId;
    if (!uid || BLOCKED_USER_IDS.has(uid)) continue;

    const lb = lbByUid.get(uid);
    if (lb?.hideFromSpotlight) continue; // respect the "hide me" opt-out entirely

    const rec: CompactPlayer = {
      u: uname,
      d: (lb?.displayName || urec.displayName || uname).slice(0, 60),
    };
    if (lb) {
      if (lb.topHero && lb.topHero !== "Unknown") rec.h = lb.topHero;
      if (lb.totalMatches && lb.totalMatches > 0) {
        rec.m = lb.totalMatches;
        withStats++;
      }
      if (typeof lb.winRate === "number" && Number.isFinite(lb.winRate)) {
        rec.w = Math.round(lb.winRate * 10) / 10;
      }
      if (typeof lb.eloRating === "number" && Number.isFinite(lb.eloRating)) {
        rec.r = Math.round(lb.eloRating);
      }
      if (lb.photoUrl) rec.p = lb.photoUrl;
      if (lb.teamName && lb.teamVisibility !== "private") rec.t = lb.teamName;
      if (lb.hideFromGuests) rec.g = 1;
      if (lb.createdAt) {
        const t = Date.parse(lb.createdAt);
        if (!Number.isNaN(t)) rec.c = Math.floor(t / 1000);
      }
    }
    // Recency for the "recently active" sort: prefer real last site-visit,
    // fall back to the leaderboard's last-recompute time so players who
    // predate visit tracking still get an ordering.
    const recency = lastVisitByUid[uid] || lb?.updatedAt;
    if (recency) {
      const t = Date.parse(recency);
      if (!Number.isNaN(t)) rec.v = Math.floor(t / 1000);
    }
    players.push(rec);
  }

  // Default order: most-active first. Also makes the size-guard drop the
  // least-active tail if we ever approach the doc limit.
  players.sort((a, b) => (b.m || 0) - (a.m || 0));
  return { players, total: players.length, withStats };
}

/** Serialize under the doc-size limit: drop photo URLs first, then truncate the
 *  least-active tail as a last resort. Returns the list actually written. */
function fitToLimit(players: CompactPlayer[]): { list: CompactPlayer[]; truncated: number; bytes: number } {
  let list = players;
  let bytes = JSON.stringify(list).length;
  if (bytes > DOC_SIZE_LIMIT) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    list = players.map(({ p, ...rest }) => rest);
    bytes = JSON.stringify(list).length;
  }
  let truncated = 0;
  while (bytes > DOC_SIZE_LIMIT && list.length > 500) {
    const drop = Math.max(1, Math.ceil(list.length * 0.1));
    list = list.slice(0, list.length - drop);
    truncated += drop;
    bytes = JSON.stringify(list).length;
  }
  return { list, truncated, bytes };
}

async function run() {
  const { players, total, withStats } = await buildPlayers();
  const { list, truncated, bytes } = fitToLimit(players);
  await getAdminDb()
    .collection("community")
    .doc("_players")
    .set({
      v: 1,
      players: list,
      count: total,
      withStats,
      truncated,
      bytes,
      updatedAt: new Date().toISOString(),
    });
  return { total, withStats, written: list.length, truncated, bytes };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const token = url.searchParams.get("token");
  const requiredToken = process.env.AGGREGATOR_TOKEN;

  // Manual invocations (?mode=...) require the shared-secret token; scheduled
  // runs pass no mode and skip the check.
  if (mode && requiredToken && token !== requiredToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const result = await run();
    console.log("[community-aggregator] Done:", JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[community-aggregator] Fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

// Every 12 hours. Manual full runs available via ?mode=full&token=.
export const config: Config = {
  schedule: "0 */12 * * *",
};
