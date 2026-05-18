/**
 * Demonstrate the three retrieval modes against the live graph.
 *   node --env-file=.env --import tsx scripts/vector-search-demo.ts
 */
import { runCypher } from "../src/lib/kg/neo4j-client";
import {
  findSimilarPlayers,
  searchPlayersByVector,
  hybridSimilar,
} from "../src/lib/kg/vector-search";
import { embed } from "../src/lib/kg/embeddings";

function line(s = "") {
  console.log(s);
}

async function main() {
  // Seed: the best Verdance pilot from the Phase-1 queries.
  const seed = await runCypher<{ id: string; name: string }>(
    `MATCH (p:Player {username: 'mathonical'})
     RETURN p.id AS id, p.displayName AS name LIMIT 1`,
  );
  if (seed.length === 0) {
    line("Seed player not found — pick another.");
    return;
  }
  const seedId = seed[0].id;
  line(`Seed player: ${seed[0].name} (${seedId})`);

  // ── Mode 1: player → similar players (stored vector, no model) ──
  line("\n══ Mode 1: Players with the most similar playstyle ══");
  const similar = await findSimilarPlayers(seedId, 5);
  for (const s of similar) {
    line(`  ${s.score.toFixed(3)}  ${s.displayName}  —  ${s.topHero ?? "?"}, ${Math.round(s.winRate)}% over ${s.totalMatches}`);
  }
  line(`\n  Seed card:\n    "${(await runCypher<{ c: string }>(`MATCH (p:Player {id:$id}) RETURN p.playstyleCard AS c`, { id: seedId }))[0]?.c}"`);
  line(`  #1 match card:\n    "${similar[0]?.playstyleCard}"`);

  // ── Mode 2: free-text semantic search (embed query, then ANN) ──
  line("\n══ Mode 2: Free-text search ══");
  const queries = [
    "aggressive specialist who mains one hero and grinds ProQuest tournaments",
    "casual newer player still figuring out their hero pool",
    "well-traveled veteran with elite win rate and many Top 8s",
  ];
  for (const q of queries) {
    const qv = await embed(q);
    const res = await searchPlayersByVector(qv, 3);
    line(`\n  "${q}"`);
    for (const r of res) {
      line(`   ${r.score.toFixed(3)}  ${r.displayName} — ${r.topHero ?? "?"}, ${Math.round(r.winRate)}%/${r.totalMatches}`);
    }
  }

  // ── Mode 3: hybrid — ANN + graph filter in one query ──
  line("\n══ Mode 3: Hybrid (similar playstyle + min 100 matches) ══");
  const hybrid = await hybridSimilar(seedId, { minMatches: 100 }, 5);
  for (const h of hybrid) {
    line(`  ${h.score.toFixed(3)}  ${h.displayName} — ${h.topHero ?? "?"}, ${Math.round(h.winRate)}% over ${h.totalMatches}`);
  }

  line("\n✓ Demo complete.");
}

main().catch((e) => {
  console.error("✗ FAILED:", e);
  process.exitCode = 1;
});
