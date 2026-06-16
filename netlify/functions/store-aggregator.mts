// Materializes per-store aggregates from the leaderboard collection.
//
// Why:
//   The /stores directory + per-store pages otherwise have to read the entire
//   public leaderboard collection client-side and aggregate in the browser.
//   This function precomputes a directory doc + one doc per store on a schedule
//   so the client just reads a single doc.
//
// Schedule:
//   Runs every 30 minutes. The handler is "smart":
//     - If lastFullSyncAt is missing or older than 24h, runs a FULL re-aggregate.
//     - Otherwise runs INCREMENTAL: pulls leaderboard entries updated since the
//       last incremental run and re-aggregates only the stores those entries
//       touched.
//
// Manual triggers (auth via FIREBASE_SERVICE_ACCOUNT + AGGREGATOR_TOKEN):
//   GET /.netlify/functions/store-aggregator?mode=full&token=...
//   GET /.netlify/functions/store-aggregator?mode=incremental&token=...
//
// Writes:
//   storeAggregates/_directory  — { stores: [...], updatedAt, count }
//   storeAggregates/_meta       — { lastFullSyncAt, lastIncrementalAt }
//   storeAggregates/{slug}      — { slug, name, totalMatches, uniquePlayers,
//                                   players: [...], updatedAt }

import type { Config } from "@netlify/functions";
import { getAdminDb } from "./firebase-admin.ts";

interface VenueBreakdownEntry {
  venue: string;
  matches: number;
  wins: number;
  winRate: number;
}

interface LeaderboardDoc {
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  isPublic?: boolean;
  hideFromGuests?: boolean;
  venueBreakdown?: VenueBreakdownEntry[];
  venueSlugs?: string[];
  updatedAt?: string;
}

interface PlayerStat {
  userId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  matches: number;
  wins: number;
  winRate: number;
}

interface StoreAggregate {
  slug: string;
  name: string;
  totalMatches: number;
  uniquePlayers: number;
  players: PlayerStat[];
}

/** Compact directory entry — short field names to keep the listing doc
 *  under Firestore's 1MB limit even with thousands of stores. The client
 *  expands these back to full names on read. */
interface CompactDirectoryEntry {
  s: string; // slug
  n: string; // name
  m: number; // totalMatches
  p: number; // uniquePlayers
}

// Hard-blocked test/spam accounts — never counted or named in store aggregates.
// Mirror of src/lib/blocked-users.ts (the function is a separate bundle).
const BLOCKED_USER_IDS = new Set<string>([
  "L7Vd2uSxm8dKW2TSwo9Rd8ZFEYB3", // testtest / agentazoni — test account
]);

const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_PLAYERS_PER_STORE = 100;
// Single-match "stores" are usually one-off venues or typos. Skip them
// from the directory listing only — per-store docs are still written for
// everything, so direct /stores/[slug] URLs work for the long tail.
const DIRECTORY_MIN_MATCHES = 2;
// Hard cap to keep us well under Firestore's 1MB doc size limit even
// in worst-case future growth. With compact field names below, each
// directory entry is ~70 bytes, so 8000 entries = ~600KB. Plenty of headroom.
const DIRECTORY_MAX_STORES = 8000;

