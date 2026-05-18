/**
 * Backfill playstyle embeddings into the Neo4j Player nodes.
 *
 * Run:
 *   node --env-file=.env --import tsx scripts/backfill-embeddings.ts
 *   node --env-file=.env --import tsx scripts/backfill-embeddings.ts --limit 50   (quick test)
 *
 * Steps:
 *   1. Create a native Neo4j vector index on Player.playstyleEmbedding (384-dim, cosine)
 *   2. Read leaderboard from Firestore
 *   3. Build a "playstyle card" sentence per player, embed it (local MiniLM)
 *   4. SET p.playstyleCard (text, for debugging/explainability) + p.playstyleEmbedding (vector)
 */
import { execSync } from "node:child_process";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import neo4j from "neo4j-driver";
import { cards as fabCards } from "@flesh-and-blood/cards";
import {
  buildPlaystyleCard,
  embed,
  EMBEDDING_DIMS,
  type PlaystyleInput,
} from "../src/lib/kg/embeddings";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

// ── Firebase service account (from Netlify if not local) ──
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  const json = execSync("netlify env:get FIREBASE_SERVICE_ACCOUNT --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const parsed = JSON.parse(json);
  process.env.FIREBASE_SERVICE_ACCOUNT =
    parsed.FIREBASE_SERVICE_ACCOUNT ?? Object.values(parsed)[0];
  console.log("[backfill] ✓ Fetched FIREBASE_SERVICE_ACCOUNT from Netlify");
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)),
  });
}
const fdb = getFirestore();
fdb.settings({ ignoreUndefinedProperties: true });

// ── Neo4j ──
const driver = neo4j.driver(
  process.env.NEO4J_URI as string,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME as string,
    process.env.NEO4J_PASSWORD as string,
  ),
);
const NEO4J_DATABASE = process.env.NEO4J_DATABASE;
function session() {
  return NEO4J_DATABASE ? driver.session({ database: NEO4J_DATABASE }) : driver.session();
}

// ── Hero metadata map (short card name → classes/talents) ──
type HeroMeta = { classes: string[]; talents: string[] };
const heroMeta = new Map<string, HeroMeta>();
for (const c of fabCards as { name: string; types?: string[]; classes?: string[]; talents?: string[] }[]) {
  if (Array.isArray(c.types) && c.types.includes("Hero")) {
    heroMeta.set(c.name, { classes: c.classes ?? [], talents: c.talents ?? [] });
  }
}
function lookupHero(fullName?: string | null): HeroMeta | undefined {
  if (!fullName) return undefined;
  if (heroMeta.has(fullName)) return heroMeta.get(fullName);
  const prefix = fullName.split(",")[0].trim();
  if (heroMeta.has(prefix)) return heroMeta.get(prefix);
  const firstToken = fullName.split(" ")[0].trim();
  return heroMeta.get(firstToken);
}

async function ensureVectorIndex() {
  const s = session();
  try {
    await s.run(
      `CREATE VECTOR INDEX player_playstyle IF NOT EXISTS
       FOR (p:Player) ON (p.playstyleEmbedding)
       OPTIONS { indexConfig: {
         \`vector.dimensions\`: $dims,
         \`vector.similarity_function\`: 'cosine'
       } }`,
      { dims: neo4j.int(EMBEDDING_DIMS) },
    );
  } finally {
    await s.close();
  }
}

async function main() {
  console.log("[backfill] Creating vector index (if not exists)…");
  await ensureVectorIndex();
  console.log("[backfill] ✓ Vector index ready");

  console.log("[backfill] Loading leaderboard…");
  const snap = await fdb.collection("leaderboard").get();
  const docs = snap.docs.slice(0, LIMIT === Infinity ? snap.docs.length : LIMIT);
  console.log(`[backfill] ${docs.length} players to embed (model downloads on first run)…`);

  let done = 0;
  let firstCard = "";
  for (const doc of docs) {
    const d = doc.data();
    if (d.isPublic === false || d.hideFromSpotlight) continue;

    const hero = lookupHero(d.topHero);
    const input: PlaystyleInput = {
      displayName: d.displayName ?? d.username ?? doc.id,
      topHero: d.topHero ?? null,
      topHeroClasses: hero?.classes,
      topHeroTalents: hero?.talents,
      winRate: d.winRate ?? 0,
      totalMatches: d.totalMatches ?? 0,
      uniqueHeroes: d.uniqueHeroes ?? 0,
      heroBreakdown: (d.heroBreakdown ?? []).map(
        (h: { hero: string; matches: number; winRate: number }) => ({
          hero: h.hero,
          matches: h.matches,
          winRate: h.winRate,
        }),
      ),
      eventsPlayed: d.eventsPlayed ?? 0,
      totalTop8s: d.totalTop8s ?? 0,
      top8sByEventType: d.top8sByEventType ?? {},
      longestWinStreak: d.longestWinStreak ?? 0,
      uniqueVenues: d.uniqueVenues ?? 0,
      nemesis: d.nemesis,
    };

    const card = buildPlaystyleCard(input);
    if (!firstCard) firstCard = card;
    const vector = await embed(card);

    const s = session();
    try {
      // setNodeVectorProperty stores the vector in the index-friendly format.
      await s.run(
        `MATCH (p:Player {id: $id})
         SET p.playstyleCard = $card
         WITH p CALL db.create.setNodeVectorProperty(p, 'playstyleEmbedding', $vec)
         RETURN p.id`,
        { id: doc.id, card, vec: vector },
      );
    } finally {
      await s.close();
    }

    done++;
    if (done % 25 === 0) process.stdout.write(`  ${done}…`);
  }
  process.stdout.write("\n");

  console.log(`\n[backfill] ✓ Embedded ${done} players`);
  console.log(`\n[backfill] Sample playstyle card:\n  "${firstCard}"`);

  // Sanity: count how many Player nodes now carry an embedding.
  const s = session();
  try {
    const r = await s.run(
      `MATCH (p:Player) WHERE p.playstyleEmbedding IS NOT NULL RETURN count(p) AS c`,
    );
    console.log(`\n[backfill] Players with embeddings in graph: ${r.records[0].get("c")}`);
  } finally {
    await s.close();
  }
}

main()
  .catch((e) => {
    console.error("[backfill] ✗ FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => driver.close());
