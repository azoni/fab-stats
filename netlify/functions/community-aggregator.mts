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
//   community/_players      — { v, players: CompactPlayer[], count, withStats,
//                               truncated, bytes, updatedAt }
//   community/_meta_summary — { v, totalPlayers, totalMatches, totalHeroes,
//                               mostPlayed, bestWinRate, updatedAt } — the
//                               headline numbers the /meta OG tags + image show;
//                               previously recomputed from a 500-doc leaderboard
//                               scan on EVERY /meta page view (and per OG render)

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
  topHeroMatches?: number;
  totalMatches?: number;
  totalWins?: number;
  heroBreakdown?: { hero: string; matches: number; wins: number }[];
  winRate?: number;
  eloRating?: number;
  teamName?: string;
  teamIconUrl?: string;
  teamVisibility?: "public" | "private";
  hideFromSpotlight?: boolean;
  hideFromGuests?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** users/{uid}/profile/main — the source of truth for privacy flags (the
 *  leaderboard mirror can be stale, and account-only users have no leaderboard
 *  doc at all). */
interface ProfileDoc {
  uid?: string;
  displayName?: string;
  isPublic?: boolean;
  profileVisibility?: string;
  hideFromSpotlight?: boolean;
  hideFromGuests?: boolean;
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
  ti?: string; // teamIconUrl (public team only)
  c?: number; // createdAt (epoch seconds) — for "newest" sort
  v?: number; // lastVisit (epoch DAY seconds) — for "recently active" default sort
}

// ── /meta headline summary ────────────────────────────────────────────────
// Same aggregation the og-rewrite-meta edge function and og-image used to run
// inline over a 500-doc slice of the leaderboard on every request. Computed
// here over EVERY guest-visible entry instead (the slice made the totals an
// arbitrary subset) and published as one small doc.

interface MetaHeroAgg {
  hero: string;
  matches: number;
  wins: number;
  players: number;
}

interface MetaSummary {
  totalPlayers: number;
  totalMatches: number;
  totalHeroes: number;
  mostPlayed: MetaHeroAgg | null;
  bestWinRate: MetaHeroAgg | null;
}

// Mirror of the edge function's filter — junk "hero" names that leaked into
// heroBreakdown from bad imports.
function isLikelyHeroName(name: string): boolean {
  if (!name || name.length < 2) return false;
  const lower = name.toLowerCase().trim();
  const blocked = [
    "not rated", "rated", "unrated", "competitive", "casual",
    "classic constructed", "blitz", "draft", "sealed", "clash",
    "ultimate pit fight", "other", "unknown",
  ];
  if (blocked.includes(lower)) return false;
  if (/\b(19|20)\d{2}\b/.test(name)) return false;
  return true;
}

function buildMetaSummary(docs: LeaderboardDoc[]): MetaSummary {
  const heroMap = new Map<string, { matches: number; wins: number; players: Set<string> }>();
  let totalMatches = 0;
  let playerCount = 0;

  for (const d of docs) {
    if (!d.userId || BLOCKED_USER_IDS.has(d.userId)) continue;
    // Guest-visible entries only — the same set the logged-out /meta page shows.
    if (d.isPublic !== true || d.hideFromGuests === true) continue;
    playerCount++;
    totalMatches += Number(d.totalMatches || 0);

    if (Array.isArray(d.heroBreakdown) && d.heroBreakdown.length > 0) {
      for (const item of d.heroBreakdown) {
        const hero = item?.hero;
        if (!hero || !isLikelyHeroName(hero)) continue;
        const cur = heroMap.get(hero) || { matches: 0, wins: 0, players: new Set<string>() };
        cur.matches += Number(item.matches || 0);
        cur.wins += Number(item.wins || 0);
        cur.players.add(d.userId);
        heroMap.set(hero, cur);
      }
    } else if (d.topHero && isLikelyHeroName(d.topHero)) {
      const matches = Number(d.topHeroMatches || 0);
      const wins = Math.round(matches * (Number(d.winRate || 0) / 100));
      const cur = heroMap.get(d.topHero) || { matches: 0, wins: 0, players: new Set<string>() };
      cur.matches += matches;
      cur.wins += wins;
      cur.players.add(d.userId);
      heroMap.set(d.topHero, cur);
    }
  }

  const heroList: MetaHeroAgg[] = [...heroMap.entries()].map(([hero, v]) => ({
    hero,
    matches: v.matches,
    wins: v.wins,
    players: v.players.size,
  }));
  const mostPlayed = heroList.length > 0 ? heroList.reduce((best, h) => (h.matches > best.matches ? h : best)) : null;
  const eligible = heroList.filter((h) => h.matches >= 50);
  const bestWinRate =
    eligible.length > 0
      ? eligible.reduce((best, h) => {
          const hWr = h.matches > 0 ? h.wins / h.matches : 0;
          const bWr = best.matches > 0 ? best.wins / best.matches : 0;
          return hWr > bWr ? h : best;
        })
      : null;

  return { totalPlayers: playerCount, totalMatches, totalHeroes: heroMap.size, mostPlayed, bestWinRate };
}

