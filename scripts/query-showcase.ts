/**
 * Live showcase: 4 query "kinds" against the real graph.
 *   node --env-file=.env --import tsx scripts/query-showcase.ts
 */
import { runCypher, closeDriver } from "../src/lib/kg/neo4j-client";
import { hybridSimilar } from "../src/lib/kg/vector-search";

function n(v: unknown) {
  return typeof v === "bigint" ? Number(v) : v;
}
function rows(label: string, why: string, data: Record<string, unknown>[]) {
  console.log(`\n${"═".repeat(70)}\n${label}\n  (why it's hard without a graph: ${why})\n${"─".repeat(70)}`);
  for (const r of data)
    console.log(
      "  " +
        Object.entries(r)
          .map(([k, v]) => `${k}=${n((v as { toNumber?: () => number })?.toNumber?.() ?? v)}`)
          .join("  "),
    );
}

async function main() {
  // 1. COUNTER-META — 2-hop traversal: who beats the heroes that beat Verdance?
  const counter = await runCypher<Record<string, unknown>>(
    `MATCH (v:Hero {name:'Verdance, Thorn of the Rose'})-[m1:MATCHUP_WITH]-(threat:Hero)
     WHERE threat.name <> 'Unknown'
       AND (CASE WHEN m1.hero1 = v.name THEN m1.hero1Wins ELSE m1.hero2Wins END)
           < (CASE WHEN m1.hero1 = v.name THEN m1.hero2Wins ELSE m1.hero1Wins END)
     MATCH (threat)-[m2:MATCHUP_WITH]-(answer:Hero)
     WHERE answer.name <> 'Unknown' AND answer.name <> v.name
       AND (CASE WHEN m2.hero1 = answer.name THEN m2.hero1Wins ELSE m2.hero2Wins END)
           > (CASE WHEN m2.hero1 = answer.name THEN m2.hero2Wins ELSE m2.hero1Wins END)
       AND m2.total >= 100
     RETURN answer.name AS answersThatBeatVerdancesThreats,
            count(DISTINCT threat) AS threatsCovered
     ORDER BY threatsCovered DESC LIMIT 5`,
  );
  rows(
    "1. COUNTER-META: heroes that beat the heroes that beat Verdance",
    "two JOINs through a self-referential matchup table + win comparison per edge",
    counter,
  );

  // 2. HYBRID — vector similarity + graph filter, one query
  const seed = await runCypher<{ id: string; name: string }>(
    `MATCH (p:Player {username:'mathonical'}) RETURN p.id AS id, p.displayName AS name LIMIT 1`,
  );
  const sim = await hybridSimilar(seed[0].id as string, { minMatches: 100 }, 5);
  rows(
    `2. HYBRID: playstyle-similar to ${seed[0].name}, AND >100 matches`,
    "vector ANN search + a relational predicate resolved together, no client-side join",
    sim.map((s) => ({ player: s.displayName, hero: s.topHero, winRate: Math.round(s.winRate), matches: s.totalMatches, sim: s.score.toFixed(3) })),
  );

  // 3. CONTENT <-> ENTITY — articles linked to heroes in the same graph
  const content = await runCypher<Record<string, unknown>>(
    `MATCH (a:Article)-[:MENTIONS_HERO]->(h:Hero)
     RETURN a.title AS article, collect(h.name) AS heroesMentioned`,
  );
  rows(
    "3. CONTENT <-> ENTITY: which heroes each generated article references",
    "content and domain entities are usually different systems; here they're one graph",
    content,
  );

  // 4. GRAPH CENTRALITY — "bridge" heroes facing the widest variety of opponents
  const central = await runCypher<Record<string, unknown>>(
    `MATCH (h:Hero)-[m:MATCHUP_WITH]-(o:Hero)
     WHERE h.name <> 'Unknown' AND o.name <> 'Unknown' AND m.total >= 30
     RETURN h.name AS hero, count(DISTINCT o) AS distinctOpponents
     ORDER BY distinctOpponents DESC LIMIT 6`,
  );
  rows(
    "4. CENTRALITY: most 'connected' heroes (face the widest field)",
    "degree over a graph — trivial here, a recursive mess in SQL",
    central,
  );
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
