/**
 * Match recycle bin (soft delete + restore).
 *
 * The destructive "clear all matches" flows (import "Clear & Import", the import
 * page's "Clear All Matches" button, and Settings → "Clear All Matches") used to
 * hard-delete every match with no way back — a user wiped their whole history
 * while only meaning to add a pasted event. These flows now route through
 * `softClearAllMatches`, which copies each match into
 * `users/{uid}/deletedMatches/{matchId}` (with restore metadata) BEFORE deleting
 * the live copy, and `restoreDeletedMatches` brings a batch back and rebuilds the
 * derived data (leaderboard, feed placements, opponent links, H2H).
 *
 * Cleared matches are recoverable for RECYCLE_BIN_RETENTION_DAYS, then purged.
 *
 * Community-hero-matchups: softClearAllMatches decrements the shared `heroMatchups`
 * counters for the cleared matches (symmetric with per-match/per-event delete) and
 * tags each bin doc `communityDecremented: true`, so a restore re-increments exactly
 * that subset. Bin docs tagged `false` (e.g. a hypothetical delete path that never
 * decremented) are NOT re-incremented on restore — the logic below honours the flag.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { getMatchesByUserId, matchFingerprint } from "./firestore-storage";
import { updateLeaderboardEntry } from "./leaderboard";
import { linkMatchesWithOpponents } from "./match-linking";
import { computeH2HForUser } from "./h2h";
import { syncFeedEventsVisibility } from "./feed";
import { updateCommunityHeroMatchups, decrementCommunityHeroMatchups } from "./hero-matchups";
import type { MatchRecord, UserProfile } from "@/types";

export const RECYCLE_BIN_RETENTION_DAYS = 30;

/** Which destructive flow removed a match — drives restore's community-counter inverse. */
export type ClearOrigin = "clear-before-import" | "clear-all-import" | "clear-all-settings";

export interface DeletedMatchBatch {
  batchId: string;
  deletedAt: string;
  via: string;
  count: number;
}

/** Recycle-bin bookkeeping fields stripped back off a match when it's restored. */
const RESERVED_KEYS = new Set([
  "id",
  "originalId",
  "deletedAt",
  "deleteBatchId",
  "via",
  "communityDecremented",
]);

// Stay comfortably under Firestore's 500-op batch cap.
const BATCH_SIZE = 450;

function deletedMatchesCollection(userId: string) {
  return collection(db, "users", userId, "deletedMatches");
}
function matchesCollection(userId: string) {
  return collection(db, "users", userId, "matches");
}

async function commitInChunks<T>(items: T[], apply: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const item of items.slice(i, i + BATCH_SIZE)) apply(batch, item);
    await batch.commit();
  }
}

/**
 * Soft "clear all matches": copy every live match into the recycle bin with
 * restore metadata, THEN delete the live matches. The copy runs first and its
 * failure propagates BEFORE any delete, so a denied/failed backup never loses
 * data (worst case: nothing is cleared). Returns the batch id + count moved.
 */
export async function softClearAllMatches(
  userId: string,
  via: ClearOrigin,
): Promise<{ batchId: string; count: number }> {
  const snap = await getDocs(matchesCollection(userId));
  if (snap.empty) return { batchId: "", count: 0 };

  const batchId = new Date().toISOString();

  // 1) Back up to the recycle bin FIRST. If this throws, we never reach the delete.
  await commitInChunks(snap.docs, (batch, d) => {
    batch.set(doc(deletedMatchesCollection(userId), d.id), {
      ...d.data(),
      originalId: d.id,
      deletedAt: batchId,
      deleteBatchId: batchId,
      via,
      communityDecremented: true,
    });
  });

  // 2) Only now delete the live matches.
  await commitInChunks(snap.docs, (batch, d) => batch.delete(d.ref));

  // 3) Decrement the shared community hero-matchup counters for the cleared
  //    matches (symmetric with per-match/per-event delete). Best-effort — the
  //    docs are tagged communityDecremented:true so a restore re-increments them.
  const cleared = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchRecord);
  await decrementCommunityHeroMatchups(userId, cleared).catch(() => {});

  return { batchId, count: snap.docs.length };
}

/** Group the recycle bin into restorable batches, newest first. */
export async function listDeletedMatchBatches(userId: string): Promise<DeletedMatchBatch[]> {
  const snap = await getDocs(deletedMatchesCollection(userId));
  const byBatch = new Map<string, DeletedMatchBatch>();
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const batchId = typeof data.deleteBatchId === "string" ? data.deleteBatchId : "legacy";
    const deletedAt = typeof data.deletedAt === "string" ? data.deletedAt : batchId;
    const via = typeof data.via === "string" ? data.via : "";
    const existing = byBatch.get(batchId);
    if (existing) existing.count += 1;
    else byBatch.set(batchId, { batchId, deletedAt, via, count: 1 });
  }
  return [...byBatch.values()].sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}