async function buildPlayers(): Promise<{
  all: CompactPlayer[];
  guest: CompactPlayer[];
  total: number;
  withStats: number;
  healedPrivacyFields: number;
  metaSummary: MetaSummary;
}> {
  const db = getAdminDb();
  const [unameSnap, lbSnap, visitSnap, profileSnap] = await Promise.all([
    db.collection("usernames").get(),
    db.collection("leaderboard").get(),
    db.collection("analytics").doc("userLastVisit").get(),
    // Only the privacy fields — avoids pulling full profile docs (bios, links…).
    db
      .collectionGroup("profile")
      .select("uid", "isPublic", "profileVisibility", "hideFromSpotlight", "hideFromGuests", "displayName")
      .get(),
  ]);

  // uid -> last site-visit ISO timestamp (written on each signed-in page view).
  const lastVisitByUid = (visitSnap.data() as Record<string, string> | undefined) || {};

  const lbByUid = new Map<string, LeaderboardDoc>();
  const lbDocs: LeaderboardDoc[] = [];
  for (const doc of lbSnap.docs) {
    const data = doc.data() as LeaderboardDoc;
    lbDocs.push(data);
    if (data.userId) lbByUid.set(data.userId, data);
  }

  // Profile is the privacy source of truth (users/{uid}/profile/main).
  const profByUid = new Map<string, ProfileDoc>();
  for (const doc of profileSnap.docs) {
    const data = doc.data() as ProfileDoc;
    const uid = data.uid || doc.ref.parent.parent?.id;
    if (uid) profByUid.set(uid, data);
  }

  // ── Heal missing privacy fields on leaderboard docs ─────────────────────
  // The client's guest query is where(isPublic==true) + where(hideFromGuests==false),
  // and Firestore equality NEVER matches an absent field — so legacy docs written
  // before updateLeaderboardEntry stamped both fields were invisible to guests
  // (the logged-out home/leaderboard/meta rendered empty). Patch them here with
  // the profile as the privacy source of truth; entries rewritten by the client
  // keep the fields going forward.
  let healedPrivacyFields = 0;
  {
    const toPatch: { ref: FirebaseFirestore.DocumentReference; patch: Record<string, unknown> }[] = [];
    for (const doc of lbSnap.docs) {
      const data = doc.data() as LeaderboardDoc;
      if (data.isPublic !== undefined && data.hideFromGuests !== undefined) continue;
      const prof = data.userId ? profByUid.get(data.userId) : undefined;
      const explicitlyPrivate =
        prof?.isPublic === false ||
        prof?.profileVisibility === "private" ||
        prof?.profileVisibility === "friends";
      const publicIntent =
        prof?.isPublic === true || prof?.profileVisibility === "public" || data.isPublic === true;
      const patch: Record<string, unknown> = {};
      if (data.isPublic === undefined) patch.isPublic = !explicitlyPrivate && publicIntent;
      if (data.hideFromGuests === undefined) patch.hideFromGuests = prof?.hideFromGuests === true;
      toPatch.push({ ref: doc.ref, patch });
    }
    for (let i = 0; i < toPatch.length; i += 400) {
      const batch = db.batch();
      for (const p of toPatch.slice(i, i + 400)) batch.update(p.ref, p.patch);
      await batch.commit();
    }
    healedPrivacyFields = toPatch.length;
    if (healedPrivacyFields > 0) {
      console.log(`[community-aggregator] Healed privacy fields on ${healedPrivacyFields} leaderboard docs`);
      // Reflect the patch in this run's in-memory docs so the summary below
      // sees the same visibility the client queries will.
      for (const { ref, patch } of toPatch) {
        const data = lbByUid.get(ref.id);
        if (data) Object.assign(data, patch);
      }
    }
  }

  const metaSummary = buildMetaSummary(lbDocs);

  const all: CompactPlayer[] = []; // includes hideFromGuests players (auth-only doc)
  const guest: CompactPlayer[] = []; // excludes hideFromGuests players (public doc)
  let withStats = 0;

  for (const doc of unameSnap.docs) {
    const uname = doc.id; // username is the doc id (already lowercase)
    if (!uname) continue;
    const urec = doc.data() as UsernameDoc;
    const uid = urec.userId;
    if (!uid || BLOCKED_USER_IDS.has(uid)) continue;

    const lb = lbByUid.get(uid);
    const prof = profByUid.get(uid);

    // ── Privacy gate ──────────────────────────────────────────────────────
    // Never publish anyone who is explicitly private or opted out of the
    // spotlight. Profile is source of truth; the leaderboard mirror can be
    // stale and account-only users have no leaderboard doc.
    const explicitlyPrivate =
      prof?.isPublic === false ||
      prof?.profileVisibility === "private" ||
      prof?.profileVisibility === "friends";
    if (explicitlyPrivate) continue;
    if (prof?.hideFromSpotlight || lb?.hideFromSpotlight) continue;
    // Require a positive public signal (signup default is public).
    const publicIntent =
      prof?.isPublic === true || prof?.profileVisibility === "public" || lb?.isPublic === true;
    if (!publicIntent) continue;

    const hideGuests = !!(prof?.hideFromGuests || lb?.hideFromGuests);

    const rec: CompactPlayer = {
      u: uname,
      d: (lb?.displayName || prof?.displayName || urec.displayName || uname).slice(0, 60),
    };
    // Only surface stats from a public leaderboard doc.
    if (lb && lb.isPublic !== false) {
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
      if (lb.teamName && lb.teamVisibility !== "private") {
        rec.t = lb.teamName;
        if (lb.teamIconUrl) rec.ti = lb.teamIconUrl;
      }
      if (lb.createdAt) {
        const t = Date.parse(lb.createdAt);
        if (!Number.isNaN(t)) rec.c = Math.floor(t / 1000);
      }
    }
    // Recency for the "recently active" sort: prefer real last site-visit,
    // fall back to the leaderboard's last-recompute time. Bucketed to the day
    // so the world-readable doc doesn't republish precise last-visit times.
    const recency = lastVisitByUid[uid] || lb?.updatedAt;
    if (recency) {
      const t = Date.parse(recency);
      if (!Number.isNaN(t)) rec.v = Math.floor(t / 86_400_000) * 86_400;
    }

    all.push(rec);
    if (!hideGuests) guest.push(rec);
  }

  // Default order: most-active first. Also makes the size-guard drop the
  // least-active tail if we ever approach the doc limit.
  const byMatches = (a: CompactPlayer, b: CompactPlayer) => (b.m || 0) - (a.m || 0);
  all.sort(byMatches);
  guest.sort(byMatches);
  return { all, guest, total: all.length, withStats, healedPrivacyFields, metaSummary };
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
  const { all, guest, total, withStats, healedPrivacyFields, metaSummary } = await buildPlayers();
  const db = getAdminDb();
  const now = new Date().toISOString();

  // Two docs enforce hideFromGuests at the rules layer (a client-side flag on a
  // world-readable doc is not a real barrier):
  //   community/_players       — guest-safe (hideFromGuests excluded), public read
  //   community/_players_auth  — full list, gated to authenticated readers
  const guestFit = fitToLimit(guest);
  const authFit = fitToLimit(all);

  await Promise.all([
    db.collection("community").doc("_players").set({
      v: 2,
      players: guestFit.list,
      count: guest.length,
      withStats,
      truncated: guestFit.truncated,
      bytes: guestFit.bytes,
      updatedAt: now,
    }),
    db.collection("community").doc("_players_auth").set({
      v: 2,
      players: authFit.list,
      count: total,
      withStats,
      truncated: authFit.truncated,
      bytes: authFit.bytes,
      updatedAt: now,
    }),
    db.collection("community").doc("_meta_summary").set({
      v: 1,
      ...metaSummary,
      updatedAt: now,
    }),
  ]);

  return {
    total,
    guestCount: guest.length,
    withStats,
    healedPrivacyFields,
    metaSummary: {
      players: metaSummary.totalPlayers,
      matches: metaSummary.totalMatches,
      heroes: metaSummary.totalHeroes,
      mostPlayed: metaSummary.mostPlayed?.hero ?? null,
    },
    guestWritten: guestFit.list.length,
    authWritten: authFit.list.length,
    guestTruncated: guestFit.truncated,
    authTruncated: authFit.truncated,
  };
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
