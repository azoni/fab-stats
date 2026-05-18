/**
 * Run the KG sync from the command line.
 *
 * Usage:
 *   node --env-file=.env scripts/run-kg-sync.mjs
 *
 * Pulls FIREBASE_SERVICE_ACCOUNT from the linked Netlify site env (so we don't
 * have to store the service-account JSON in local .env). Reuses the same logic
 * as netlify/functions/kg-sync.mts but inlined here so we don't need tsx to
 * import .mts at runtime.
 */
import { execSync } from "node:child_process";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import neo4j from "neo4j-driver";

// ── Pull Firebase service account from Netlify if not already in env ──
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("[kg-sync] FIREBASE_SERVICE_ACCOUNT not in local env — fetching from Netlify…");
  try {
    const json = execSync("netlify env:get FIREBASE_SERVICE_ACCOUNT --json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    // Netlify CLI returns { "FIREBASE_SERVICE_ACCOUNT": "<value>" }
    const parsed = JSON.parse(json);
    const value = parsed.FIREBASE_SERVICE_ACCOUNT ?? parsed.value ?? Object.values(parsed)[0];
    if (!value) throw new Error("No value in CLI response");
    process.env.FIREBASE_SERVICE_ACCOUNT = value;
    console.log("[kg-sync] ✓ Fetched FIREBASE_SERVICE_ACCOUNT from Netlify");
  } catch (err) {
    console.error("[kg-sync] Could not fetch FIREBASE_SERVICE_ACCOUNT from Netlify:", err.message);
    console.error("[kg-sync] Either set it in .env or run from a netlify-linked directory.");
    process.exit(1);
  }
}

// ── Init Firebase Admin ──
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Init Neo4j ──
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE;
if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.error("[kg-sync] Missing NEO4J_URI/USERNAME/PASSWORD");
  process.exit(1);
}
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));

const SITE = "https://www.fabstats.net";
function entityUri(type, id) {
  switch (type) {
    case "Player":  return `${SITE}/player/${id}`;
    case "Hero":    return `${SITE}/hero/${encodeURIComponent(id)}`;
    case "Match":   return `${SITE}/match/${id}`;
    case "Event":   return `${SITE}/event/${id}`;
    case "Venue":   return `${SITE}/venue/${encodeURIComponent(id)}`;
    case "Team":    return `${SITE}/team/${encodeURIComponent(id)}`;
    case "Article": return `${SITE}/articles/${id}`;
    default:        return `${SITE}/${type.toLowerCase()}/${encodeURIComponent(id)}`;
  }
}

function newSession() {
  return NEO4J_DATABASE ? driver.session({ database: NEO4J_DATABASE }) : driver.session();
}

async function runCypher(query, params = {}) {
  const session = newSession();
  try {
    const result = await session.run(query, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}

async function upsertNode(type, id, properties = {}) {
  const uri = entityUri(type, id);
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined),
  );
  await runCypher(
    `MERGE (n:${type} {id: $id}) SET n.uri = $uri, n += $props`,
    { id, uri, props: cleanProps },
  );
}

async function upsertRelation(fromType, fromId, relType, toType, toId, properties = {}) {
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined),
  );
  await runCypher(
    `MATCH (a:${fromType} {id: $fromId})
     MATCH (b:${toType} {id: $toId})
     MERGE (a)-[r:${relType}]->(b)
     SET r += $props`,
    { fromId, toId, props: cleanProps },
  );
}

async function ensureSchema() {
  const entities = ["Player", "Hero", "Match", "Event", "Venue", "Team", "Group", "Article", "Card"];
  for (const t of entities) {
    await runCypher(
      `CREATE CONSTRAINT ${t.toLowerCase()}_id IF NOT EXISTS FOR (n:${t}) REQUIRE n.id IS UNIQUE`,
    );
  }
}

// ── Sync logic (mirrors netlify/functions/kg-sync.mts) ──

async function syncPlayers() {
  const snap = await db.collection("leaderboard").get();
  const heroes = new Set();
  let count = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.isPublic === false || d.hideFromSpotlight) continue;
    await upsertNode("Player", doc.id, {
      username: d.username ?? "",
      displayName: d.displayName ?? "",
      photoUrl: d.photoUrl ?? null,
      totalMatches: d.totalMatches ?? 0,
      totalWins: d.totalWins ?? 0,
      winRate: d.winRate ?? 0,
      eloRating: d.eloRating ?? null,
      topHero: d.topHero ?? null,
      uniqueHeroes: d.uniqueHeroes ?? 0,
      teamId: d.teamId ?? null,
      teamName: d.teamName ?? null,
    });
    if (d.topHero) heroes.add(d.topHero);
    if (d.teamId && d.teamName) {
      await upsertNode("Team", d.teamId, { name: d.teamName });
      await upsertRelation("Player", doc.id, "MEMBER_OF_TEAM", "Team", d.teamId, {});
    }
    count++;
    if (count % 25 === 0) process.stdout.write(`  ${count}…`);
  }
  if (count >= 25) process.stdout.write("\n");
  return { count, heroes };
}

