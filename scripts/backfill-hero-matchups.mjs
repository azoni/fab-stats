/**
 * One-time backfill script for the heroMatchups collection.
 *
 * Reads every user's matches via Firebase Admin SDK, applies the same
 * dedup logic as the client-side updateCommunityHeroMatchups(), and
 * writes absolute counts (set, not increment) so it's safe to re-run
 * — it wipes the collection first, then rebuilds from scratch.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat path/to/service-account.json)" node scripts/backfill-hero-matchups.mjs
 *
 * Or if the env var is already set (e.g. in .env):
 *   node scripts/backfill-hero-matchups.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Init ──

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  process.exit(1);
}

const app = initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore(app);

// ── Helpers (mirroring src/lib/hero-matchups.ts) ──

function getMonth(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function getDocId(hero1, hero2, month) {
  const sorted = [hero1, hero2].sort();
  return `${sorted[0]}_${sorted[1]}_${month}`;
}

// ── Step 1: Delete existing heroMatchups collection ──

async function clearCollection() {
  const col = db.collection("heroMatchups");
  const snap = await col.get();
  if (snap.empty) {
    console.log("heroMatchups collection is empty, nothing to clear.");
    return;
  }
  console.log(`Clearing ${snap.size} existing heroMatchups docs...`);
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % batchSize !== 0) {
    await batch.commit();
  }
  console.log(`Cleared ${count} docs.`);
}

// ── Step 2: Read all users' matches and aggregate ──

async function backfill() {
  // Accumulator: docId -> aggregated data
  const agg = new Map();

  // Get all user IDs
  const usersSnap = await db.collectionGroup("matches").get();
  // Actually, collectionGroup returns all match docs — but we need userId too.
  // Better: iterate users collection
  const userDocs = await db.collection("users").listDocuments();
  console.log(`Found ${userDocs.length} users. Reading matches...`);

  let totalLinked = 0;
  let usersWithMatches = 0;

  for (const userRef of userDocs) {
    const userId = userRef.id;
    const matchesSnap = await db.collection(`users/${userId}/matches`).get();
    if (matchesSnap.empty) continue;

    usersWithMatches++;
    const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter to linked matches (opponentHero set and not Unknown, not Bye)
    const linked = matches.filter(
      (m) =>
        m.opponentHero &&
        m.opponentHero !== "Unknown" &&
        m.result !== "bye",
    );

    if (linked.length === 0) continue;

    for (const m of linked) {
      const sorted = [m.heroPlayed, m.opponentHero].sort();
      const isHero1 = m.heroPlayed === sorted[0];

      // Dedup: only count from the side where heroPlayed is alphabetically first.
      // For mirror matches (same hero), only count if userId < opponentGemId.
      if (m.heroPlayed === m.opponentHero) {
        if (!m.opponentGemId || userId >= m.opponentGemId) continue;
      } else if (!isHero1) {
        continue;
      }

      const month = getMonth(m.date);
      const docId = getDocId(sorted[0], sorted[1], month);

      let group = agg.get(docId);
      if (!group) {
        group = {
          hero1: sorted[0],
          hero2: sorted[1],
          month,
          hero1Wins: 0,
          hero2Wins: 0,
          draws: 0,
          total: 0,
          byFormat: {},
        };
        agg.set(docId, group);
      }

      // Tally from hero1's perspective
      if (m.result === "win") group.hero1Wins++;
      else if (m.result === "loss") group.hero2Wins++;
      else if (m.result === "draw") group.draws++;
      group.total++;

      // Format breakdown
      const fmt = m.format || "Unknown";
      if (!group.byFormat[fmt]) {
        group.byFormat[fmt] = { hero1Wins: 0, hero2Wins: 0, draws: 0, total: 0 };
      }
      const fg = group.byFormat[fmt];
      if (m.result === "win") fg.hero1Wins++;
      else if (m.result === "loss") fg.hero2Wins++;
      else if (m.result === "draw") fg.draws++;
      fg.total++;

      totalLinked++;
    }

    if (usersWithMatches % 50 === 0) {
      console.log(`  Processed ${usersWithMatches} users, ${totalLinked} linked matches so far...`);
    }
  }

  console.log(`\nAggregation complete: ${usersWithMatches} users with matches, ${totalLinked} linked matches counted.`);
  console.log(`${agg.size} hero matchup docs to write.\n`);

  // ── Step 3: Write to Firestore ──

  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const [docId, g] of agg) {
    const ref = db.collection("heroMatchups").doc(docId);

    const data = {
      hero1: g.hero1,
      hero2: g.hero2,
      month: g.month,
      hero1Wins: g.hero1Wins,
      hero2Wins: g.hero2Wins,
      draws: g.draws,
      total: g.total,
      byFormat: g.byFormat,
      updatedAt: new Date().toISOString(),
    };

    batch.set(ref, data);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`  Written ${count} / ${agg.size} docs...`);
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`\nDone! Wrote ${count} heroMatchup docs to Firestore.`);
}

// ── Run ──

console.log("=== Hero Matchup Backfill ===\n");
await clearCollection();
console.log("");
await backfill();
