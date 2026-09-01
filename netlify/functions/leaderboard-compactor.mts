// Publishes the compact leaderboard snapshot the hot pages read instead of
// scanning the whole collection.
//
// Why:
//   Every cold visit to the home page, /leaderboard, /activity, /compare or a
//   player profile read 2,300 (guest) – 3,800 (signed-in) leaderboard docs —
//   ~14–23 MB, 15–20 s on the logged-out home — although those pages only use
//   the list/rank fields. This function projects each entry onto those fields
//   (src/lib/leaderboard-compact-format.ts) and writes a few sharded docs:
//
//     community/_lb_auth  + _lb_auth_{i}   — every entry, signed-in readers
//     community/_lb_guest + _lb_guest_{i}  — isPublic && !hideFromGuests, public
//     community/_meta_home / _meta_home_auth — computeMetaStats() output the
//                                              logged-out home renders
//     community/_lb_state                  — run bookkeeping
//
// Schedule (every 30 min; the handler decides):
//   FULL (every 6 h or when state is missing): scan the collection, externalize
//     base64 profile photos to Storage (a photo is ~15 KB — more than the rest
//     of a row — and ~1,000 entries carried one), publish rows + meta docs.
//   INCREMENTAL: leaderboard docs with updatedAt > last run, merged into the
//     previous rows. Deleted docs linger until the next full run (≤6 h).
//
// First deploy: nothing is published until every base64 photo has been moved
// (bounded per run), so clients keep the raw scan until the snapshot is
// complete — no half-migrated state is ever visible.
//
// Manual: GET /.netlify/functions/leaderboard-compactor?mode=full&token=...

import type { Config } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp, getAdminDb } from "./firebase-admin.ts";
import {
  COMPACT_FIELDS,
  COMPACT_FORMAT_VERSION,
  toCompactRow,
  fromCompactRow,
  type CompactRow,
  type CompactManifest,
  type CompactShard,
} from "../../src/lib/leaderboard-compact-format.ts";
import { computeMetaStats } from "../../src/lib/meta-stats.ts";
import type { LeaderboardEntry } from "../../src/types/index.ts";

// Hard-blocked test/spam accounts — mirror of src/lib/blocked-users.ts.
const BLOCKED_USER_IDS = new Set<string>([
  "L7Vd2uSxm8dKW2TSwo9Rd8ZFEYB3", // testtest / agentazoni — test account
]);

const STORAGE_BUCKET = "fab-stats-fc757.firebasestorage.app";
const FULL_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Keep a shard comfortably under Firestore's 1 MiB document limit. */
const SHARD_BYTES = 800_000;
/** Photo uploads per run are bounded by wall-clock so a run never times out. */
const PHOTO_BUDGET_MS = 20_000;
const PHOTO_WORKERS = 5;

const IDX_USER = COMPACT_FIELDS.indexOf("userId");
const IDX_PUBLIC = COMPACT_FIELDS.indexOf("isPublic");
const IDX_HIDE_GUESTS = COMPACT_FIELDS.indexOf("hideFromGuests");

type LbDoc = Partial<LeaderboardEntry> & Record<string, unknown> & { userId: string };

interface State {
  lastFullAt?: string;
  lastIncrementalAt?: string;
  photosPending?: number;
  lastRun?: Record<string, unknown>;
}

async function getState(): Promise<State> {
  const snap = await getAdminDb().collection("community").doc("_lb_state").get();
  return (snap.data() as State) || {};
}

async function saveState(patch: Partial<State>): Promise<void> {
  await getAdminDb().collection("community").doc("_lb_state").set(patch, { merge: true });
}

// ── Photo externalization ────────────────────────────────────────────────

function parseDataUrl(dataUrl: string): { mime: string; buf: Buffer; ext: string } | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  try {
    return { mime, buf: Buffer.from(m[2], "base64"), ext };
  } catch {
    return null;
  }
}