function slugifyStoreName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeForDisplay(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function pickCanonical(variants: Map<string, number>): string {
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

/** Given a list of leaderboard docs, build per-slug aggregates. */
function aggregate(docs: LeaderboardDoc[]): Map<string, StoreAggregate> {
  const buckets = new Map<
    string,
    {
      nameVariants: Map<string, number>;
      totalMatches: number;
      // Every player who logged matches here (public + private) — the honest count.
      playerIds: Set<string>;
      // Public players only — the named leaderboard shown on the store page.
      players: Map<string, PlayerStat>;
    }
  >();

  for (const entry of docs) {
    if (BLOCKED_USER_IDS.has(entry.userId)) continue;
    if (!entry.venueBreakdown || entry.venueBreakdown.length === 0) continue;
    for (const v of entry.venueBreakdown) {
      const displayName = normalizeForDisplay(v.venue);
      if (!displayName) continue;
      const slug = slugifyStoreName(displayName);
      if (!slug || slug.length < 2) continue;

      let bucket = buckets.get(slug);
      if (!bucket) {
        bucket = {
          nameVariants: new Map<string, number>(),
          totalMatches: 0,
          playerIds: new Set<string>(),
          players: new Map<string, PlayerStat>(),
        };
        buckets.set(slug, bucket);
      }
      bucket.nameVariants.set(displayName, (bucket.nameVariants.get(displayName) || 0) + 1);
      bucket.totalMatches += v.matches;
      bucket.playerIds.add(entry.userId);

      // Only explicitly-public profiles appear in the named list — private (or
      // unset) players are counted above but never identified. Matches the
      // client's `where("isPublic", "==", true)` exactly.
      if (entry.isPublic !== true) continue;
      const existing = bucket.players.get(entry.userId);
      if (existing) {
        existing.matches += v.matches;
        existing.wins += v.wins;
        existing.winRate =
          existing.matches > 0 ? Math.round((existing.wins / existing.matches) * 1000) / 10 : 0;
      } else {
        bucket.players.set(entry.userId, {
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

  const result = new Map<string, StoreAggregate>();
  for (const [slug, bucket] of buckets.entries()) {
    const players = [...bucket.players.values()]
      .sort((a, b) => b.matches - a.matches)
      .slice(0, MAX_PLAYERS_PER_STORE);
    result.set(slug, {
      slug,
      name: pickCanonical(bucket.nameVariants),
      totalMatches: bucket.totalMatches,
      uniquePlayers: bucket.playerIds.size,
      players,
    });
  }
  return result;
}

// NOTE: these read ALL leaderboard docs (public + private). The admin SDK
// bypasses security rules so it can. Private players are COUNTED in a store's
// uniquePlayers/totalMatches (they did log matches there), but aggregate() omits
// them from the named `players` list so no private identity is exposed.
async function fetchAllLeaderboard(): Promise<LeaderboardDoc[]> {
  const db = getAdminDb();
  const snap = await db.collection("leaderboard").get();
  return snap.docs.map((d) => d.data() as LeaderboardDoc);
}

async function fetchChangedLeaderboard(sinceIso: string): Promise<LeaderboardDoc[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("leaderboard")
    .where("updatedAt", ">", sinceIso)
    .get();
  return snap.docs.map((d) => d.data() as LeaderboardDoc);
}

async function fetchLeaderboardByVenueSlug(slug: string): Promise<LeaderboardDoc[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("leaderboard")
    .where("venueSlugs", "array-contains", slug)
    .get();
  return snap.docs.map((d) => d.data() as LeaderboardDoc);
}

async function writeAggregates(
  aggregates: Map<string, StoreAggregate>,
  mode: "full" | "incremental",
  affectedSlugsForIncremental?: Set<string>,
): Promise<{ written: number; deleted: number }> {
  const db = getAdminDb();
  let written = 0;
  let deleted = 0;

  // Write each store doc in batches.
  const slugs = [...aggregates.keys()];
  for (let i = 0; i < slugs.length; i += 400) {
    const batch = db.batch();
    const chunk = slugs.slice(i, i + 400);
    const now = new Date().toISOString();
    for (const slug of chunk) {
      const agg = aggregates.get(slug)!;
      batch.set(db.collection("storeAggregates").doc(slug), {
        ...agg,
        updatedAt: now,
      });
      written++;
    }
    await batch.commit();
  }

  if (mode === "full") {
    // Drop any stores that no longer appear in the aggregate (orphans from
    // renamed venues, removed users, etc.).
    const existing = await db.collection("storeAggregates").select().get();
    const reserved = new Set(["_directory", "_meta"]);
    const orphans = existing.docs
      .map((d) => d.id)
      .filter((id) => !reserved.has(id) && !aggregates.has(id));
    for (let i = 0; i < orphans.length; i += 400) {
      const batch = db.batch();
      for (const id of orphans.slice(i, i + 400)) {
        batch.delete(db.collection("storeAggregates").doc(id));
        deleted++;
      }
      await batch.commit();
    }
  } else if (affectedSlugsForIncremental) {
    // Incremental: a slug that was previously aggregated but no longer has
    // any matching leaderboard entries (e.g. its only player dropped it
    // from their top-10 venues) should be deleted. We can only safely do
    // this for slugs we just looked at.
    const toDelete: string[] = [];
    for (const slug of affectedSlugsForIncremental) {
      if (!aggregates.has(slug)) toDelete.push(slug);
    }
    for (let i = 0; i < toDelete.length; i += 400) {
      const batch = db.batch();
      for (const id of toDelete.slice(i, i + 400)) {
        batch.delete(db.collection("storeAggregates").doc(id));
        deleted++;
      }
      await batch.commit();
    }
  }

  return { written, deleted };
}

async function rebuildDirectoryFromAggregates(): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection("storeAggregates").get();
  const entries: CompactDirectoryEntry[] = [];
  let totalAggregated = 0;
  for (const doc of snap.docs) {
    if (doc.id.startsWith("_")) continue;
    totalAggregated++;
    const data = doc.data() as StoreAggregate;
    if (data.totalMatches < DIRECTORY_MIN_MATCHES) continue;
    entries.push({
      s: data.slug,
      n: data.name,
      m: data.totalMatches,
      p: data.uniquePlayers,
    });
  }
  entries.sort((a, b) => b.m - a.m);
  // Cap to keep the directory doc well under Firestore's 1MB limit.
  const capped = entries.slice(0, DIRECTORY_MAX_STORES);
  await db.collection("storeAggregates").doc("_directory").set({
    // Tagged with v2 so the client knows to decode compact field names.
    v: 2,
    stores: capped,
    count: capped.length,
    totalAggregated,
    minMatches: DIRECTORY_MIN_MATCHES,
    updatedAt: new Date().toISOString(),
  });
  return capped.length;
}

async function runFull(): Promise<{ stores: number; written: number; deleted: number; ms: number }> {
  const t0 = Date.now();
  const docs = await fetchAllLeaderboard();
  const aggregates = aggregate(docs);
  const { written, deleted } = await writeAggregates(aggregates, "full");
  const stores = await rebuildDirectoryFromAggregates();
  const now = new Date().toISOString();
  await getAdminDb()
    .collection("storeAggregates")
    .doc("_meta")
    .set(
      { lastFullSyncAt: now, lastIncrementalAt: now, leaderboardDocsRead: docs.length },
      { merge: true },
    );
  return { stores, written, deleted, ms: Date.now() - t0 };
}

async function runIncremental(sinceIso: string): Promise<{
  stores: number;
  written: number;
  deleted: number;
  changedDocs: number;
  affectedSlugs: number;
  ms: number;
}> {
  const t0 = Date.now();
  const changed = await fetchChangedLeaderboard(sinceIso);
  if (changed.length === 0) {
    const now = new Date().toISOString();
    await getAdminDb()
      .collection("storeAggregates")
      .doc("_meta")
      .set({ lastIncrementalAt: now }, { merge: true });
    return { stores: 0, written: 0, deleted: 0, changedDocs: 0, affectedSlugs: 0, ms: Date.now() - t0 };
  }

  // Collect every slug any changed entry currently touches. We also need to
  // re-check stores those users previously belonged to — but since we don't
  // track prior state, the nightly full sync catches that drift.
  const affectedSlugs = new Set<string>();
  for (const entry of changed) {
    for (const slug of entry.venueSlugs || []) affectedSlugs.add(slug);
    // Defensive: derive from venueBreakdown too in case venueSlugs is missing
    // on entries written before that field existed.
    for (const v of entry.venueBreakdown || []) {
      const slug = slugifyStoreName(v.venue);
      if (slug.length >= 2) affectedSlugs.add(slug);
    }
  }

  // For each affected slug, fetch the current full player set via the
  // array-contains index and rebuild that store's aggregate.
  const allDocsForAffectedStores: LeaderboardDoc[] = [];
  // Process sequentially to avoid hammering Firestore with parallel queries.
  for (const slug of affectedSlugs) {
    const docs = await fetchLeaderboardByVenueSlug(slug);
    allDocsForAffectedStores.push(...docs);
  }

  // Dedup the docs and aggregate.
  const seen = new Set<string>();
  const unique: LeaderboardDoc[] = [];
  for (const d of allDocsForAffectedStores) {
    if (!seen.has(d.userId)) {
      seen.add(d.userId);
      unique.push(d);
    }
  }
  const aggregates = aggregate(unique);
  // Restrict to only the affected slugs (don't accidentally touch unrelated
  // stores that happened to be in the joined doc set).
  for (const slug of [...aggregates.keys()]) {
    if (!affectedSlugs.has(slug)) aggregates.delete(slug);
  }

  const { written, deleted } = await writeAggregates(aggregates, "incremental", affectedSlugs);
  const stores = await rebuildDirectoryFromAggregates();
  const now = new Date().toISOString();
  await getAdminDb()
    .collection("storeAggregates")
    .doc("_meta")
    .set({ lastIncrementalAt: now }, { merge: true });

  return {
    stores,
    written,
    deleted,
    changedDocs: changed.length,
    affectedSlugs: affectedSlugs.size,
    ms: Date.now() - t0,
  };
}

async function getMeta(): Promise<{ lastFullSyncAt?: string; lastIncrementalAt?: string }> {
  const snap = await getAdminDb().collection("storeAggregates").doc("_meta").get();
  return (snap.data() as { lastFullSyncAt?: string; lastIncrementalAt?: string }) || {};
}

/** One-time corrective: re-derive venueSlugs from venueBreakdown on every
 *  leaderboard doc. Older docs were written before venueSlugs existed (or with an
 *  empty array), so the incremental aggregator — which finds a store's players via
 *  `venueSlugs array-contains` — silently dropped them even though venueBreakdown
 *  listed the venue. (The full sync, which reads venueBreakdown, included them, so
 *  such players flickered in after each full sync and back out on the next
 *  incremental.) Pure doc transform — reads no match data. */
async function backfillVenueSlugs(): Promise<{ scanned: number; fixed: number; ms: number }> {
  const t0 = Date.now();
  const db = getAdminDb();
  const snap = await db.collection("leaderboard").get();
  let scanned = 0;
  let fixed = 0;
  const toFix: { id: string; venueSlugs: string[] }[] = [];
  for (const ds of snap.docs) {
    scanned++;
    const data = ds.data() as LeaderboardDoc;
    const derived = [
      ...new Set(
        (data.venueBreakdown || [])
          .map((v) => slugifyStoreName(v.venue))
          .filter((s) => s.length >= 2),
      ),
    ];
    const current = data.venueSlugs || [];
    const same = current.length === derived.length && derived.every((s) => current.includes(s));
    if (!same) toFix.push({ id: ds.id, venueSlugs: derived });
  }
  for (let i = 0; i < toFix.length; i += 400) {
    const batch = db.batch();
    for (const d of toFix.slice(i, i + 400)) {
      batch.update(db.collection("leaderboard").doc(d.id), { venueSlugs: d.venueSlugs });
      fixed++;
    }
    await batch.commit();
  }
  return { scanned, fixed, ms: Date.now() - t0 };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const tokenParam = url.searchParams.get("token");
  const requiredToken = process.env.AGGREGATOR_TOKEN;
  const requestedMode = url.searchParams.get("mode");

  // Manual invocations (with ?mode=...) require the shared-secret token.
  // Scheduled invocations don't pass mode and skip the token check.
  if (requestedMode && requiredToken && tokenParam !== requiredToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const meta = await getMeta();
    const now = Date.now();
    const lastFullAt = meta.lastFullSyncAt ? new Date(meta.lastFullSyncAt).getTime() : 0;
    const staleFull = now - lastFullAt > FULL_SYNC_INTERVAL_MS;

    const forceFull = requestedMode === "full";
    const forceIncremental = requestedMode === "incremental";

    let result: unknown;
    if (requestedMode === "backfill-slugs") {
      // Re-sync the venueSlugs index from venueBreakdown on every leaderboard doc,
      // then full-aggregate so the now-discoverable players land in store docs.
      console.log("[store-aggregator] Running venueSlugs BACKFILL + full sync");
      const backfill = await backfillVenueSlugs();
      const full = await runFull();
      result = { backfill, full };
    } else if (forceFull || (!forceIncremental && (staleFull || !meta.lastIncrementalAt))) {
      console.log("[store-aggregator] Running FULL sync");
      result = await runFull();
    } else {
      const since = meta.lastIncrementalAt!;
      console.log(`[store-aggregator] Running INCREMENTAL sync since ${since}`);
      result = await runIncremental(since);
    }

    console.log("[store-aggregator] Done:", JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[store-aggregator] Fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

// Run every 30 minutes. The handler decides full vs incremental.
// First scheduled run after deploy will detect missing _meta and run a full sync.
export const config: Config = {
  schedule: "*/30 * * * *",
};
