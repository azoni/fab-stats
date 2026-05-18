/**
 * Demo Cypher queries against the populated KG.
 * Shows queries that are natural in a graph DB but awkward in Firestore.
 *
 *   node --env-file=.env scripts/kg-demo-queries.mjs
 */
import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
);
const db = process.env.NEO4J_DATABASE;
const session = db ? driver.session({ database: db }) : driver.session();

function n(v) {
  return neo4j.isInt(v) ? v.toNumber() : v;
}

async function q(title, cypher, params = {}) {
  console.log(`\n── ${title} ──`);
  console.log(`   ${cypher.trim().replace(/\s+/g, " ")}`);
  const res = await session.run(cypher, params);
  if (res.records.length === 0) {
    console.log("   (no rows)");
    return;
  }
  for (const rec of res.records) {
    const obj = rec.toObject();
    const pretty = Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, n(v)]),
    );
    console.log("   " + JSON.stringify(pretty));
  }
}

try {
  // Exclude the "Unknown" sentinel hero (players with too few / unparseable matches).
  const REAL = `WHERE h.name <> 'Unknown'`;

  // 1. Most-played heroes (by how many players run them as their top hero)
  await q(
    "Top 8 real heroes by player count",
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     ${REAL}
     RETURN h.name AS hero, count(*) AS players
     ORDER BY players DESC LIMIT 8`,
  );

  // 2. A single hero's matchup spread — pick the most-played REAL hero dynamically
  await q(
    "Matchup spread for the #1 most-played hero",
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     WHERE h.name <> 'Unknown'
     WITH h AS top, count(*) AS pc ORDER BY pc DESC LIMIT 1
     MATCH (top)-[m:MATCHUP_WITH]-(opp:Hero)
     RETURN top.name AS hero, opp.name AS opponent,
            m.total AS games, m.draws AS draws
     ORDER BY games DESC LIMIT 8`,
  );

  // 3. Two-hop traversal — the kind of query a graph DB makes trivial.
  await q(
    "Best-win-rate pilots of the most popular hero (min 20 matches)",
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     WHERE h.name <> 'Unknown'
     WITH h AS top, count(*) AS pc ORDER BY pc DESC LIMIT 1
     MATCH (p:Player)-[:USED_HERO]->(top)
     WHERE p.totalMatches >= 20
     RETURN p.displayName AS player, p.winRate AS winRate,
            p.totalMatches AS matches, top.name AS hero
     ORDER BY p.winRate DESC LIMIT 5`,
  );

  // 4. Team graph — members of the largest team
  await q(
    "Largest team and its member count",
    `MATCH (p:Player)-[:MEMBER_OF_TEAM]->(t:Team)
     RETURN t.name AS team, count(p) AS members
     ORDER BY members DESC LIMIT 5`,
  );

  // 5. Multi-hop graph query that is genuinely awkward in Firestore:
  //    "For the most-played hero, which opponents does it face most, and how
  //     many DIFFERENT players pilot those opponent heroes?" — joins the
  //     matchup graph to the player graph in one traversal.
  await q(
    "Top hero's most-faced opponents + how many players pilot them",
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     WHERE h.name <> 'Unknown'
     WITH h AS top, count(*) AS pc ORDER BY pc DESC LIMIT 1
     MATCH (top)-[m:MATCHUP_WITH]-(opp:Hero)
     OPTIONAL MATCH (pilot:Player)-[:USED_HERO]->(opp)
     RETURN top.name AS hero, opp.name AS opponent,
            m.total AS games, count(DISTINCT pilot) AS oppPilots
     ORDER BY games DESC LIMIT 6`,
  );

  console.log("\n✓ Demo queries complete.");
} catch (err) {
  console.error("✗ Query failed:", err);
  process.exitCode = 1;
} finally {
  await session.close();
  await driver.close();
}