async function uploadPhoto(uid: string, dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed || parsed.buf.length === 0 || parsed.buf.length > 2 * 1024 * 1024) return null;
  const token = randomUUID();
  const path = `profile-photos/${uid}/avatar-migrated.${parsed.ext}`;
  const bucket = getStorage(getAdminApp()).bucket(STORAGE_BUCKET);
  await bucket.file(path).save(parsed.buf, {
    contentType: parsed.mime,
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Move base64 photos off the given docs (mutating `photoUrl` in place to the
 * new URL). The profile doc is the source of truth: if it already holds a URL
 * the leaderboard copy is just realigned; if it holds base64 the image is
 * uploaded once and BOTH docs are rewritten. Bounded by PHOTO_BUDGET_MS.
 */
async function externalizePhotos(docs: LbDoc[]): Promise<{ migrated: number; pending: number; failed: number }> {
  const db = getAdminDb();
  const candidates = docs.filter((d) => typeof d.photoUrl === "string" && d.photoUrl.startsWith("data:"));
  const deadline = Date.now() + PHOTO_BUDGET_MS;
  let migrated = 0;
  let failed = 0;
  let cursor = 0;

  // One profile read + one upload + two writes is ~0.7 s serial; a few
  // workers in parallel clear the backlog in a run or two instead of hours.
  async function migrateOne(d: LbDoc): Promise<void> {
    try {
      const profRef = db.doc(`users/${d.userId}/profile/main`);
      const profSnap = await profRef.get();
      const profPhoto = profSnap.data()?.photoUrl as string | undefined;
      let url: string | null = null;
      if (typeof profPhoto === "string" && profPhoto.startsWith("data:")) {
        url = await uploadPhoto(d.userId, profPhoto);
        if (!url) {
          failed++;
          return;
        }
        await profRef.set({ photoUrl: url }, { merge: true });
      } else if (typeof profPhoto === "string" && profPhoto) {
        url = profPhoto; // profile already moved on; leaderboard copy was stale
      }
      await db.doc(`leaderboard/${d.userId}`).update({ photoUrl: url ?? FieldValue.delete() });
      if (url) d.photoUrl = url;
      else delete d.photoUrl;
      migrated++;
    } catch (err) {
      failed++;
      console.warn(`[leaderboard-compactor] photo migration failed for ${d.userId}:`, err);
    }
  }

  async function worker(): Promise<void> {
    for (;;) {
      if (Date.now() > deadline) return;
      const idx = cursor++;
      if (idx >= candidates.length) return;
      await migrateOne(candidates[idx]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(PHOTO_WORKERS, candidates.length) }, worker));
  // Everything not claimed by a worker is still pending (failed ones were
  // attempted and are not retried this run).
  const attempted = Math.min(cursor, candidates.length);
  return { migrated, pending: candidates.length - attempted, failed };
}

// ── Row packing / publishing ─────────────────────────────────────────────

function packShards(rows: CompactRow[]): string[] {
  const shards: string[] = [];
  let parts: string[] = [];
  let bytes = 1; // "["
  for (const row of rows) {
    const s = JSON.stringify(row);
    const len = Buffer.byteLength(s, "utf8") + 1;
    if (parts.length > 0 && bytes + len > SHARD_BYTES) {
      shards.push(`[${parts.join(",")}]`);
      parts = [];
      bytes = 1;
    }
    parts.push(s);
    bytes += len;
  }
  if (parts.length > 0 || shards.length === 0) shards.push(`[${parts.join(",")}]`);
  return shards;
}

async function publishTier(base: "_lb_auth" | "_lb_guest", rows: CompactRow[], updatedAt: string): Promise<number> {
  const db = getAdminDb();
  const col = db.collection("community");
  const prev = (await col.doc(base).get()).data() as Partial<CompactManifest> | undefined;
  const shards = packShards(rows);
  const batch = db.batch();
  shards.forEach((data, i) => {
    const shard: CompactShard = { v: COMPACT_FORMAT_VERSION, i, updatedAt, data };
    batch.set(col.doc(`${base}_${i}`), shard);
  });
  // Drop shards left over from a larger previous publish.
  for (let i = shards.length; i < (prev?.shards ?? 0); i++) batch.delete(col.doc(`${base}_${i}`));
  const manifest: CompactManifest = {
    v: COMPACT_FORMAT_VERSION,
    shards: shards.length,
    count: rows.length,
    fields: [...COMPACT_FIELDS],
    updatedAt,
    touchedAt: updatedAt,
  };
  batch.set(col.doc(base), manifest);
  await batch.commit();
  return shards.length;
}

function isGuestVisible(row: CompactRow): boolean {
  return row[IDX_PUBLIC] === true && row[IDX_HIDE_GUESTS] !== true;
}

async function publishRows(rows: CompactRow[]): Promise<{ updatedAt: string; authShards: number; guestShards: number; guestCount: number }> {
  const updatedAt = new Date().toISOString();
  const guestRows = rows.filter(isGuestVisible);
  const authShards = await publishTier("_lb_auth", rows, updatedAt);
  const guestShards = await publishTier("_lb_guest", guestRows, updatedAt);
  return { updatedAt, authShards, guestShards, guestCount: guestRows.length };
}

async function readPreviousRows(): Promise<Map<string, CompactRow> | null> {
  const db = getAdminDb();
  const col = db.collection("community");
  const man = (await col.doc("_lb_auth").get()).data() as Partial<CompactManifest> | undefined;
  if (!man || man.v !== COMPACT_FORMAT_VERSION || !man.shards) return null;
  const refs = Array.from({ length: man.shards }, (_, i) => col.doc(`_lb_auth_${i}`));
  const snaps = await db.getAll(...refs);
  const byUser = new Map<string, CompactRow>();
  for (const snap of snaps) {
    const shard = snap.data() as CompactShard | undefined;
    if (!shard || shard.updatedAt !== man.updatedAt) return null; // torn — rebuild fully
    const rows = JSON.parse(shard.data) as CompactRow[];
    for (const row of rows) byUser.set(String(row[IDX_USER]), row);
  }
  return byUser;
}

/** Mirror of sanitizeEntries' legacy backfill so a row never lacks the field
 *  the client would otherwise derive from heroBreakdownDetailed (absent in
 *  the compact row). */
function withHeroCompletion(d: LbDoc): LbDoc {
  if (d.heroCompletionPct !== undefined) return d;
  const total = Number(d.totalMatches || 0);
  const detailed = d.heroBreakdownDetailed as { matches: number }[] | undefined;
  const basic = d.heroBreakdown as { matches: number }[] | undefined;
  let pct = 0;
  if (detailed && detailed.length > 0 && total > 0) {
    pct = Math.round((detailed.reduce((s, h) => s + h.matches, 0) / total) * 100);
  } else if (basic && basic.length > 0 && total > 0) {
    pct = Math.round((basic.reduce((s, h) => s + h.matches, 0) / total) * 100);
  }
  return { ...d, heroCompletionPct: pct };
}

// ── Meta docs (logged-out home) ──────────────────────────────────────────

async function publishMeta(docs: LbDoc[], updatedAt: string): Promise<void> {
  const db = getAdminDb();
  const all = docs as unknown as LeaderboardEntry[];
  const guest = docs.filter((d) => d.isPublic === true && d.hideFromGuests !== true) as unknown as LeaderboardEntry[];
  const authMeta = computeMetaStats(all);
  const guestMeta = computeMetaStats(guest);
  const batch = db.batch();
  batch.set(db.collection("community").doc("_meta_home"), { v: 1, ...guestMeta, updatedAt });
  batch.set(db.collection("community").doc("_meta_home_auth"), { v: 1, ...authMeta, updatedAt });
  await batch.commit();
}

// ── Runs ─────────────────────────────────────────────────────────────────

async function runFull(): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  const db = getAdminDb();
  const snap = await db.collection("leaderboard").get();
  const docs: LbDoc[] = [];
  for (const d of snap.docs) {
    const data = d.data() as LbDoc;
    if (!data.userId || BLOCKED_USER_IDS.has(data.userId)) continue;
    docs.push(data);
  }

  const photos = await externalizePhotos(docs);
  const alreadyPublished = (await db.collection("community").doc("_lb_auth").get()).exists;
  if (photos.pending > 0 && !alreadyPublished) {
    // First-time migration still in progress: keep clients on the raw scan
    // until every photo is off the docs, then publish a complete snapshot.
    const result = { mode: "full", published: false, docs: docs.length, ...photos, ms: Date.now() - t0 };
    await saveState({ photosPending: photos.pending, lastRun: result });
    return result;
  }

  const rows = docs.map((d) => toCompactRow(withHeroCompletion(d)));
  const pub = await publishRows(rows);
  await publishMeta(docs, pub.updatedAt);
  const result = {
    mode: "full",
    published: true,
    docs: docs.length,
    ...pub,
    ...photos,
    ms: Date.now() - t0,
  };
  await saveState({
    lastFullAt: pub.updatedAt,
    lastIncrementalAt: pub.updatedAt,
    photosPending: photos.pending,
    lastRun: result,
  });
  return result;
}

async function runIncremental(sinceIso: string): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  const db = getAdminDb();
  const changedSnap = await db.collection("leaderboard").where("updatedAt", ">", sinceIso).get();
  const changed: LbDoc[] = [];
  for (const d of changedSnap.docs) {
    const data = d.data() as LbDoc;
    if (!data.userId || BLOCKED_USER_IDS.has(data.userId)) continue;
    changed.push(data);
  }
  const now = new Date().toISOString();
  if (changed.length === 0) {
    // Nothing to republish, but let clients know the snapshot is still being
    // maintained (their staleness check reads touchedAt).
    const col = db.collection("community");
    const batch = db.batch();
    for (const base of ["_lb_auth", "_lb_guest"]) {
      batch.set(col.doc(base), { touchedAt: now }, { merge: true });
    }
    await batch.commit();
    const result = { mode: "incremental", changed: 0, ms: Date.now() - t0 };
    await saveState({ lastIncrementalAt: now, lastRun: result });
    return result;
  }

  const previous = await readPreviousRows();
  if (!previous) return runFull();

  const photos = await externalizePhotos(changed);
  for (const d of changed) previous.set(d.userId, toCompactRow(withHeroCompletion(d)));
  const pub = await publishRows([...previous.values()]);
  const result = { mode: "incremental", changed: changed.length, rows: previous.size, ...pub, ...photos, ms: Date.now() - t0 };
  await saveState({ lastIncrementalAt: pub.updatedAt, lastRun: result });
  return result;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const token = url.searchParams.get("token");
  const requiredToken = process.env.AGGREGATOR_TOKEN;
  if (mode && requiredToken && token !== requiredToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const state = await getState();
    const lastFull = state.lastFullAt ? Date.parse(state.lastFullAt) : 0;
    const staleFull = !lastFull || Date.now() - lastFull > FULL_INTERVAL_MS;
    const result =
      mode === "full" || staleFull || !state.lastIncrementalAt
        ? await runFull()
        : await runIncremental(state.lastIncrementalAt);
    console.log("[leaderboard-compactor] Done:", JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[leaderboard-compactor] Fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

// Every 30 minutes, offset from the store aggregator's :00/:30.
export const config: Config = {
  schedule: "10,40 * * * *",
};
