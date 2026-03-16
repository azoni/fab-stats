/**
 * Server-side import pipeline for auto-synced GEM matches.
 * Uses Firebase Admin SDK to write matches to Firestore.
 *
 * Core responsibilities:
 * - Deduplicate against existing matches (same fingerprint logic as client)
 * - Batch-write new matches
 * - Register GEM ID mapping
 * - Set a "needsRecompute" flag so the client triggers leaderboard/linking on next visit
 *
 * Expensive operations (leaderboard, match linking, H2H, community matchups)
 * are deferred to the client side — triggered when the user next opens the app
 * and sees the needsRecompute flag.
 */
import { getAdminDb } from "../firebase-admin.ts";
import type { AutoSyncMatch } from "./gem-scraper.ts";

interface ImportResult {
  imported: number;
  total: number;
  skippedDuplicates: number;
}

/** Normalize round info so "Round P1" and "Playoff" match as duplicates */
function normalizeNotes(notes: string): string {
  const parts = notes.split(" | ");
  const eventName = parts[0]?.trim() || "";
  const round = parts[1]?.trim() || "";
  let normalizedRound = round;
  if (/^Round\s+P(\d+)$/i.test(round)) {
    const n = round.match(/P(\d+)/i)![1];
    normalizedRound = `P${n}`;
  } else if (/^Playoff$/i.test(round)) {
    normalizedRound = "P1";
  } else if (/^Top\s*8$/i.test(round)) {
    normalizedRound = "P1";
  } else if (/^(Quarter|Top\s*4)$/i.test(round)) {
    normalizedRound = "P2";
  } else if (/^Semi/i.test(round)) {
    normalizedRound = "P2";
  } else if (/^Finals?$/i.test(round)) {
    normalizedRound = "P3";
  }
  return `${eventName}|${normalizedRound}`;
}

/** Build a fingerprint to detect duplicate matches (mirrors client-side logic) */
function matchFingerprint(m: { date: string; opponentName?: string; notes?: string; result: string }): string {
  const normalizedNotes = m.notes ? normalizeNotes(m.notes) : "";
  return `${m.date}|${(m.opponentName || "").toLowerCase()}|${normalizedNotes}|${m.result}`;
}

/** Convert extension-format match into Firestore match document fields */
function toMatchDoc(m: AutoSyncMatch) {
  const roundLabel = m.roundLabel
    ? m.roundLabel
    : m.round > 0 ? `Round ${m.round}` : "";
  const notes = `${m.event} | ${roundLabel}`.trim();

  const doc: Record<string, unknown> = {
    date: m.date,
    heroPlayed: m.hero || "Unknown",
    opponentHero: "Unknown",
    opponentName: m.opponent,
    result: m.result,
    format: m.format || "Unknown",
    notes,
    source: "auto-sync",
  };

  if (m.opponentGemId) doc.opponentGemId = m.opponentGemId;
  if (m.venue) doc.venue = m.venue;
  if (m.eventType) doc.eventType = m.eventType;
  if (m.rated !== undefined) doc.rated = m.rated;
  if (m.gemEventId) doc.gemEventId = m.gemEventId;

  return doc;
}

/**
 * Import auto-synced matches for a user.
 * Deduplicates, batch-writes, registers GEM ID, and sets needsRecompute flag.
 */
export async function processServerImport(
  userId: string,
  matches: AutoSyncMatch[],
  userGemId: string
): Promise<ImportResult> {
  const db = getAdminDb();
  const matchesCol = db.collection("users").doc(userId).collection("matches");

  // Fetch existing matches for dedup
  const existingSnap = await matchesCol.get();
  const existingFingerprints = new Set<string>();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    existingFingerprints.add(
      matchFingerprint({
        date: data.date,
        opponentName: data.opponentName,
        notes: data.notes,
        result: data.result,
      })
    );
  });

  // Convert and filter duplicates
  const matchDocs = matches.map((m) => ({
    doc: toMatchDoc(m),
    match: m,
  }));

  const newMatches = matchDocs.filter(
    ({ doc }) =>
      !existingFingerprints.has(
        matchFingerprint({
          date: doc.date as string,
          opponentName: doc.opponentName as string,
          notes: doc.notes as string,
          result: doc.result as string,
        })
      )
  );

  if (newMatches.length === 0) {
    return { imported: 0, total: matches.length, skippedDuplicates: matches.length };
  }

  // Batch-write new matches (max 500 per batch)
  const BATCH_SIZE = 500;
  let imported = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < newMatches.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = newMatches.slice(i, i + BATCH_SIZE);

    for (const { doc: matchDoc } of chunk) {
      const docRef = matchesCol.doc();
      batch.set(docRef, { ...matchDoc, createdAt: now });
    }

    await batch.commit();
    imported += chunk.length;
  }

  // Register GEM ID mapping
  if (userGemId) {
    await db.collection("gemIds").doc(userGemId).set({ userId });
  }

  // Set needsRecompute flag on user profile so client triggers
  // leaderboard update, match linking, H2H, etc. on next visit
  const profileRef = db.collection("users").doc(userId).collection("profile").doc("main");
  await profileRef.update({
    "gemSyncStatus.lastSyncAt": now,
    "gemSyncStatus.lastStatus": "success",
    "gemSyncStatus.matchesImported": imported,
    needsRecompute: true,
  });

  return {
    imported,
    total: matches.length,
    skippedDuplicates: matches.length - newMatches.length,
  };
}
