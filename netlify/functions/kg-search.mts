/**
 * Semantic player search endpoint.
 *
 *   GET /api/kg-search?similarTo={playerId}&k=10
 *   GET /api/kg-search?q={free text}&k=10
 *   GET /api/kg-search?similarTo={playerId}&minMatches=100&sameTeam=true   (hybrid)
 *
 * Mode is inferred:
 *   - `q` present                  → embed query (local MiniLM), ANN search
 *   - `similarTo` + any filter      → hybrid (ANN + graph predicates)
 *   - `similarTo` only             → pure player→players similarity
 *
 * Routing: see netlify.toml redirect mapping /api/kg-search to this function.
 */
import type { Context } from "@netlify/functions";
import {
  findSimilarPlayers,
  searchPlayersByVector,
  hybridSimilar,
} from "../../src/lib/kg/vector-search.ts";
import { embed } from "../../src/lib/kg/embeddings.ts";
import { closeDriver } from "../../src/lib/kg/neo4j-client.ts";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: HEADERS });
}

/**
 * The first text query on a cold function instance loads the ~90MB MiniLM
 * model, which can exceed Netlify's sync-function budget. Cap the embed at
 * EMBED_BUDGET_MS and return a fast, explicit "warming up — retry" instead of
 * holding the connection until the platform kills it (which surfaces as an
 * opaque 502). Subsequent requests reuse the warm singleton and are fast.
 */
const EMBED_BUDGET_MS = 20_000;

class EmbedTimeout extends Error {}

function embedWithBudget(text: string): Promise<number[]> {
  return Promise.race([
    embed(text),
    new Promise<number[]>((_, reject) =>
      setTimeout(() => reject(new EmbedTimeout()), EMBED_BUDGET_MS),
    ),
  ]);
}

const handler = async (req: Request, _ctx: Context): Promise<Response> => {
  void _ctx;
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const similarTo = url.searchParams.get("similarTo")?.trim();
  const k = Math.min(
    Math.max(parseInt(url.searchParams.get("k") ?? "10", 10) || 10, 1),
    25,
  );

  try {
    if (q) {
      const t0 = Date.now();
      let vec: number[];
      try {
        vec = await embedWithBudget(q);
      } catch (e) {
        if (e instanceof EmbedTimeout) {
          return json(
            {
              mode: "text",
              warming: true,
              message:
                "Embedding model is still loading on this instance. Retry in a few seconds.",
            },
            503,
          );
        }
        throw e;
      }
      const embedMs = Date.now() - t0;
      const results = await searchPlayersByVector(vec, k);
      return json({ mode: "text", query: q, embedMs, count: results.length, results });
    }

    if (similarTo) {
      const minMatchesRaw = url.searchParams.get("minMatches");
      const sameTopHero = url.searchParams.get("sameTopHero") ?? undefined;
      const sameTeam = url.searchParams.get("sameTeam") === "true";
      const hasFilters =
        minMatchesRaw !== null || sameTopHero !== undefined || sameTeam;

      if (hasFilters) {
        const results = await hybridSimilar(
          similarTo,
          {
            minMatches: minMatchesRaw ? parseInt(minMatchesRaw, 10) : undefined,
            sameTopHero,
            sameTeam,
          },
          k,
        );
        return json({ mode: "hybrid", similarTo, count: results.length, results });
      }

      const results = await findSimilarPlayers(similarTo, k);
      return json({ mode: "similar", similarTo, count: results.length, results });
    }

    return json(
      { error: "Provide either ?q=<text> or ?similarTo=<playerId>" },
      400,
    );
  } catch (err) {
    console.error("[kg-search] failed:", err);
    return json({ error: "Internal error", detail: String(err) }, 500);
  } finally {
    await closeDriver();
  }
};

export default handler;
