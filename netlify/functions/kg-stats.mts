/**
 * KG overview stats for the /lab console landing page.
 *   GET /api/kg-stats
 *
 * One round-trip-ish summary of what's in the graph: node/edge counts by
 * type, embedding coverage, top heroes, biggest matchups.
 */
import type { Context } from "@netlify/functions";
import { runCypher, closeDriver } from "../../src/lib/kg/neo4j-client.ts";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=120, s-maxage=300",
  "Access-Control-Allow-Origin": "*",
};

const handler = async (_req: Request, _ctx: Context): Promise<Response> => {
  void _req;
  void _ctx;
  try {
    const nodeCounts = await runCypher<{ label: string; c: number }>(
      `CALL { MATCH (n) RETURN labels(n)[0] AS label, count(*) AS c }
       RETURN label, c ORDER BY c DESC`,
    );
    const edgeCounts = await runCypher<{ rel: string; c: number }>(
      `MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS c ORDER BY c DESC`,
    );
    const embedded = await runCypher<{ c: number }>(
      `MATCH (p:Player) WHERE p.playstyleEmbedding IS NOT NULL RETURN count(p) AS c`,
    );
    const topHeroes = await runCypher<{ hero: string; players: number }>(
      `MATCH (:Player)-[:USED_HERO]->(h:Hero)
       WHERE h.name <> 'Unknown'
       RETURN h.name AS hero, count(*) AS players
       ORDER BY players DESC LIMIT 8`,
    );
    const bigMatchups = await runCypher<{
      a: string; b: string; games: number;
    }>(
      `MATCH (a:Hero)-[m:MATCHUP_WITH]->(b:Hero)
       WHERE a.name <> 'Unknown' AND b.name <> 'Unknown'
       RETURN a.name AS a, b.name AS b, m.total AS games
       ORDER BY games DESC LIMIT 6`,
    );

    const num = (v: unknown) => Number(v);
    return new Response(
      JSON.stringify({
        nodes: nodeCounts.map((r) => ({ label: r.label, count: num(r.c) })),
        edges: edgeCounts.map((r) => ({ rel: r.rel, count: num(r.c) })),
        playersWithEmbeddings: num(embedded[0]?.c ?? 0),
        topHeroes: topHeroes.map((r) => ({
          hero: r.hero,
          players: num(r.players),
        })),
        bigMatchups: bigMatchups.map((r) => ({
          a: r.a,
          b: r.b,
          games: num(r.games),
        })),
      }),
      { status: 200, headers: HEADERS },
    );
  } catch (err) {
    console.error("[kg-stats] failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: HEADERS,
    });
  } finally {
    await closeDriver();
  }
};

export default handler;