/**
 * Restore soft-deleted matches (a single batch, or the whole bin if no batchId).
 * Skips a bin match only when a live match still covers it (e.g. it was re-imported
 * after the clear) — counted as a multiset so distinct matches sharing a lossy
 * fingerprint are never collapsed — so a restore neither duplicates nor loses a
 * match. Rebuilds derived data from the full post-restore match set.
 */
export async function restoreDeletedMatches(
  userId: string,
  profile: UserProfile | null,
  batchId?: string,
): Promise<{ restored: number; skipped: number }> {
  const snap = await getDocs(deletedMatchesCollection(userId));
  const docs = snap.docs.filter(
    (d) => !batchId || (d.data() as { deleteBatchId?: string }).deleteBatchId === batchId,
  );
  if (docs.length === 0) return { restored: 0, skipped: 0 };

  // Dedup against what's currently live so a re-import + restore can't double up.
  // matchFingerprint is lossy (it ignores hero/turn), so two DISTINCT matches can
  // share one — we must NOT collapse them. Track live fingerprints as a COUNT
  // (multiset): a bin doc is skipped only when an actual live match still "covers"
  // it (e.g. it was re-imported after the clear); each skip consumes one live slot.
  // Siblings that merely share a fingerprint are all restored under their own ids.
  const current = await getMatchesByUserId(userId);
  const liveFpCount = new Map<string, number>();
  for (const m of current) {
    const fp = matchFingerprint(m);
    liveFpCount.set(fp, (liveFpCount.get(fp) ?? 0) + 1);
  }

  const toRestore: { id: string; data: Record<string, unknown> }[] = [];
  const communityToReincrement: MatchRecord[] = [];
  let skipped = 0;

  for (const d of docs) {
    const raw = d.data() as Record<string, unknown>;
    const originalId = typeof raw.originalId === "string" ? raw.originalId : d.id;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!RESERVED_KEYS.has(k)) clean[k] = v;
    }
    const fp = matchFingerprint({
      date: clean.date as string,
      opponentName: clean.opponentName as string | undefined,
      notes: clean.notes as string | undefined,
      result: clean.result as string,
    });
    const covered = liveFpCount.get(fp) ?? 0;
    if (covered > 0) {
      // A distinct live match already represents this one — consume the slot, skip.
      liveFpCount.set(fp, covered - 1);
      skipped += 1;
      continue;
    }
    toRestore.push({ id: originalId, data: clean });
    if (raw.communityDecremented === true) {
      communityToReincrement.push({ id: originalId, ...clean } as MatchRecord);
    }
  }

  // 1) Write the matches back under their original ids.
  await commitInChunks(toRestore, (batch, r) => batch.set(doc(matchesCollection(userId), r.id), r.data));

  // 2) Consume the whole batch from the bin. Every doc was either written back
  //    above or skipped because a live match already covers it — both are safe to
  //    drop (no doc that failed to reach `matches` is deleted here).
  await commitInChunks(docs, (batch, d) => batch.delete(d.ref));

  // 3) Rebuild derived data from the full restored set. All best-effort — a
  //    recompute miss self-heals on the next import/app-load recompute.
  if (toRestore.length > 0) {
    const full = await getMatchesByUserId(userId);
    if (profile) {
      await updateLeaderboardEntry(profile, full).catch(() => {});
      await syncFeedEventsVisibility(profile, full).catch(() => {});
    }
    await linkMatchesWithOpponents(userId, full).catch(() => {});
    await computeH2HForUser(userId, full).catch(() => {});
    // Re-increment community counters only for restored matches whose delete
    // decremented them (communityDecremented:true). Matches skipped as already-live
    // are excluded — their live twin is still counted. increment(); fire once.
    if (communityToReincrement.length > 0) {
      await updateCommunityHeroMatchups(userId, communityToReincrement).catch(() => {});
    }
  }

  return { restored: toRestore.length, skipped };
}

/** Permanently drop recycle-bin entries older than the retention window. */
export async function purgeExpiredDeletedMatches(
  userId: string,
  retentionDays = RECYCLE_BIN_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const snap = await getDocs(query(deletedMatchesCollection(userId), where("deletedAt", "<", cutoff)));
  if (snap.empty) return 0;
  await commitInChunks(snap.docs, (batch, d) => batch.delete(d.ref));
  return snap.docs.length;
}
