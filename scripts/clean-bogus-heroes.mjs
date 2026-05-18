/**
 * One-time cleanup: remove bogus Hero nodes minted from junk article
 * heroTags (e.g. "fabstats", "guide").
 *
 * A node is removed only if BOTH:
 *   1. orphaned — no inbound USED_HERO and no MATCHUP_WITH (no real play), AND
 *   2. its name is NOT a recognized hero in @flesh-and-blood/cards.
 *
 * This deliberately KEEPS real-but-inactive heroes (e.g. "Victor Goldmane,
 * Match Fixer" — a real hero with no logged matches yet). Only true non-hero
 * junk is deleted.
 *
 *   node --env-file=.env scripts/clean-bogus-heroes.mjs          (dry run)
 *   node --env-file=.env scripts/clean-bogus-heroes.mjs --delete (delete junk)
 */
import neo4j from "neo4j-driver";
import { cards as fabCards } from "@flesh-and-blood/cards";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
);
const DB = process.env.NEO4J_DATABASE;
const session = () => (DB ? driver.session({ database: DB }) : driver.session());
const doDelete = process.argv.includes("--delete");

const num = (v) => (neo4j.isInt(v) ? v.toNumber() : v);
async function run(cypher, params = {}) {
  const s = session();
  try {
    return (await s.run(cypher, params)).records.map((r) => r.toObject());
  } finally {
    await s.close();
  }
}

// Canonical hero names + their pre-comma prefixes ("Victor Goldmane" for
// "Victor Goldmane, Match Fixer"), so full-name nodes still validate.
const heroNames = new Set();
for (const c of fabCards) {
  if (Array.isArray(c.types) && c.types.includes("Hero")) {
    heroNames.add(c.name);
    heroNames.add(c.name.split(",")[0].trim());
  }
}
const isRealHero = (name) =>
  heroNames.has(name) || heroNames.has(String(name).split(",")[0].trim());

try {
  const total = num((await run(`MATCH (h:Hero) RETURN count(h) AS c`))[0].c);

  const orphans = await run(
    `MATCH (h:Hero)
     WHERE NOT ( ()-[:USED_HERO]->(h) ) AND NOT ( (h)-[:MATCHUP_WITH]-() )
     OPTIONAL MATCH (a:Article)-[:MENTIONS_HERO]->(h)
     RETURN h.name AS name, count(a) AS mentionedBy
     ORDER BY name`,
  );

  const junk = orphans.filter((o) => !isRealHero(o.name));
  const keptInactive = orphans.filter((o) => isRealHero(o.name));

  console.log(`Hero nodes total: ${total}`);
  console.log(`Orphans (no play): ${orphans.length}  →  junk: ${junk.length}, real-but-inactive (kept): ${keptInactive.length}`);
  for (const k of keptInactive) console.log(`  keep "${k.name}" (real hero, no logged matches)`);
  for (const j of junk) console.log(`  JUNK "${j.name}" (not a hero; MENTIONS_HERO from ${num(j.mentionedBy)} article)`);

  if (!doDelete) {
    console.log("\n(dry run — pass --delete to remove the JUNK only)");
  } else if (junk.length === 0) {
    console.log("\nNothing to delete.");
  } else {
    const names = junk.map((j) => j.name);
    const res = await run(
      `MATCH (h:Hero) WHERE h.name IN $names DETACH DELETE h RETURN count(h) AS deleted`,
      { names },
    );
    const after = num((await run(`MATCH (h:Hero) RETURN count(h) AS c`))[0].c);
    console.log(`\n✓ Deleted ${num(res[0].deleted)} junk Hero nodes (+ their MENTIONS_HERO edges). Hero nodes now: ${after}`);
  }
} catch (e) {
  console.error("FAILED:", e);
  process.exitCode = 1;
} finally {
  await driver.close();
}
