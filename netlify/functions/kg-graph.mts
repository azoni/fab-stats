/**
 * Graph data for the KG visualizer.
 *
 *   GET /api/kg-graph?view=matchups   (default) — hero matchup network
 *   GET /api/kg-graph?view=pages                  — internal-link :Page graph
 *
 * Returns force-graph-ready { nodes, links }. Bounded so the browser doesn't
 * choke (top heroes by play count; their inter-edges only).
 */
import type { Context } from "@netlify/functions";
import { runCypher, closeDriver, int } from "../../src/lib/kg/neo4j-client.ts";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=900",
  "Access-Control-Allow-Origin": "*",
};

interface GraphNode {
  id: string;
  label: string;
  group: string;
  val: number; // node size
}
interface GraphLink {
  source: string;
  target: string;
  value: number; // edge weight
}

async function matchupGraph(topN: number): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  // Top heroes by how many players main them (excludes the "Unknown" sentinel).
  const heroRows = await runCypher<{ hero: string; players: number }>(
    `MATCH (:Player)-[:USED_HERO]->(h:Hero)
     WHERE h.name <> 'Unknown'
     RETURN h.name AS hero, count(*) AS players
     ORDER BY players DESC LIMIT $topN`,
    { topN: int(topN) },
  );
  const heroes = new Set(heroRows.map((r) => r.hero));
  const nodes: GraphNode[] = heroRows.map((r) => ({
    id: r.hero,
    label: r.hero,
    group: "hero",
    val: Math.max(2, Math.sqrt(Number(r.players))),
  }));

  // Edges only between heroes that are both in the top set.
  const edgeRows = await runCypher<{ a: string; b: string; games: number }>(
    `MATCH (a:Hero)-[m:MATCHUP_WITH]->(b:Hero)
     WHERE a.name IN $names AND b.name IN $names AND m.total >= 50
     RETURN a.name AS a, b.name AS b, m.total AS games
     ORDER BY games DESC LIMIT 400`,
    { names: [...heroes] },
  );
  const links: GraphLink[] = edgeRows.map((r) => ({
    source: r.a,
    target: r.b,
    value: Number(r.games),
  }));
  return { nodes, links };
}

async function pageGraph(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const pageRows = await runCypher<{
    url: string; path: string; status: number; inbound: number;
  }>(
    `MATCH (p:Page)
     OPTIONAL MATCH ( )-[r:LINKS_TO]->(p)
     RETURN p.url AS url, p.path AS path, p.status AS status, count(r) AS inbound`,
  );
  const nodes: GraphNode[] = pageRows.map((r) => ({
    id: r.url,
    label: r.path,
    group: Number(r.status) >= 400 ? "broken" : "page",
    val: Math.max(2, Math.sqrt(Number(r.inbound) + 1)),
  }));
  const linkRows = await runCypher<{ a: string; b: string }>(
    `MATCH (a:Page)-[:LINKS_TO]->(b:Page) RETURN a.url AS a, b.url AS b`,
  );
  const links: GraphLink[] = linkRows.map((r) => ({
    source: r.a,
    target: r.b,
    value: 1,
  }));
  return { nodes, links };
}

const handler = async (req: Request, _ctx: Context): Promise<Response> => {
  void _ctx;
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "matchups";
  const topN = Math.min(
    Math.max(parseInt(url.searchParams.get("topN") ?? "50", 10) || 50, 5),
    120,
  );
  try {
    const data =
      view === "pages" ? await pageGraph() : await matchupGraph(topN);
    return new Response(JSON.stringify({ view, ...data }), {
      status: 200,
      headers: HEADERS,
    });
  } catch (err) {
    console.error("[kg-graph] failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...HEADERS },
    });
  } finally {
    await closeDriver();
  }
};

export default handler;