async function syncMatchups(seedHeroes) {
  // heroMatchups is keyed per MONTH. Aggregate across months per hero pair
  // (hero1 = alphabetically first) BEFORE writing — otherwise edges hold a
  // single month, not the true total. Persist hero1/hero2 names so queries
  // attribute wins by name, not position.
  const snap = await db.collection("heroMatchups").get();
  const heroSet = new Set(seedHeroes);
  const agg = new Map();
  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.hero1 || !d.hero2) continue;
    let hero1 = d.hero1;
    let hero2 = d.hero2;
    let h1 = d.hero1Wins ?? 0;
    let h2 = d.hero2Wins ?? 0;
    if (hero1 > hero2) {
      [hero1, hero2] = [hero2, hero1];
      [h1, h2] = [h2, h1];
    }
    heroSet.add(hero1);
    heroSet.add(hero2);
    const key = `${hero1} ${hero2}`;
    const cur = agg.get(key) ?? { hero1, hero2, h1: 0, h2: 0, draws: 0, total: 0 };
    cur.h1 += h1;
    cur.h2 += h2;
    cur.draws += d.draws ?? 0;
    cur.total += d.total ?? 0;
    agg.set(key, cur);
  }
  for (const hero of heroSet) {
    await upsertNode("Hero", hero, { name: hero });
  }
  let matchups = 0;
  for (const r of agg.values()) {
    if (r.total === 0) continue;
    await upsertRelation("Hero", r.hero1, "MATCHUP_WITH", "Hero", r.hero2, {
      hero1: r.hero1,
      hero2: r.hero2,
      hero1Wins: r.h1,
      hero2Wins: r.h2,
      draws: r.draws,
      total: r.total,
    });
    matchups++;
    if (matchups % 50 === 0) process.stdout.write(`  ${matchups}…`);
  }
  if (matchups >= 50) process.stdout.write("\n");
  return { matchups, heroes: heroSet.size };
}

async function syncTopHeroEdges() {
  const snap = await db.collection("leaderboard").get();
  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.topHero) continue;
    if (d.isPublic === false || d.hideFromSpotlight) continue;
    await upsertRelation("Player", doc.id, "USED_HERO", "Hero", d.topHero, {
      isTopHero: true,
      matches: d.topHeroMatches ?? 0,
    });
  }
}

async function syncArticles() {
  const snap = await db.collection("articles").where("status", "==", "published").get();
  let count = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    await upsertNode("Article", doc.id, {
      slug: d.slug ?? doc.id,
      title: d.title ?? "",
      excerpt: d.excerpt ?? "",
      authorUid: d.authorUid ?? "",
      publishedAt: d.publishedAt ?? d.createdAt ?? "",
      readingMinutes: d.readingMinutes ?? 0,
      viewCount: d.viewCount ?? 0,
    });
    if (d.authorUid) {
      try {
        await upsertRelation("Article", doc.id, "WRITTEN_BY", "Player", d.authorUid, {});
      } catch { /* author may not be a public Player; skip */ }
    }
    if (Array.isArray(d.heroTags)) {
      for (const hero of d.heroTags) {
        // No upsertNode here: heroTags can hold nav/slug junk ("fabstats",
        // "guide"). upsertRelation MATCHes (doesn't create) the Hero, so this
        // links only to real heroes from syncMatchups (runs first); junk drops.
        await upsertRelation("Article", doc.id, "MENTIONS_HERO", "Hero", hero, {});
      }
    }
    count++;
  }
  return count;
}

// ── Main ──

const started = Date.now();
console.log(`[kg-sync] Starting sync to ${NEO4J_URI}…`);
try {
  await ensureSchema();
  console.log("[kg-sync] ✓ Schema constraints ensured");

  console.log("[kg-sync] Syncing players…");
  const playerResult = await syncPlayers();
  console.log(`[kg-sync] ✓ ${playerResult.count} players`);

  console.log("[kg-sync] Syncing heroes + matchups…");
  const matchupResult = await syncMatchups(playerResult.heroes);
  console.log(`[kg-sync] ✓ ${matchupResult.heroes} heroes, ${matchupResult.matchups} matchup edges`);

  console.log("[kg-sync] Syncing top-hero edges…");
  await syncTopHeroEdges();
  console.log("[kg-sync] ✓ Top-hero edges synced");

  console.log("[kg-sync] Syncing published articles…");
  const articleCount = await syncArticles();
  console.log(`[kg-sync] ✓ ${articleCount} articles`);

  // Final summary query — verify what's actually in the graph
  const summary = await runCypher(
    `CALL { MATCH (n) RETURN labels(n)[0] AS label, count(*) AS c }
     RETURN label, c ORDER BY c DESC`,
  );
  console.log("\n[kg-sync] Graph contents:");
  for (const row of summary) {
    console.log(`  ${row.label.padEnd(12)} ${row.c.toString().padStart(6)}`);
  }
  const edges = await runCypher(
    `MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS c ORDER BY c DESC`,
  );
  console.log("\n[kg-sync] Relationship contents:");
  for (const row of edges) {
    console.log(`  ${row.rel.padEnd(20)} ${row.c.toString().padStart(6)}`);
  }

  console.log(`\n[kg-sync] ✓ Completed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} catch (err) {
  console.error("[kg-sync] ✗ FAILED:", err);
  process.exit(1);
} finally {
  await driver.close();
}
